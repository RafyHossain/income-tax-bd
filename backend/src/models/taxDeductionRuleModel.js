const db = require("../database/query");

const TaxDeductionRuleModel = {

    // create deduction rule
    async createDeductionRule(data) {

        const sql = `
            INSERT INTO tax_deduction_rules (
                tax_year,
                deduction_code,
                deduction_name,
                description,
                income_type,
                calculation_type,
                deduction_rate,
                maximum_amount,
                status,
                effective_from,
                effective_to
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            data.tax_year,
            data.deduction_code,
            data.deduction_name,
            data.description ?? null,
            data.income_type ?? null,
            data.calculation_type ?? "ACTUAL",
            data.deduction_rate ?? 0,
            data.maximum_amount ?? null,
            data.status ?? "ACTIVE",
            data.effective_from,
            data.effective_to ?? null
        ];

        return await db.query(sql, values);
    },


    // get active rules by tax year
    async getActiveRulesByTaxYear(taxYear) {

        const sql = `
            SELECT
                id,
                tax_year,
                deduction_code,
                deduction_name,
                description,
                income_type,
                calculation_type,
                deduction_rate,
                maximum_amount,
                status,
                effective_from,
                effective_to,
                created_at,
                updated_at
            FROM tax_deduction_rules
            WHERE tax_year = ?
              AND status = 'ACTIVE'
            ORDER BY id ASC
        `;

        return await db.query(sql, [taxYear]);
    },


    // get one active rule by deduction code
    async getActiveRuleByCode(
        taxYear,
        deductionCode
    ) {

        const sql = `
            SELECT
                id,
                tax_year,
                deduction_code,
                deduction_name,
                description,
                income_type,
                calculation_type,
                deduction_rate,
                maximum_amount,
                status,
                effective_from,
                effective_to,
                created_at,
                updated_at
            FROM tax_deduction_rules
            WHERE tax_year = ?
              AND deduction_code = ?
              AND status = 'ACTIVE'
            ORDER BY id DESC
            LIMIT 1
        `;

        const rows = await db.query(sql, [
            taxYear,
            deductionCode
        ]);

        return rows[0] || null;
    },


    // get one deduction rule by id
    async getDeductionRuleById(id) {

        const sql = `
            SELECT
                id,
                tax_year,
                deduction_code,
                deduction_name,
                description,
                income_type,
                calculation_type,
                deduction_rate,
                maximum_amount,
                status,
                effective_from,
                effective_to,
                created_at,
                updated_at
            FROM tax_deduction_rules
            WHERE id = ?
            LIMIT 1
        `;

        return await db.query(sql, [id]);
    },


    // update deduction rule
    async updateDeductionRule(id, data) {

        const sql = `
            UPDATE tax_deduction_rules
            SET
                tax_year = ?,
                deduction_code = ?,
                deduction_name = ?,
                description = ?,
                income_type = ?,
                calculation_type = ?,
                deduction_rate = ?,
                maximum_amount = ?,
                effective_from = ?,
                effective_to = ?
            WHERE id = ?
        `;

        const values = [
            data.tax_year,
            data.deduction_code,
            data.deduction_name,
            data.description ?? null,
            data.income_type ?? null,
            data.calculation_type ?? "ACTUAL",
            data.deduction_rate ?? 0,
            data.maximum_amount ?? null,
            data.effective_from,
            data.effective_to ?? null,
            id
        ];

        return await db.query(sql, values);
    },


    // deactivate deduction rule
    async deactivateDeductionRule(id) {

        const sql = `
            UPDATE tax_deduction_rules
            SET status = 'INACTIVE'
            WHERE id = ?
        `;

        return await db.query(sql, [id]);
    },


    // activate deduction rule
    async activateDeductionRule(id) {

        const sql = `
            UPDATE tax_deduction_rules
            SET status = 'ACTIVE'
            WHERE id = ?
        `;

        return await db.query(sql, [id]);
    },


    // get all rules with optional filters (admin)
    async getAllDeductionRules(filters = {}) {

        let sql = `
            SELECT
                id,
                tax_year,
                deduction_code,
                deduction_name,
                description,
                income_type,
                calculation_type,
                deduction_rate,
                maximum_amount,
                status,
                effective_from,
                effective_to,
                created_at,
                updated_at
            FROM tax_deduction_rules
            WHERE 1 = 1
        `;

        const values = [];

        if (filters.tax_year) {
            sql += " AND tax_year = ?";
            values.push(filters.tax_year);
        }

        if (filters.status) {
            sql += " AND status = ?";
            values.push(filters.status);
        }

        if (filters.search) {
            sql += " AND (deduction_code LIKE ? OR deduction_name LIKE ?)";
            const term = `%${filters.search}%`;
            values.push(term, term);
        }

        sql += " ORDER BY id DESC";

        return await db.query(sql, values);
    },


    // get active rules except current rule
    async getActiveRulesByTaxYearExceptId(
        taxYear,
        id
    ) {

        const sql = `
            SELECT
                id,
                tax_year,
                deduction_code,
                deduction_name,
                description,
                income_type,
                calculation_type,
                deduction_rate,
                maximum_amount,
                status,
                effective_from,
                effective_to
            FROM tax_deduction_rules
            WHERE tax_year = ?
              AND status = 'ACTIVE'
              AND id <> ?
            ORDER BY id ASC
        `;

        return await db.query(sql, [
            taxYear,
            id
        ]);
    },


    // get rule by code and tax year
    async getRuleByCode(
        taxYear,
        deductionCode
    ) {

        const sql = `
            SELECT
                id,
                tax_year,
                deduction_code,
                deduction_name,
                description,
                income_type,
                calculation_type,
                deduction_rate,
                maximum_amount,
                status,
                effective_from,
                effective_to,
                created_at,
                updated_at
            FROM tax_deduction_rules
            WHERE tax_year = ?
              AND deduction_code = ?
            LIMIT 1
        `;

        const rows = await db.query(sql, [
            taxYear,
            deductionCode
        ]);

        return rows[0] || null;
    },

    // delete deduction rule
    async deleteDeductionRule(id) {
        const sql = 'DELETE FROM tax_deduction_rules WHERE id = ?';
        return await db.query(sql, [id]);
    },
    // get rule by id alias
    async getRuleById(id) {
        const rows = await this.getDeductionRuleById(id);
        return Array.isArray(rows) ? (rows[0] || null) : rows;
    },
};

module.exports = TaxDeductionRuleModel;
