const db = require("../database/query");

const RefundRequestModel = {
  /**
   * Create a new refund request.
   */
  async create(data, connection = null) {
    const sql = `
      INSERT INTO refund_requests (
        user_id,
        tax_return_id,
        tax_calculation_id,
        refund_amount,
        account_holder_name,
        bank_name,
        bank_account_number,
        branch_name,
        reason,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `;

    const values = [
      data.user_id,
      data.tax_return_id,
      data.tax_calculation_id,
      Number(data.refund_amount || 0).toFixed(2),
      data.account_holder_name,
      data.bank_name,
      data.bank_account_number,
      data.branch_name,
      data.reason || null,
    ];

    if (connection) {
      const [result] = await connection.execute(sql, values);
      return result.insertId;
    }

    const result = await db.query(sql, values);
    return result.insertId;
  },

  /**
   * Find refund request by ID with full details (user, return, reviewer).
   */
  async findById(id) {
    const sql = `
      SELECT 
        r.*,
        u.full_name AS taxpayer_name,
        u.email AS taxpayer_email,
        u.phone AS taxpayer_phone,
        CONCAT('TRN-', REPLACE(tr.tax_year, '-', ''), '-', LPAD(tr.id, 6, '0')) AS return_number,
        tr.tax_year,
        tr.assessment_year,
        tr.return_status,
        tr.payable_tax,
        tr.net_tax,
        tr.total_income,
        tr.taxable_income,
        tr.submitted_at AS return_submitted_at,
        rev.full_name AS reviewer_name,
        rev.email AS reviewer_email
      FROM refund_requests r
      INNER JOIN users u ON r.user_id = u.id
      INNER JOIN tax_returns tr ON r.tax_return_id = tr.id
      LEFT JOIN users rev ON r.reviewed_by = rev.id
      WHERE r.id = ?
    `;

    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  },

  /**
   * Find all refund requests for a return.
   */
  async findByReturnId(returnId) {
    const sql = `
      SELECT 
        r.*,
        rev.full_name AS reviewer_name
      FROM refund_requests r
      LEFT JOIN users rev ON r.reviewed_by = rev.id
      WHERE r.tax_return_id = ?
      ORDER BY r.created_at DESC
    `;

    return await db.query(sql, [returnId]);
  },

  /**
   * Find any active refund request for a return (PENDING, APPROVED, REFUNDED).
   * Used to prevent duplicate active refund requests for the same return.
   */
  async findActiveByReturnId(returnId) {
    const sql = `
      SELECT *
      FROM refund_requests
      WHERE tax_return_id = ?
        AND status IN ('PENDING', 'APPROVED', 'REFUNDED')
      LIMIT 1
    `;

    const rows = await db.query(sql, [returnId]);
    return rows[0] || null;
  },

  /**
   * Find all refund requests submitted by a specific user.
   */
  async findByUserId(userId) {
    const sql = `
      SELECT 
        r.*,
        CONCAT('TRN-', REPLACE(tr.tax_year, '-', ''), '-', LPAD(tr.id, 6, '0')) AS return_number,
        tr.tax_year,
        tr.assessment_year,
        tr.return_status
      FROM refund_requests r
      INNER JOIN tax_returns tr ON r.tax_return_id = tr.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `;

    return await db.query(sql, [userId]);
  },

  /**
   * Find all refund requests (for admin view) with optional filtering.
   */
  async findAll(filters = {}) {
    let sql = `
      SELECT 
        r.*,
        u.full_name AS taxpayer_name,
        u.email AS taxpayer_email,
        CONCAT('TRN-', REPLACE(tr.tax_year, '-', ''), '-', LPAD(tr.id, 6, '0')) AS return_number,
        tr.tax_year,
        tr.assessment_year,
        tr.return_status,
        rev.full_name AS reviewer_name
      FROM refund_requests r
      INNER JOIN users u ON r.user_id = u.id
      INNER JOIN tax_returns tr ON r.tax_return_id = tr.id
      LEFT JOIN users rev ON r.reviewed_by = rev.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.status && filters.status !== "ALL") {
      sql += ` AND r.status = ?`;
      params.push(filters.status);
    }

    if (filters.tax_year) {
      sql += ` AND tr.tax_year = ?`;
      params.push(filters.tax_year);
    }

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      sql += ` AND (u.full_name LIKE ? OR u.email LIKE ? OR CONCAT('TRN-', REPLACE(tr.tax_year, '-', ''), '-', LPAD(tr.id, 6, '0')) LIKE ? OR r.bank_name LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ` ORDER BY r.created_at DESC`;

    return await db.query(sql, params);
  },

  /**
   * Get refund metrics / counts by status.
   */
  async getMetrics() {
    const sql = `
      SELECT 
        COUNT(*) AS total_count,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_count,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_count,
        SUM(CASE WHEN status = 'REFUNDED' THEN 1 ELSE 0 END) AS refunded_count,
        SUM(CASE WHEN status = 'REFUNDED' THEN refund_amount ELSE 0 END) AS total_refunded_amount,
        SUM(CASE WHEN status = 'PENDING' THEN refund_amount ELSE 0 END) AS total_pending_amount
      FROM refund_requests
    `;

    const rows = await db.query(sql);
    const row = rows[0] || {};
    return {
      total: Number(row.total_count || 0),
      pending: Number(row.pending_count || 0),
      approved: Number(row.approved_count || 0),
      rejected: Number(row.rejected_count || 0),
      refunded: Number(row.refunded_count || 0),
      totalRefundedAmount: Number(row.total_refunded_amount || 0),
      totalPendingAmount: Number(row.total_pending_amount || 0),
    };
  },

  /**
   * Update request status and audit fields.
   */
  async updateStatus(id, updateData, connection = null) {
    const fields = ["status = ?"];
    const values = [updateData.status];

    if (updateData.reviewed_by !== undefined) {
      fields.push("reviewed_by = ?");
      values.push(updateData.reviewed_by);
    }

    if (updateData.reviewed_at !== undefined) {
      fields.push("reviewed_at = ?");
      values.push(updateData.reviewed_at);
    }

    if (updateData.rejection_reason !== undefined) {
      fields.push("rejection_reason = ?");
      values.push(updateData.rejection_reason);
    }

    if (updateData.transaction_reference !== undefined) {
      fields.push("transaction_reference = ?");
      values.push(updateData.transaction_reference);
    }

    if (updateData.refunded_at !== undefined) {
      fields.push("refunded_at = ?");
      values.push(updateData.refunded_at);
    }

    values.push(id);

    const sql = `
      UPDATE refund_requests
      SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    if (connection) {
      const [result] = await connection.execute(sql, values);
      return result.affectedRows > 0;
    }

    const result = await db.query(sql, values);
    return result.affectedRows > 0;
  },
};

module.exports = RefundRequestModel;
