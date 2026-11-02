const db = require("../database/query");

const TaxThresholdModel = {
  // get active thresholds by tax year
  async getActiveThresholdsByTaxYear(taxYear) {
    const sql = `
      SELECT
        id,
        tax_year,
        category,
        tax_free_threshold,
        status,
        effective_from,
        effective_to,
        created_at,
        updated_at
      FROM tax_thresholds
      WHERE tax_year = ?
        AND status = 'ACTIVE'
        AND effective_from <= CURDATE()
        AND (effective_to IS NULL OR effective_to >= CURDATE())
      ORDER BY tax_free_threshold ASC, id ASC
    `;

    return await db.query(sql, [taxYear]);
  },

  // admin: get all thresholds with filters
  async getAllThresholds(filters = {}) {
    let sql = `
      SELECT
        id,
        tax_year,
        category,
        tax_free_threshold,
        status,
        effective_from,
        effective_to,
        created_at,
        updated_at
      FROM tax_thresholds
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

    if (filters.category) {
      sql += " AND category = ?";
      values.push(filters.category);
    }

    if (filters.search) {
      sql += " AND category LIKE ?";
      values.push(`%${filters.search}%`);
    }

    sql += " ORDER BY tax_year DESC, tax_free_threshold ASC";

    return await db.query(sql, values);
  },

  // admin: get threshold by id
  async getThresholdById(id) {
    const sql = `
      SELECT
        id,
        tax_year,
        category,
        tax_free_threshold,
        status,
        effective_from,
        effective_to,
        created_at,
        updated_at
      FROM tax_thresholds
      WHERE id = ?
      LIMIT 1
    `;

    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  },

  // admin: create threshold
  async createThreshold(data) {
    const sql = `
      INSERT INTO tax_thresholds (
        tax_year,
        category,
        tax_free_threshold,
        status,
        effective_from,
        effective_to
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.tax_year,
      data.category,
      data.tax_free_threshold,
      data.status || "ACTIVE",
      data.effective_from,
      data.effective_to || null,
    ];

    return await db.query(sql, values);
  },

  // admin: update threshold
  async updateThreshold(id, data) {
    const sql = `
      UPDATE tax_thresholds
      SET
        tax_year = ?,
        category = ?,
        tax_free_threshold = ?,
        status = ?,
        effective_from = ?,
        effective_to = ?
      WHERE id = ?
    `;

    const values = [
      data.tax_year,
      data.category,
      data.tax_free_threshold,
      data.status || "ACTIVE",
      data.effective_from,
      data.effective_to || null,
      id,
    ];

    return await db.query(sql, values);
  },

  // admin: toggle status
  async toggleStatus(id, status) {
    const sql = `
      UPDATE tax_thresholds
      SET status = ?
      WHERE id = ?
    `;

    return await db.query(sql, [status, id]);
  },

  // admin: delete threshold
  async deleteThreshold(id) {
    const sql = `
      DELETE FROM tax_thresholds
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
        SELECT tax_year FROM tax_thresholds WHERE tax_year IS NOT NULL
      ) as all_years
      ORDER BY tax_year DESC
    `;

    const rows = await db.query(sql);

    return rows.map((r) => r.tax_year);
  },
};

module.exports = TaxThresholdModel;
