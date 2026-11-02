const { query } = require("../database/query");
const pool = require("../database/connection");

class UserModel {
  async findByEmail(email) {
    const sql = `
            SELECT *
            FROM users
            WHERE email = ?
            LIMIT 1
        `;

    const users = await query(sql, [email]);

    return users[0] || null;
  }

  async findByphone(phone) {
    const sql = `
        SELECT *
        FROM users
        WHERE phone = ?
        LIMIT 1
    `;
    const user = await query(sql, [phone]);
    return user[0] || null;
  }

  async findByNid(nid) {
    const sql = `
        SELECT *
        FROM users
        WHERE nid = ?
        LIMIT 1
    `;
    const user = await query(sql, [nid]);
    return user[0] || null;
  }

  async findByTin(tinNumber) {
    const sql = `
        SELECT u.*, tp.tin_number
        FROM users u
        INNER JOIN taxpayer_profiles tp ON u.id = tp.user_id
        WHERE tp.tin_number = ?
        LIMIT 1
    `;
    const rows = await query(sql, [tinNumber]);
    return rows[0] || null;
  }

  async create(userData) {
    const sql = `
        INSERT INTO users (
          full_name,
          email,
          password,
          phone,
          nid
        )
        VALUES (?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      userData.full_name,
      userData.email,
      userData.password,
      userData.phone,
      userData.nid,
    ]);

    return result;
  }

  async createWithProfile(userData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [userResult] = await connection.query(
        `INSERT INTO users (
          full_name,
          email,
          password,
          phone,
          nid
        )
        VALUES (?, ?, ?, ?, ?)`,
        [
          userData.full_name,
          userData.email,
          userData.password,
          userData.phone,
          userData.nid,
        ]
      );

      const userId = userResult.insertId;

      await connection.query(
        `INSERT INTO taxpayer_profiles (
          user_id,
          tin_number
        )
        VALUES (?, ?)`,
        [userId, userData.tin_number]
      );

      await connection.commit();

      return { insertId: userId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findById(id) {
    const sql = `
        SELECT
            u.id,
            u.full_name,
            u.email,
            u.phone,
            u.nid,
            tp.tin_number,
            u.role,
            u.is_verified,
            u.created_at,
            u.updated_at
        FROM users u
        LEFT JOIN taxpayer_profiles tp ON u.id = tp.user_id
        WHERE u.id = ?
        LIMIT 1
    `;

    const users = await query(sql, [id]);

    return users[0] || null;
  }
}

module.exports = new UserModel();
