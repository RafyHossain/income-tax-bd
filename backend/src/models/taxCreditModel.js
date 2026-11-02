const db = require("../database/query");

const TaxCreditModel = {
  // Find all tax credit records for a user
  async findByUserId(userId) {
    const sql = `
      SELECT
        id,
        user_id,
        tax_year,
        tds_amount,
        advance_tax_amount,
        (tds_amount + advance_tax_amount) AS total_tax_credits,
        challan_number,
        description,
        created_at,
        updated_at
      FROM tax_credits
      WHERE user_id = ?
      ORDER BY tax_year DESC
    `;
    return await db.query(sql, [userId]);
  },

  // Find tax credit record for a specific user and tax year
  async findByUserAndYear(userId, taxYear) {
    const sql = `
      SELECT
        id,
        user_id,
        tax_year,
        tds_amount,
        advance_tax_amount,
        (tds_amount + advance_tax_amount) AS total_tax_credits,
        challan_number,
        description,
        created_at,
        updated_at
      FROM tax_credits
      WHERE user_id = ? AND tax_year = ?
      LIMIT 1
    `;
    const rows = await db.query(sql, [userId, taxYear]);
    return rows[0] || null;
  },

  // Insert or update tax credit for a specific user and tax year
  async upsert(userId, data) {
    const sql = `
      INSERT INTO tax_credits (
        user_id,
        tax_year,
        tds_amount,
        advance_tax_amount,
        challan_number,
        description
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        tds_amount = VALUES(tds_amount),
        advance_tax_amount = VALUES(advance_tax_amount),
        challan_number = VALUES(challan_number),
        description = VALUES(description),
        updated_at = CURRENT_TIMESTAMP
    `;
    const values = [
      userId,
      data.tax_year,
      Number(data.tds_amount || 0),
      Number(data.advance_tax_amount || 0),
      data.challan_number || null,
      data.description || null,
    ];
    await db.query(sql, values);
    return await this.findByUserAndYear(userId, data.tax_year);
  },

  // Delete tax credit entry
  async deleteByUserAndYear(userId, taxYear) {
    const sql = `
      DELETE FROM tax_credits
      WHERE user_id = ? AND tax_year = ?
    `;
    return await db.query(sql, [userId, taxYear]);
  },
};

module.exports = TaxCreditModel;

