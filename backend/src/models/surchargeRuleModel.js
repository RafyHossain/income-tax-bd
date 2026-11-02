const db = require("../database/query");

const SurchargeRuleModel = {
  // get all active surcharge rules for tax year
  async findActiveRulesByTaxYear(taxYear) {
    const sql = `
      SELECT
        id,
        tax_year,
        rule_name,
        minimum_wealth,
        maximum_wealth,
        surcharge_rate,
        status,
        effective_from,
        effective_to,
        created_at,
        updated_at
      FROM surcharge_rules
      WHERE tax_year = ?
        AND status = 'ACTIVE'
      ORDER BY minimum_wealth ASC
    `;

    return await db.query(sql, [taxYear]);
  },

  // find applicable rule based on tax year and net wealth
  async findEffectiveRule(taxYear, netWealth = 0) {
    const amount = Number(netWealth || 0);

    const sql = `
      SELECT
        id,
        tax_year,
        rule_name,
        minimum_wealth,
        maximum_wealth,
        surcharge_rate,
        status,
        effective_from,
        effective_to
      FROM surcharge_rules
      WHERE tax_year = ?
        AND status = 'ACTIVE'
        AND ? >= minimum_wealth
        AND (? <= maximum_wealth OR maximum_wealth IS NULL)
      ORDER BY minimum_wealth DESC
      LIMIT 1
    `;

    const rows = await db.query(sql, [taxYear, amount, amount]);
    return rows[0] || null;
  },

  // get available tax years
  async getAvailableTaxYears() {
    const sql = `
      SELECT DISTINCT tax_year FROM (
        SELECT tax_year FROM tax_years
        UNION
        SELECT tax_year FROM surcharge_rules WHERE tax_year IS NOT NULL
      ) as all_years
      ORDER BY tax_year DESC
    `;
    const rows = await db.query(sql);
    return rows.map((r) => r.tax_year);
  },

  // get all rules with optional filters
  async getAllRules(filters = {}) {
    let sql = `
      SELECT *
      FROM surcharge_rules
      WHERE 1=1
    `;
    const params = [];

    if (filters.tax_year) {
      sql += ` AND tax_year = ?`;
      params.push(filters.tax_year);
    }

    if (filters.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }

    if (filters.search) {
      sql += ` AND rule_name LIKE ?`;
      params.push(`%${filters.search}%`);
    }

    sql += ` ORDER BY tax_year DESC, minimum_wealth ASC`;

    return await db.query(sql, params);
  },

  // get rule by id
  async getRuleById(id) {
    const sql = `
      SELECT *
      FROM surcharge_rules
      WHERE id = ?
      LIMIT 1
    `;

    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  },

  // create rule
  async createRule(data) {
    const sql = `
      INSERT INTO surcharge_rules (
        tax_year,
        rule_name,
        minimum_wealth,
        maximum_wealth,
        surcharge_rate,
        status,
        effective_from,
        effective_to
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.tax_year,
      data.rule_name,
      data.minimum_wealth || 0,
      data.maximum_wealth !== undefined && data.maximum_wealth !== "" ? data.maximum_wealth : null,
      data.surcharge_rate || 0,
      data.status || "ACTIVE",
      data.effective_from || new Date().toISOString().slice(0, 10),
      data.effective_to || null,
    ];

    return await db.query(sql, values);
  },

  // update rule
  async updateRule(id, data) {
    const sql = `
      UPDATE surcharge_rules
      SET
        tax_year = ?,
        rule_name = ?,
        minimum_wealth = ?,
        maximum_wealth = ?,
        surcharge_rate = ?,
        status = ?,
        effective_from = ?,
        effective_to = ?
      WHERE id = ?
    `;

    const values = [
      data.tax_year,
      data.rule_name,
      data.minimum_wealth || 0,
      data.maximum_wealth !== undefined && data.maximum_wealth !== "" ? data.maximum_wealth : null,
      data.surcharge_rate || 0,
      data.status || "ACTIVE",
      data.effective_from,
      data.effective_to || null,
      id,
    ];

    return await db.query(sql, values);
  },

  // toggle status
  async toggleStatus(id, status) {
    const sql = `
      UPDATE surcharge_rules
      SET status = ?
      WHERE id = ?
    `;
    return await db.query(sql, [status, id]);
  },

  // delete rule
  async deleteRule(id) {
    const sql = `
      DELETE FROM surcharge_rules
      WHERE id = ?
    `;

    return await db.query(sql, [id]);
  },
};

module.exports = SurchargeRuleModel;
