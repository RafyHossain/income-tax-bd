const db = require("../database/query");

const SalaryExemptionRuleModel = {
  // Get active salary exemption rule by tax year
  async getActiveRuleByTaxYear(taxYear) {
    const sql = `
      SELECT
        id,
        tax_year,
        calculation_type,
        exemption_percentage,
        max_exemption_amount,
        description,
        status,
        effective_from,
        effective_to,
        created_at,
        updated_at
      FROM salary_exemption_rules
      WHERE tax_year = ?
        AND status = 'ACTIVE'
      ORDER BY id DESC
      LIMIT 1
    `;

    const rows = await db.query(sql, [taxYear]);
    return rows[0] || null;
  },

  // Admin: get all rules with filters
  async getAllRules(filters = {}) {
    let sql = `
      SELECT
        id,
        tax_year,
        calculation_type,
        exemption_percentage,
        max_exemption_amount,
        description,
        status,
        effective_from,
        effective_to,
        created_at,
        updated_at
      FROM salary_exemption_rules
      WHERE 1 = 1
    `;

    const values = [];

    if (filters.tax_year) {
      sql += " AND tax_year = ?";
      values.push(filters.tax_year);
    }

    if (filters.calculation_type) {
      sql += " AND calculation_type = ?";
      values.push(filters.calculation_type);
    }

    if (filters.status) {
      sql += " AND status = ?";
      values.push(filters.status);
    }

    if (filters.search) {
      sql += " AND (tax_year LIKE ? OR description LIKE ?)";
      values.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    sql += " ORDER BY tax_year DESC, id DESC";

    return await db.query(sql, values);
  },

  // Admin: get rule by id
  async getRuleById(id) {
    const sql = `
      SELECT
        id,
        tax_year,
        calculation_type,
        exemption_percentage,
        max_exemption_amount,
        description,
        status,
        effective_from,
        effective_to,
        created_at,
        updated_at
      FROM salary_exemption_rules
      WHERE id = ?
      LIMIT 1
    `;

    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  },

  // Admin: create rule
  async createRule(data) {
    const sql = `
      INSERT INTO salary_exemption_rules (
        tax_year,
        calculation_type,
        exemption_percentage,
        max_exemption_amount,
        description,
        status,
        effective_from,
        effective_to
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.tax_year,
      data.calculation_type || "ONE_THIRD",
      data.exemption_percentage !== undefined ? data.exemption_percentage : 33.33,
      data.max_exemption_amount !== undefined ? data.max_exemption_amount : 500000.0,
      data.description || null,
      data.status || "ACTIVE",
      data.effective_from,
      data.effective_to || null,
    ];

    return await db.query(sql, values);
  },

  // Admin: update rule
  async updateRule(id, data) {
    const sql = `
      UPDATE salary_exemption_rules
      SET
        tax_year = ?,
        calculation_type = ?,
        exemption_percentage = ?,
        max_exemption_amount = ?,
        description = ?,
        status = ?,
        effective_from = ?,
        effective_to = ?
      WHERE id = ?
    `;

    const values = [
      data.tax_year,
      data.calculation_type || "ONE_THIRD",
      data.exemption_percentage !== undefined ? data.exemption_percentage : 33.33,
      data.max_exemption_amount !== undefined ? data.max_exemption_amount : 500000.0,
      data.description || null,
      data.status || "ACTIVE",
      data.effective_from,
      data.effective_to || null,
      id,
    ];

    return await db.query(sql, values);
  },

  // Admin: toggle status
  async toggleStatus(id, status) {
    const sql = `
      UPDATE salary_exemption_rules
      SET status = ?
      WHERE id = ?
    `;

    return await db.query(sql, [status, id]);
  },

  // Admin: delete rule
  async deleteRule(id) {
    const sql = `
      DELETE FROM salary_exemption_rules
      WHERE id = ?
    `;

    return await db.query(sql, [id]);
  },

  // Admin: get available tax years
  async getAvailableTaxYears() {
    const sql = `
      SELECT DISTINCT tax_year FROM (
        SELECT tax_year FROM tax_years
        UNION
        SELECT tax_year FROM salary_exemption_rules WHERE tax_year IS NOT NULL
      ) as all_years
      ORDER BY tax_year DESC
    `;

    const rows = await db.query(sql);

    return rows.map((r) => r.tax_year);
  },
};

module.exports = SalaryExemptionRuleModel;
