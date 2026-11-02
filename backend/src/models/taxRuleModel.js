const db = require("../database/query");

const TaxRuleModel = {
  // create tax rule

  async createTaxRule(data) {
    const sql = `
      INSERT INTO tax_rules (
        tax_year,
        minimum_income,
        maximum_income,
        tax_rate,
        fixed_amount,
        status,
        effective_from,
        effective_to
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.tax_year,
      data.minimum_income,
      data.maximum_income,
      data.tax_rate,
      data.fixed_amount,
      data.status,
      data.effective_from,
      data.effective_to,
    ];

    return await db.query(sql, values);
  },

  // get active rules by tax year
  // used by tax calculation

  async getActiveRulesByTaxYear(taxYear) {
    const sql = `
      SELECT
        id,
        tax_year,
        minimum_income,
        maximum_income,
        tax_rate,
        fixed_amount,
        status,
        effective_from,
        effective_to,
        created_at,
        updated_at
      FROM tax_rules
      WHERE tax_year = ?
        AND status = 'ACTIVE'
      ORDER BY
        minimum_income ASC,
        id ASC
    `;

    return await db.query(sql, [taxYear]);
  },

  // get all rules by tax year
  // admin
  // active + inactive

  async getAllRulesByTaxYear(taxYear) {
    const sql = `
      SELECT
        id,
        tax_year,
        minimum_income,
        maximum_income,
        tax_rate,
        fixed_amount,
        status,
        effective_from,
        effective_to,
        created_at,
        updated_at
      FROM tax_rules
      WHERE tax_year = ?
      ORDER BY
        minimum_income ASC,
        id ASC
    `;

    return await db.query(sql, [taxYear]);
  },

  // get all available tax years
  // active + inactive

  async getAvailableTaxYears() {
    const sql = `
      SELECT DISTINCT tax_year FROM (
        SELECT tax_year FROM tax_years
        UNION
        SELECT tax_year FROM tax_rules WHERE tax_year IS NOT NULL
      ) as all_years
      ORDER BY tax_year DESC
    `;

    const rows = await db.query(sql);

    return rows.map((row) => row.tax_year);
  },

  // get tax year status
  // if every slab is active => active
  // if every slab is inactive => inactive
  // mixed state => mixed

  async getTaxYearStatus(taxYear) {
    const sql = `
      SELECT
        tax_year,
        COUNT(*) AS total_rules,
        SUM(
          CASE
            WHEN status = 'ACTIVE'
            THEN 1
            ELSE 0
          END
        ) AS active_rules,
        SUM(
          CASE
            WHEN status = 'INACTIVE'
            THEN 1
            ELSE 0
          END
        ) AS inactive_rules
      FROM tax_rules
      WHERE tax_year = ?
      GROUP BY tax_year
    `;

    const rows = await db.query(
      sql,
      [taxYear],
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];

    const totalRules =
      Number(row.total_rules);

    const activeRules =
      Number(row.active_rules);

    const inactiveRules =
      Number(row.inactive_rules);

    let status = "MIXED";

    if (
      totalRules > 0 &&
      activeRules === totalRules
    ) {
      status = "ACTIVE";
    }

    if (
      totalRules > 0 &&
      inactiveRules === totalRules
    ) {
      status = "INACTIVE";
    }

    return {
      tax_year: row.tax_year,
      total_rules: totalRules,
      active_rules: activeRules,
      inactive_rules: inactiveRules,
      status,
    };
  },

  // get rules for overlap check
  // active + inactive

  async getRulesByTaxYearExceptId(
    taxYear,
    id,
  ) {
    const sql = `
      SELECT
        id,
        tax_year,
        minimum_income,
        maximum_income,
        tax_rate,
        fixed_amount,
        status,
        effective_from,
        effective_to
      FROM tax_rules
      WHERE tax_year = ?
        AND id <> ?
      ORDER BY
        minimum_income ASC,
        id ASC
    `;

    return await db.query(
      sql,
      [
        taxYear,
        id,
      ],
    );
  },

  // update tax rule

  async updateTaxRule(
    id,
    data,
  ) {
    const sql = `
      UPDATE tax_rules
      SET
        tax_year = ?,
        minimum_income = ?,
        maximum_income = ?,
        tax_rate = ?,
        fixed_amount = ?,
        status = COALESCE(?, status),
        effective_from = ?,
        effective_to = ?
      WHERE id = ?
    `;

    const values = [
      data.tax_year,
      data.minimum_income,
      data.maximum_income,
      data.tax_rate,
      data.fixed_amount,
      data.status || null,
      data.effective_from,
      data.effective_to,
      id,
    ];

    return await db.query(
      sql,
      values,
    );
  },

  // update whole tax year status
  // active   => every slab active
  // inactive => every slab inactive

  async updateTaxYearStatus(
    taxYear,
    status,
  ) {
    const sql = `
      UPDATE tax_rules
      SET
        status = ?
      WHERE tax_year = ?
    `;

    return await db.query(
      sql,
      [
        status,
        taxYear,
      ],
    );
  },
  // get single rule by id
  async getRuleById(id) {
    const sql = 'SELECT * FROM tax_rules WHERE id = ?';
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  },

  // toggle rule status
  async toggleStatus(id, status) {
    const sql = 'UPDATE tax_rules SET status = ? WHERE id = ?';
    return await db.query(sql, [status, id]);
  },

  // delete tax rule
  async deleteTaxRule(id) {
    const sql = 'DELETE FROM tax_rules WHERE id = ?';
    return await db.query(sql, [id]);
  },
};

module.exports = TaxRuleModel;
