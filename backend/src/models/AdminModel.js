const { query } = require("../database/query");
const pool = require("../database/connection");

const AdminModel = {
  async getDashboardStats() {
    const summarySql = `
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM income) AS total_income_records,
        (SELECT COUNT(*) FROM expenses) AS total_expense_records,
        (SELECT COUNT(*) FROM tax_returns) AS total_tax_returns,
        (SELECT COUNT(*) FROM tax_returns WHERE (payment_status = 'PENDING' OR payment_status IS NULL) AND payable_tax > 0) AS pending_payments,
        (SELECT COUNT(*) FROM refund_requests WHERE status = 'PENDING') AS pending_refunds_count
    `;

    const statusSql = `
      SELECT return_status AS status, COUNT(*) AS count
      FROM tax_returns
      GROUP BY return_status
    `;

    const returnsSql = `
      SELECT
        tr.id,
        tr.user_id,
        u.full_name AS user_name,
        u.email AS user_email,
        tr.tax_year,
        tr.return_status,
        tr.payment_status,
        tr.taxable_income,
        tr.payable_tax,
        tr.refund_amount,
        tr.submitted_at,
        tr.created_at
      FROM tax_returns tr
      LEFT JOIN users u ON tr.user_id = u.id
      ORDER BY tr.id DESC
      LIMIT 6
    `;

    const refundsSql = `
      SELECT
        r.id,
        r.user_id,
        u.full_name AS user_name,
        u.email AS user_email,
        r.tax_return_id,
        r.refund_amount,
        r.bank_name,
        r.status,
        r.created_at
      FROM refund_requests r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.status = 'PENDING'
      ORDER BY r.created_at DESC
      LIMIT 6
    `;

    const auditSql = `
      SELECT
        sh.id,
        sh.tax_return_id,
        sh.previous_status AS from_status,
        sh.new_status AS to_status,
        sh.remarks,
        sh.created_at,
        u.full_name AS changed_by_name,
        u.role AS changed_by_role
      FROM tax_return_status_history sh
      INNER JOIN users u ON sh.changed_by = u.id AND LOWER(u.role) = 'admin'
      ORDER BY sh.id DESC
      LIMIT 6
    `;

    const [summaryRows, statusRows, returnsRows, refundsRows, auditRows] = await Promise.all([
      query(summarySql),
      query(statusSql).catch(() => []),
      query(returnsSql).catch(() => []),
      query(refundsSql).catch(() => []),
      query(auditSql).catch(() => []),
    ]);

    return {
      ...(summaryRows[0] || {}),
      return_status_overview: statusRows || [],
      recent_returns: returnsRows || [],
      pending_refunds: refundsRows || [],
      recent_audit_logs: auditRows || [],
    };
  },

  async getAllUsers() {
    const sql = `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.nid,
        p.tin_number,
        u.role,
        u.is_verified,
        p.gender,
        p.minimum_tax_area,
        p.is_new_taxpayer,
        p.filing_history_status,
        p.filing_history_verified,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN taxpayer_profiles p ON p.user_id = u.id
      ORDER BY u.id DESC
    `;

    return await query(sql);
  },

  async getUserById(id) {
    const sql = `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.nid,
        p.tin_number,
        u.role,
        u.is_verified,
        p.gender,
        p.minimum_tax_area,
        p.is_new_taxpayer,
        p.filing_history_status,
        p.filing_history_verified,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN taxpayer_profiles p ON p.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
    `;

    const rows = await query(sql, [id]);
    return rows[0] || null;
  },

  async updateUserRole(id, role) {
    const sql = `
      UPDATE users
      SET
        role = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    return await query(sql, [role, id]);
  },

  async deleteUser(userId) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `
          DELETE FROM tax_deductions
          WHERE user_id = ?
        `,
        [userId],
      );

      await connection.query(
        `
          DELETE FROM tax_calculations
          WHERE user_id = ?
        `,
        [userId],
      );

      const [result] = await connection.query(
        `
          DELETE FROM users
          WHERE id = ?
        `,
        [userId],
      );

      if (result.affectedRows === 0) {
        throw new Error("User not found.");
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getAllCalculations() {
    const sql = `
      SELECT
        tc.id,
        tc.user_id,
        u.full_name AS user_name,
        u.email AS user_email,
        tc.tax_year,
        tc.category,
        tc.total_income,
        tc.taxable_income,
        tc.gross_tax,
        tc.tax_rebate,
        tc.net_tax,
        tc.surcharge_amount,
        tc.total_tax_payable,
        tc.tds_amount,
        tc.advance_tax_amount,
        tc.final_payable,
        tc.refund_amount,
        tc.filing_status,
        tc.calculated_at,
        tc.created_at
      FROM tax_calculations tc
      LEFT JOIN users u ON tc.user_id = u.id
      ORDER BY tc.id DESC
    `;

    return await query(sql);
  },

  async getAuditLogs() {
    const sql = `
      SELECT
        sh.id,
        sh.tax_return_id,
        sh.previous_status AS from_status,
        sh.new_status AS to_status,
        sh.remarks,
        sh.created_at,
        u.full_name AS changed_by_name,
        u.email AS changed_by_email,
        u.role AS changed_by_role,
        tr.tax_year,
        tr.assessment_year,
        owner.full_name AS taxpayer_name,
        owner.email AS taxpayer_email
      FROM tax_return_status_history sh
      INNER JOIN users u ON sh.changed_by = u.id AND LOWER(u.role) = 'admin'
      LEFT JOIN tax_returns tr ON sh.tax_return_id = tr.id
      LEFT JOIN users owner ON tr.user_id = owner.id
      ORDER BY sh.id DESC
      LIMIT 100
    `;

    return await query(sql);
  },
};

module.exports = AdminModel;
