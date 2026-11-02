const db = require("../database/query");

const TaxpayerProfileModel = {
  async createProfile(data) {
    const sql = `
            INSERT INTO taxpayer_profiles (
                user_id,
                tin_number,
                date_of_birth,
                gender,
                minimum_tax_area,
                is_new_taxpayer,
                filing_history_status,
                filing_history_verified,
                is_physically_challenged,
                disabled_child_dependents,
                is_freedom_fighter,
                is_july_warrior,
                net_wealth,
                has_multiple_motor_vehicles,
                has_large_house_property,
                tds_amount,
                advance_tax_amount
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    const values = [
      data.user_id,
      data.tin_number || null,
      data.date_of_birth || null,
      data.gender || null,
      data.minimum_tax_area || "OTHER_AREA",
      data.is_new_taxpayer ? 1 : 0,
      data.filing_history_status || "UNAVAILABLE",
      data.filing_history_verified ? 1 : 0,
      data.is_physically_challenged ? 1 : 0,
      data.disabled_child_dependents || 0,
      data.is_freedom_fighter ? 1 : 0,
      data.is_july_warrior ? 1 : 0,
      Number(data.net_wealth || 0),
      data.has_multiple_motor_vehicles ? 1 : 0,
      data.has_large_house_property ? 1 : 0,
      Number(data.tds_amount || 0),
      Number(data.advance_tax_amount || 0),
    ];

    return await db.query(sql, values);
  },

  async getProfileByUserId(userId) {
    const sql = `
            SELECT
                id,
                user_id,
                tin_number,
                date_of_birth,
                gender,
                minimum_tax_area,
                is_new_taxpayer,
                filing_history_status,
                filing_history_verified,
                is_physically_challenged,
                disabled_child_dependents,
                is_freedom_fighter,
                is_july_warrior,
                net_wealth,
                has_multiple_motor_vehicles,
                has_large_house_property,
                tds_amount,
                advance_tax_amount,
                created_at,
                updated_at
            FROM taxpayer_profiles
            WHERE user_id = ?
            LIMIT 1
        `;

    return await db.query(sql, [userId]);
  },

  async updateProfile(userId, data) {
    const sql = `
            UPDATE taxpayer_profiles
            SET
                tin_number = COALESCE(?, tin_number),
                date_of_birth = ?,
                gender = ?,
                minimum_tax_area = ?,
                is_new_taxpayer = ?,
                filing_history_status = COALESCE(?, filing_history_status),
                filing_history_verified = COALESCE(?, filing_history_verified),
                is_physically_challenged = ?,
                disabled_child_dependents = ?,
                is_freedom_fighter = ?,
                is_july_warrior = ?,
                net_wealth = ?,
                has_multiple_motor_vehicles = ?,
                has_large_house_property = ?,
                tds_amount = COALESCE(?, tds_amount),
                advance_tax_amount = COALESCE(?, advance_tax_amount)
            WHERE user_id = ?
        `;

    const values = [
      data.tin_number !== undefined && data.tin_number !== null && data.tin_number !== "" ? data.tin_number : null,
      data.date_of_birth,
      data.gender,
      data.minimum_tax_area || "OTHER_AREA",
      data.is_new_taxpayer ? 1 : 0,
      data.filing_history_status || null,
      data.filing_history_verified !== undefined ? (data.filing_history_verified ? 1 : 0) : null,
      data.is_physically_challenged ? 1 : 0,
      data.disabled_child_dependents || 0,
      data.is_freedom_fighter ? 1 : 0,
      data.is_july_warrior ? 1 : 0,
      Number(data.net_wealth || 0),
      data.has_multiple_motor_vehicles ? 1 : 0,
      data.has_large_house_property ? 1 : 0,
      data.tds_amount !== undefined && data.tds_amount !== null && data.tds_amount !== "" ? Number(data.tds_amount) : null,
      data.advance_tax_amount !== undefined && data.advance_tax_amount !== null && data.advance_tax_amount !== "" ? Number(data.advance_tax_amount) : null,
      userId,
    ];

    return await db.query(sql, values);
  },

  async findByTin(tinNumber) {
    const sql = `
      SELECT id, user_id, tin_number
      FROM taxpayer_profiles
      WHERE tin_number = ?
      LIMIT 1
    `;
    const rows = await db.query(sql, [tinNumber]);
    return rows[0] || null;
  },

  async findByTinExcludeUser(tinNumber, userId) {
    const sql = `
      SELECT id, user_id, tin_number
      FROM taxpayer_profiles
      WHERE tin_number = ? AND user_id != ?
      LIMIT 1
    `;
    const rows = await db.query(sql, [tinNumber, userId]);
    return rows[0] || null;
  },

  async profileExists(userId) {
    const sql = `
            SELECT
                id
            FROM taxpayer_profiles
            WHERE user_id = ?
            LIMIT 1
        `;

    const rows = await db.query(sql, [userId]);

    return rows.length > 0;
  },
};

module.exports = TaxpayerProfileModel;
