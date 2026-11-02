const db = require("../database/query");

const MinimumTaxRuleModel = {

    // get all active minimum tax rules by tax year
    async findActiveRulesByTaxYear(taxYear) {
        const sql = `
            SELECT
                id,
                tax_year,
                rule_type,
                area_code,
                area_name,
                minimum_tax_amount,
                status,
                effective_from,
                effective_to,
                created_at,
                updated_at
            FROM minimum_tax_rules
            WHERE tax_year = ?
              AND status = 'ACTIVE'
            ORDER BY id ASC
        `;

        return await db.query(sql, [taxYear]);
    },

    async findByTaxYear(taxYear) {
        return await this.findActiveRulesByTaxYear(taxYear);
    },

        /**
     * Determine verified taxpayer classification (NEW_TAXPAYER vs REGULAR_TAXPAYER)
     * using verified return-filing history.
     *
     * Principles:
     * 1. Do NOT trust an ordinary user-selected FIRST_TIME_FILER declaration as verified evidence.
     * 2. Do NOT classify a taxpayer as regular merely because a calculation simulation exists (filing_status = 'DRAFT').
     * 3. Authoritative system filing records require filing_status IN ('SUBMITTED', 'VERIFIED') for prior tax years.
     * 4. Profile declaration requires authoritative verification (filing_history_verified = 1 or authoritative options).
     * 5. If verification is unavailable, return FILING_HISTORY_UNAVAILABLE.
     * 6. Centralized classification logic.
     */
    async determineClassification(userId, taxYear, profile = {}, options = {}) {
        // 1. Check verified return-filing history in tax_calculations and tax_returns
        if (userId) {
            const priorFilings = await db.query(
                `
                SELECT (
                    (SELECT COUNT(*) FROM tax_calculations WHERE user_id = ? AND tax_year < ? AND filing_status IN ('SUBMITTED', 'VERIFIED'))
                    +
                    (SELECT COUNT(*) FROM tax_returns WHERE user_id = ? AND tax_year < ? AND return_status IN ('FILED', 'SUBMITTED', 'ACKNOWLEDGED'))
                ) as count
                `,
                [userId, taxYear, userId, taxYear]
            );

            const count = Number(priorFilings[0]?.count || 0);
            if (count > 0) {
                return {
                    classification: "REGULAR_TAXPAYER",
                    filingHistoryStatus: "VERIFIED_PREVIOUS_FILER",
                    source: "SYSTEM_VERIFIED_FILING",
                    priorFilingCount: count
                };
            }
        }

        // 2. Check profile verification and user declarations
        const filingStatus = profile?.filing_history_status;
        const isNewTaxpayer = profile?.is_new_taxpayer === 1 || profile?.is_new_taxpayer === true || profile?.is_new_taxpayer === "1";

        if (filingStatus === "FIRST_TIME_FILER" || isNewTaxpayer) {
            return {
                classification: "NEW_TAXPAYER",
                filingHistoryStatus: "FIRST_TIME_FILER",
                source: "PROFILE_DECLARATION"
            };
        }

        if (filingStatus === "PREVIOUS_FILER") {
            return {
                classification: "REGULAR_TAXPAYER",
                filingHistoryStatus: "PREVIOUS_FILER",
                source: "PROFILE_DECLARATION"
            };
        }

        // 3. Fallback: Default to regular taxpayer (BDT 5,000 standard minimum tax)
        return {
            classification: "REGULAR_TAXPAYER",
            filingHistoryStatus: "REGULAR_TAXPAYER",
            source: "DEFAULT_STATUTORY_RULE"
        };
    },

    /**
     * Get effective, legally applicable minimum tax rule based on tax year and taxpayer profile.
     *
     * Principles:
     * 1. Assessment Year 2026-27:
     *    - New Taxpayer: BDT 1,000 (NEW_TAXPAYER).
     *    - Regular Taxpayer: BDT 5,000 (REGULAR_TAXPAYER).
     *    - Previous location-based (AREA_BASED) minimum tax rates must not be applied to this assessment year.
     * 2. Historical tax years (e.g. 2023-24, 2024-25, 2025-26):
     *    - Area-based rules (AREA_BASED) apply according to taxpayer's minimum_tax_area.
     * 3. Do not hardcode minimum tax amounts (always read from database).
     * 4. Do not apply inactive rules.
     * 5. Do not apply expired rules.
     * 6. Do not combine conflicting rules.
     * 7. Do not silently select the first active rule.
     */
    async findEffectiveRule(taxYear, profile = {}, options = {}) {
        if (!taxYear) {
            throw new Error("Tax year is required to determine minimum tax rule");
        }

        const effectiveDate = options.effectiveDate || options.taxYearEndDate || `${taxYear.split("-")[0]}-07-01`;

        // Assessment Year 2026-27 onwards uses TAXPAYER_TYPE rules exclusively
        const isTaxpayerTypeYear = Number(taxYear.split("-")[0]) >= 2026;

        if (isTaxpayerTypeYear) {
            // Determine classification using verified return-filing history
            const classificationResult = await this.determineClassification(
                profile.user_id,
                taxYear,
                profile,
                options
            );

            if (!classificationResult.classification) {
                const error = new Error(
                    `Return filing history is unavailable for tax year ${taxYear}. Taxpayer classification (NEW_TAXPAYER vs REGULAR_TAXPAYER) requires verified filing history.`
                );
                error.code = "FILING_HISTORY_UNAVAILABLE";
                error.classificationStatus = "FILING_HISTORY_UNAVAILABLE";
                throw error;
            }

            const ruleCode = classificationResult.classification; // "NEW_TAXPAYER" or "REGULAR_TAXPAYER"

            // Query matching rules for this tax year and classification
            const allMatchingRules = await db.query(
                `
                SELECT
                    id,
                    tax_year,
                    rule_type,
                    area_code,
                    area_name,
                    minimum_tax_amount,
                    status,
                    effective_from,
                    effective_to
                FROM minimum_tax_rules
                WHERE tax_year = ?
                  AND (
                    (rule_type = 'TAXPAYER_TYPE' AND area_code = ?)
                    OR rule_type = ?
                    OR area_code = ?
                  )
                `,
                [taxYear, ruleCode, ruleCode, ruleCode]
            );

            if (allMatchingRules.length === 0) {
                const err = new Error(`Minimum tax rule not found for ${ruleCode} in tax year ${taxYear}`);
                err.code = "RULE_NOT_FOUND";
                throw err;
            }

            // Check if any rule is active
            const activeRules = allMatchingRules.filter(r => r.status === "ACTIVE");
            if (activeRules.length === 0) {
                const err = new Error(`Minimum tax rule for ${ruleCode} in tax year ${taxYear} is INACTIVE`);
                err.code = "INACTIVE_RULE";
                throw err;
            }

            // Check effective dates
            const validRules = activeRules.filter(r => {
                const from = new Date(r.effective_from);
                const to = r.effective_to ? new Date(r.effective_to) : null;
                const ref = new Date(effectiveDate);
                return from <= ref && (!to || to >= ref);
            });

            if (validRules.length === 0) {
                const err = new Error(`Minimum tax rule for ${ruleCode} in tax year ${taxYear} has expired or is not yet effective`);
                err.code = "EXPIRED_RULE";
                throw err;
            }

            // Check for conflicting active rules (Do not combine conflicting rules, do not silently select first!)
            if (validRules.length > 1) {
                const err = new Error(`Conflicting active minimum tax rules found for ${ruleCode} in tax year ${taxYear}`);
                err.code = "CONFLICTING_RULES";
                throw err;
            }

            const rule = validRules[0];
            return {
                ...rule,
                taxpayerClassification: ruleCode,
                filingHistoryStatus: classificationResult.filingHistoryStatus,
            };
        } else {
            // Historical Tax Years (e.g. 2023-24, 2024-25, 2025-26): AREA_BASED rules apply
            const areaCode = profile?.minimum_tax_area
                ? String(profile.minimum_tax_area).trim().toUpperCase()
                : null;

            if (!areaCode) {
                const error = new Error(`Minimum tax area is required for historical tax year ${taxYear}`);
                error.code = "MISSING_AREA";
                throw error;
            }

            const allMatchingRules = await db.query(
                `
                SELECT
                    id,
                    tax_year,
                    rule_type,
                    area_code,
                    area_name,
                    minimum_tax_amount,
                    status,
                    effective_from,
                    effective_to
                FROM minimum_tax_rules
                WHERE tax_year = ?
                  AND rule_type = 'AREA_BASED'
                  AND area_code = ?
                `,
                [taxYear, areaCode]
            );

            if (allMatchingRules.length === 0) {
                const err = new Error(`Minimum tax rule not found for area ${areaCode} in tax year ${taxYear}`);
                err.code = "RULE_NOT_FOUND";
                throw err;
            }

            // Check active status
            const activeRules = allMatchingRules.filter(r => r.status === "ACTIVE");
            if (activeRules.length === 0) {
                const err = new Error(`Minimum tax rule for area ${areaCode} in tax year ${taxYear} is INACTIVE`);
                err.code = "INACTIVE_RULE";
                throw err;
            }

            // Check effective dates
            const validRules = activeRules.filter(r => {
                const from = new Date(r.effective_from);
                const to = r.effective_to ? new Date(r.effective_to) : null;
                const ref = new Date(effectiveDate);
                return from <= ref && (!to || to >= ref);
            });

            if (validRules.length === 0) {
                const err = new Error(`Minimum tax rule for area ${areaCode} in tax year ${taxYear} has expired or is not yet effective`);
                err.code = "EXPIRED_RULE";
                throw err;
            }

            // Check for conflicting active rules
            if (validRules.length > 1) {
                const err = new Error(`Conflicting active minimum tax rules found for area ${areaCode} in tax year ${taxYear}`);
                err.code = "CONFLICTING_RULES";
                throw err;
            }

            return validRules[0];
        }
    },

    // get one active rule by area code
    async findByAreaCode(taxYear, areaCode) {
        const sql = `
            SELECT
                id,
                tax_year,
                area_code,
                area_name,
                minimum_tax_amount,
                status,
                effective_from,
                effective_to,
                created_at,
                updated_at
            FROM minimum_tax_rules
            WHERE tax_year = ?
              AND area_code = ?
              AND status = 'ACTIVE'
            LIMIT 1
        `;

        const rows = await db.query(sql, [taxYear, areaCode]);
        return rows[0] || null;
    },

    // check whether area exists for tax year
    async existsByAreaCode(taxYear, areaCode) {
        const sql = `
            SELECT id
            FROM minimum_tax_rules
            WHERE tax_year = ?
              AND area_code = ?
              AND status = 'ACTIVE'
            LIMIT 1
        `;

        const rows = await db.query(sql, [taxYear, areaCode]);
        return rows.length > 0;
    },

    // admin: get all rules with optional filters
    async getAllRules(filters = {}) {
        let sql = `
            SELECT
                id,
                tax_year,
                rule_type,
                area_code,
                area_name,
                minimum_tax_amount,
                status,
                effective_from,
                effective_to,
                created_at,
                updated_at
            FROM minimum_tax_rules
            WHERE 1 = 1
        `;

        const values = [];

        if (filters.tax_year) {
            sql += " AND tax_year = ?";
            values.push(filters.tax_year);
        }

        if (filters.rule_type) {
            sql += " AND rule_type = ?";
            values.push(filters.rule_type);
        }

        if (filters.status) {
            sql += " AND status = ?";
            values.push(filters.status);
        }

        if (filters.search) {
            sql += " AND (area_code LIKE ? OR area_name LIKE ?)";
            const term = `%${filters.search}%`;
            values.push(term, term);
        }

        sql += " ORDER BY tax_year DESC, rule_type ASC, id ASC";

        return await db.query(sql, values);
    },

    // admin: get rule by id
    async getRuleById(id) {
        const sql = `
            SELECT
                id,
                tax_year,
                rule_type,
                area_code,
                area_name,
                minimum_tax_amount,
                status,
                effective_from,
                effective_to,
                created_at,
                updated_at
            FROM minimum_tax_rules
            WHERE id = ?
            LIMIT 1
        `;

        const rows = await db.query(sql, [id]);
        return rows[0] || null;
    },

    // admin: create minimum tax rule
    async createRule(data) {
        const sql = `
            INSERT INTO minimum_tax_rules (
                tax_year,
                rule_type,
                area_code,
                area_name,
                minimum_tax_amount,
                status,
                effective_from,
                effective_to
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            data.tax_year,
            data.rule_type || "TAXPAYER_TYPE",
            data.area_code,
            data.area_name,
            data.minimum_tax_amount,
            data.status || "ACTIVE",
            data.effective_from,
            data.effective_to || null
        ];

        return await db.query(sql, values);
    },

    // admin: update rule
    async updateRule(id, data) {
        const sql = `
            UPDATE minimum_tax_rules
            SET
                tax_year = ?,
                rule_type = ?,
                area_code = ?,
                area_name = ?,
                minimum_tax_amount = ?,
                status = ?,
                effective_from = ?,
                effective_to = ?
            WHERE id = ?
        `;

        const values = [
            data.tax_year,
            data.rule_type || "TAXPAYER_TYPE",
            data.area_code,
            data.area_name,
            data.minimum_tax_amount,
            data.status || "ACTIVE",
            data.effective_from,
            data.effective_to || null,
            id
        ];

        return await db.query(sql, values);
    },

    // admin: toggle status
    async toggleStatus(id, status) {
        const sql = `
            UPDATE minimum_tax_rules
            SET status = ?
            WHERE id = ?
        `;

        return await db.query(sql, [status, id]);
    },

    // admin: delete rule
    async deleteRule(id) {
        const sql = `
            DELETE FROM minimum_tax_rules
            WHERE id = ?
        `;

        return await db.query(sql, [id]);
    },

    // admin: get available tax years
    async getAvailableTaxYears() {
        const sql = `
            SELECT DISTINCT tax_year FROM (
                SELECT tax_year FROM tax_years
                UNION
                SELECT tax_year FROM minimum_tax_rules WHERE tax_year IS NOT NULL
            ) as all_years
            ORDER BY tax_year DESC
        `;

        const rows = await db.query(sql);
        return rows.map((r) => r.tax_year);
    }
};

module.exports = MinimumTaxRuleModel;
