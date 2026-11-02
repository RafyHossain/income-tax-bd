const { query } = require("../database/query");

const TaxRebateRuleModel = {

  async findActiveRulesByTaxYear(taxYear) {
    const sql = `
      SELECT
        id,
        tax_year,
        rule_code,
        rule_name,
        description,
        calculation_type,
        basis_type,
        rate,
        fixed_amount,
        status,
        effective_from,
        effective_to
      FROM tax_rebate_rules
      WHERE tax_year = ?
        AND status = 'ACTIVE'
        AND effective_from <= CURDATE()
        AND (
          effective_to IS NULL
          OR effective_to >= CURDATE()
        )
      ORDER BY id;
    `;

    return await query(sql, [taxYear]);
  },

  async findByRuleCode(taxYear, ruleCode) {
    const sql = `
      SELECT
        id,
        tax_year,
        rule_code,
        rule_name,
        description,
        calculation_type,
        basis_type,
        rate,
        fixed_amount,
        status,
        effective_from,
        effective_to
      FROM tax_rebate_rules
      WHERE tax_year = ?
        AND rule_code = ?
        AND status = 'ACTIVE'
        AND effective_from <= CURDATE()
        AND (
          effective_to IS NULL
          OR effective_to >= CURDATE()
        )
      LIMIT 1;
    `;

    const rows = await query(sql, [taxYear, ruleCode]);

    return rows[0] || null;
  },

  // admin: get all rebate rules with filters
  async getAllRules(filters = {}) {
    let sql = `
      SELECT
        id,
        tax_year,
        rule_code,
        rule_name,
        description,
        calculation_type,
        basis_type,
        rate,
        fixed_amount,
        status,
        effective_from,
        effective_to,
        created_at,
        updated_at
      FROM tax_rebate_rules
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
      sql += " AND (rule_code LIKE ? OR rule_name LIKE ?)";
      const term = `%${filters.search}%`;
      values.push(term, term);
    }

    sql += " ORDER BY tax_year DESC, id ASC";

    return await query(sql, values);
  },

  // admin: get rule by id
  async getRuleById(id) {
    const sql = `
      SELECT
        id,
        tax_year,
        rule_code,
        rule_name,
        description,
        calculation_type,
        basis_type,
        rate,
        fixed_amount,
        status,
        effective_from,
        effective_to,
        created_at,
        updated_at
      FROM tax_rebate_rules
      WHERE id = ?
      LIMIT 1
    `;

    const rows = await query(sql, [id]);
    return rows[0] || null;
  },

  // admin: create rebate rule
  async createRule(data) {
    const sql = `
      INSERT INTO tax_rebate_rules (
        tax_year,
        rule_code,
        rule_name,
        description,
        calculation_type,
        basis_type,
        rate,
        fixed_amount,
        status,
        effective_from,
        effective_to
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.tax_year,
      data.rule_code,
      data.rule_name,
      data.description || null,
      data.calculation_type,
      data.basis_type,
      data.rate !== undefined && data.rate !== "" ? data.rate : null,
      data.fixed_amount !== undefined && data.fixed_amount !== "" ? data.fixed_amount : null,
      data.status || "ACTIVE",
      data.effective_from,
      data.effective_to || null,
    ];

    return await query(sql, values);
  },

  // admin: update rebate rule
  async updateRule(id, data) {
    const sql = `
      UPDATE tax_rebate_rules
      SET
        tax_year = ?,
        rule_code = ?,
        rule_name = ?,
        description = ?,
        calculation_type = ?,
        basis_type = ?,
        rate = ?,
        fixed_amount = ?,
        status = ?,
        effective_from = ?,
        effective_to = ?
      WHERE id = ?
    `;

    const values = [
      data.tax_year,
      data.rule_code,
      data.rule_name,
      data.description || null,
      data.calculation_type,
      data.basis_type,
      data.rate !== undefined && data.rate !== "" ? data.rate : null,
      data.fixed_amount !== undefined && data.fixed_amount !== "" ? data.fixed_amount : null,
      data.status || "ACTIVE",
      data.effective_from,
      data.effective_to || null,
      id,
    ];

    return await query(sql, values);
  },

  // admin: toggle status
  async toggleStatus(id, status) {
    const sql = `
      UPDATE tax_rebate_rules
      SET status = ?
      WHERE id = ?
    `;

    return await query(sql, [status, id]);
  },

  // admin: delete rule
  async deleteRule(id) {
    const sql = `
      DELETE FROM tax_rebate_rules
      WHERE id = ?
    `;

    return await query(sql, [id]);
  },

  // admin: get available tax years
  async getAvailableTaxYears() {
    const sql = `
      SELECT DISTINCT tax_year FROM (
        SELECT tax_year FROM tax_years
        UNION
        SELECT tax_year FROM tax_rebate_rules WHERE tax_year IS NOT NULL
      ) as all_years
      ORDER BY tax_year DESC
    `;

    const rows = await query(sql);
    return rows.map((r) => r.tax_year);
  },
};

module.exports = TaxRebateRuleModel;