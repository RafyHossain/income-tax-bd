const db = require("../database/query");

const IncomeExemptionRuleModel = {
  // Get all exemption rules with filters
  async getAllRules(filters = {}) {
    let sql = `
      SELECT
        id,
        tax_year,
        income_type,
        exemption_code,
        exemption_name,
        calculation_type,
        exemption_rate,
        max_exemption_amount,
        description,
        status,
        effective_from,
        effective_to,
        created_at,
        updated_at
      FROM income_exemption_rules
      WHERE 1 = 1
    `;
    const params = [];

    if (filters.tax_year) {
      sql += " AND tax_year = ?";
      params.push(filters.tax_year);
    }

    if (filters.income_type) {
      sql += " AND income_type = ?";
      params.push(filters.income_type);
    }

    if (filters.status) {
      sql += " AND status = ?";
      params.push(filters.status);
    }

    if (filters.search) {
      sql += " AND (exemption_code LIKE ? OR exemption_name LIKE ? OR description LIKE ?)";
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    sql += " ORDER BY tax_year DESC, income_type ASC, id ASC";

    return await db.query(sql, params);
  },

  // Get single rule by ID
  async getRuleById(id) {
    const sql = `
      SELECT
        id,
        tax_year,
        income_type,
        exemption_code,
        exemption_name,
        calculation_type,
        exemption_rate,
        max_exemption_amount,
        description,
        status,
        effective_from,
        effective_to,
        created_at,
        updated_at
      FROM income_exemption_rules
      WHERE id = ?
      LIMIT 1
    `;
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  },

  // Get active rules by tax year and optional income type
  async getActiveRules(taxYear, incomeType = null) {
    let sql = `
      SELECT
        id,
        tax_year,
        income_type,
        exemption_code,
        exemption_name,
        calculation_type,
        exemption_rate,
        max_exemption_amount,
        description,
        status,
        effective_from,
        effective_to
      FROM income_exemption_rules
      WHERE tax_year = ?
        AND status = 'ACTIVE'
    `;
    const params = [taxYear];

    if (incomeType) {
      sql += " AND income_type = ?";
      params.push(incomeType);
    }

    sql += " ORDER BY id ASC";
    return await db.query(sql, params);
  },

  // Create rule
  async createRule(data) {
    const sql = `
      INSERT INTO income_exemption_rules (
        tax_year,
        income_type,
        exemption_code,
        exemption_name,
        calculation_type,
        exemption_rate,
        max_exemption_amount,
        description,
        status,
        effective_from,
        effective_to
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.tax_year,
      data.income_type,
      data.exemption_code,
      data.exemption_name,
      data.calculation_type || "PERCENTAGE",
      data.exemption_rate !== undefined ? Number(data.exemption_rate) : 0,
      data.max_exemption_amount !== undefined && data.max_exemption_amount !== null && data.max_exemption_amount !== ""
        ? Number(data.max_exemption_amount)
        : null,
      data.description || null,
      data.status || "ACTIVE",
      data.effective_from,
      data.effective_to || null,
    ];
    return await db.query(sql, params);
  },

  // Update rule
  async updateRule(id, data) {
    const sql = `
      UPDATE income_exemption_rules
      SET
        income_type = COALESCE(?, income_type),
        exemption_name = COALESCE(?, exemption_name),
        calculation_type = COALESCE(?, calculation_type),
        exemption_rate = COALESCE(?, exemption_rate),
        max_exemption_amount = ?,
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        effective_from = COALESCE(?, effective_from),
        effective_to = ?
      WHERE id = ?
    `;
    const params = [
      data.income_type || null,
      data.exemption_name || null,
      data.calculation_type || null,
      data.exemption_rate !== undefined ? Number(data.exemption_rate) : null,
      data.max_exemption_amount !== undefined
        ? data.max_exemption_amount !== null && data.max_exemption_amount !== ""
          ? Number(data.max_exemption_amount)
          : null
        : null,
      data.description !== undefined ? data.description : null,
      data.status || null,
      data.effective_from || null,
      data.effective_to !== undefined ? (data.effective_to ? data.effective_to : null) : null,
      id,
    ];
    return await db.query(sql, params);
  },

  // Toggle status
  async toggleStatus(id, status) {
    const sql = `
      UPDATE income_exemption_rules
      SET status = ?
      WHERE id = ?
    `;
    return await db.query(sql, [status, id]);
  },

  // Delete rule
  async deleteRule(id) {
    const sql = "DELETE FROM income_exemption_rules WHERE id = ?";
    return await db.query(sql, [id]);
  },

  // Get available tax years
  async getAvailableTaxYears() {
    const sql = `
      SELECT DISTINCT tax_year FROM (
        SELECT tax_year FROM tax_years
        UNION
        SELECT tax_year FROM income_exemption_rules WHERE tax_year IS NOT NULL
      ) as all_years
      ORDER BY tax_year DESC
    `;
    const rows = await db.query(sql);
    return rows.map((r) => r.tax_year);
  },
};

module.exports = IncomeExemptionRuleModel;

