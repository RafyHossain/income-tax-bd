const db = require("../database/query");

const TaxReturnModel = {
  /**
   * Create a new tax return record (supports transactional connection).
   */
  async createReturn(returnData, client = null) {
    const isZeroPayable = Math.max(0, Number(returnData.payable_tax || 0)) === 0;
    const paymentStatus = returnData.payment_status || (isZeroPayable ? "PAID" : "PENDING");

    const sql = `
      INSERT INTO tax_returns (
        user_id,
        tax_calculation_id,
        tax_year,
        assessment_year,
        return_type,
        return_status,
        payment_status,
        total_income,
        total_exemption,
        total_deduction,
        taxable_income,
        gross_tax,
        tax_rebate,
        tax_liability,
        minimum_tax,
        payable_tax,
        net_tax,
        surcharge_amount,
        total_tax_payable,
        tds_amount,
        advance_tax_amount,
        refund_amount,
        submitted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      returnData.user_id,
      returnData.tax_calculation_id,
      returnData.tax_year,
      returnData.assessment_year || returnData.tax_year,
      returnData.return_type || "INDIVIDUAL_REGULAR",
      returnData.return_status || "DRAFT",
      paymentStatus,
      Number(returnData.total_income || 0).toFixed(2),
      Number(returnData.total_exemption || 0).toFixed(2),
      Number(returnData.total_deduction || 0).toFixed(2),
      Number(returnData.taxable_income || 0).toFixed(2),
      Number(returnData.gross_tax || 0).toFixed(2),
      Number(returnData.tax_rebate || 0).toFixed(2),
      Number(returnData.tax_liability || 0).toFixed(2),
      Number(returnData.minimum_tax || 0).toFixed(2),
      Math.max(0, Number(returnData.payable_tax || 0)).toFixed(2),
      Number(returnData.net_tax || 0).toFixed(2),
      Number(returnData.surcharge_amount || 0).toFixed(2),
      Number(returnData.total_tax_payable || 0).toFixed(2),
      Number(returnData.tds_amount || 0).toFixed(2),
      Number(returnData.advance_tax_amount || 0).toFixed(2),
      Number(returnData.refund_amount || 0).toFixed(2),
      returnData.submitted_at || null,
    ];

    if (client) {
      const [result] = await client.execute(sql, values);
      return result;
    }
    return await db.query(sql, values);
  },

  /**
   * Insert snapshot line items into tax_return_details.
   */
  async createReturnDetails(detailsArray, client = null) {
    if (!detailsArray || detailsArray.length === 0) return [];

    const sql = `
      INSERT INTO tax_return_details (
        tax_return_id,
        section,
        income_type,
        description,
        amount,
        metadata
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const results = [];
    for (const item of detailsArray) {
      const metadataStr =
        item.metadata !== undefined && item.metadata !== null
          ? typeof item.metadata === "string"
            ? item.metadata
            : JSON.stringify(item.metadata)
          : null;

      const values = [
        item.tax_return_id,
        item.section,
        item.income_type || null,
        item.description,
        Number(item.amount || 0).toFixed(2),
        metadataStr,
      ];

      if (client) {
        const [res] = await client.execute(sql, values);
        results.push(res);
      } else {
        const res = await db.query(sql, values);
        results.push(res);
      }
    }
    return results;
  },

  /**
   * Record a transition in tax_return_status_history.
   * STRICT POLICY: Audit log only triggers for administrative actions (changed_by must have role 'admin').
   */
  async addStatusHistory(historyData, client = null) {
    if (!historyData?.changed_by || !historyData?.tax_return_id) {
      return null;
    }

    // Verify that changed_by is an admin (Admin-related work only)
    const roleSql = `SELECT role FROM users WHERE id = ? LIMIT 1`;
    let userRow;
    if (client) {
      const [rows] = await client.execute(roleSql, [historyData.changed_by]);
      userRow = rows[0];
    } else {
      const rows = await db.query(roleSql, [historyData.changed_by]);
      userRow = rows[0];
    }

    if (!userRow || String(userRow.role || "").trim().toLowerCase() !== "admin") {
      // Skip logging: ordinary taxpayer self-service workflows do not trigger audit log
      return null;
    }

    const sql = `
      INSERT INTO tax_return_status_history (
        tax_return_id,
        previous_status,
        new_status,
        changed_by,
        remarks
      )
      VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
      historyData.tax_return_id,
      historyData.previous_status || null,
      historyData.new_status,
      historyData.changed_by,
      historyData.remarks || null,
    ];

    if (client) {
      const [result] = await client.execute(sql, values);
      return result;
    }
    return await db.query(sql, values);
  },

  /**
   * Find an active return (DRAFT or VALIDATED) for user, tax_year, and return_type.
   */
  async findActiveDraft(userId, taxYear, returnType = "INDIVIDUAL_REGULAR", client = null) {
    let sql = `
      SELECT *
      FROM tax_returns
      WHERE user_id = ?
        AND tax_year = ?
        AND return_type = ?
        AND return_status IN ('DRAFT', 'VALIDATED')
      LIMIT 1
    `;
    if (client) {
      sql += " FOR UPDATE";
      const [rows] = await client.execute(sql, [userId, taxYear, returnType]);
      return rows[0] || null;
    }
    const rows = await db.query(sql, [userId, taxYear, returnType]);
    return rows[0] || null;
  },

  /**
   * Find tax return associated with a specific calculation ID.
   */
  async findByCalculationId(taxCalculationId, userId = null) {
    let sql = `
      SELECT
        tr.*,
        u.full_name AS taxpayer_name,
        u.email AS taxpayer_email,
        tc.category AS taxpayer_category
      FROM tax_returns tr
      LEFT JOIN users u ON tr.user_id = u.id
      LEFT JOIN tax_calculations tc ON tr.tax_calculation_id = tc.id
      WHERE tr.tax_calculation_id = ?
    `;
    const params = [taxCalculationId];

    if (userId) {
      sql += ` AND tr.user_id = ?`;
      params.push(userId);
    }

    sql += ` ORDER BY tr.id DESC LIMIT 1`;
    const rows = await db.query(sql, params);
    return rows[0] || null;
  },

  /**
   * Get single tax return by ID with user and calculation metadata.
   */
  async findById(id) {
    const sql = `
      SELECT
        tr.*,
        u.full_name AS taxpayer_name,
        u.email AS taxpayer_email,
        tc.category AS taxpayer_category
      FROM tax_returns tr
      LEFT JOIN users u ON tr.user_id = u.id
      LEFT JOIN tax_calculations tc ON tr.tax_calculation_id = tc.id
      WHERE tr.id = ?
    `;
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  },

  /**
   * List tax returns for a specific user.
   */
  async findByUserId(userId, options = {}) {
    let sql = `
      SELECT
        tr.*,
        tc.category AS taxpayer_category
      FROM tax_returns tr
      LEFT JOIN tax_calculations tc ON tr.tax_calculation_id = tc.id
      WHERE tr.user_id = ?
    `;
    const params = [userId];

    if (options.taxYear) {
      sql += ` AND tr.tax_year = ?`;
      params.push(options.taxYear);
    }

    if (options.status) {
      sql += ` AND tr.return_status = ?`;
      params.push(options.status);
    }

    sql += ` ORDER BY tr.id DESC`;
    return await db.query(sql, params);
  },

  /**
   * List all tax returns across all users (Admin view).
   */
  async findAll(filters = {}) {
    let sql = `
      SELECT
        tr.*,
        u.full_name AS taxpayer_name,
        u.email AS taxpayer_email,
        tc.category AS taxpayer_category
      FROM tax_returns tr
      LEFT JOIN users u ON tr.user_id = u.id
      LEFT JOIN tax_calculations tc ON tr.tax_calculation_id = tc.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.userId) {
      sql += ` AND tr.user_id = ?`;
      params.push(filters.userId);
    }

    if (filters.taxYear) {
      sql += ` AND tr.tax_year = ?`;
      params.push(filters.taxYear);
    }

    if (filters.status) {
      sql += ` AND tr.return_status = ?`;
      params.push(filters.status);
    }

    if (filters.returnType) {
      sql += ` AND tr.return_type = ?`;
      params.push(filters.returnType);
    }

    sql += ` ORDER BY tr.id DESC`;
    return await db.query(sql, params);
  },

  /**
   * Get all line item details for a return.
   */
  async getDetailsByReturnId(returnId) {
    const sql = `
      SELECT *
      FROM tax_return_details
      WHERE tax_return_id = ?
      ORDER BY id ASC
    `;
    const rows = await db.query(sql, [returnId]);
    return rows.map((r) => {
      let parsedMetadata = null;
      if (r.metadata) {
        try {
          parsedMetadata =
            typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata;
        } catch {
          parsedMetadata = r.metadata;
        }
      }
      return {
        ...r,
        metadata: parsedMetadata,
      };
    });
  },

  /**
   * Get status workflow audit trail for a return.
   */
  async getStatusHistoryByReturnId(returnId) {
    const sql = `
      SELECT
        sh.*,
        u.full_name AS changed_by_name,
        u.email AS changed_by_email,
        u.role AS changed_by_role
      FROM tax_return_status_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      WHERE sh.tax_return_id = ?
      ORDER BY sh.id ASC
    `;
    return await db.query(sql, [returnId]);
  },

  /**
   * Update status with audit trail and optional client connection.
   */
  async updateStatus(id, newStatus, changedBy, remarks = null, submittedAt = null, client = null) {
    const sql = `
      UPDATE tax_returns
      SET return_status = ?,
          submitted_at = COALESCE(?, submitted_at),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const values = [newStatus, submittedAt, id];

    if (client) {
      const [res] = await client.execute(sql, values);
      return res;
    }
    return await db.query(sql, values);
  },

  /**
   * Update a draft return with figures from a newly selected calculation.
   */
  async updateReturnCalculation(id, returnData, client = null) {
    const isZeroPayable = Math.max(0, Number(returnData.payable_tax || 0)) === 0;
    const paymentStatus = returnData.payment_status || (isZeroPayable ? "PAID" : "PENDING");

    const sql = `
      UPDATE tax_returns
      SET tax_calculation_id = ?,
          return_status = 'DRAFT',
          payment_status = ?,
          total_income = ?,
          total_exemption = ?,
          total_deduction = ?,
          taxable_income = ?,
          gross_tax = ?,
          tax_rebate = ?,
          tax_liability = ?,
          minimum_tax = ?,
          payable_tax = ?,
          net_tax = ?,
          surcharge_amount = ?,
          total_tax_payable = ?,
          tds_amount = ?,
          advance_tax_amount = ?,
          refund_amount = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const values = [
      returnData.tax_calculation_id,
      paymentStatus,
      Number(returnData.total_income || 0).toFixed(2),
      Number(returnData.total_exemption || 0).toFixed(2),
      Number(returnData.total_deduction || 0).toFixed(2),
      Number(returnData.taxable_income || 0).toFixed(2),
      Number(returnData.gross_tax || 0).toFixed(2),
      Number(returnData.tax_rebate || 0).toFixed(2),
      Number(returnData.tax_liability || 0).toFixed(2),
      Number(returnData.minimum_tax || 0).toFixed(2),
      Math.max(0, Number(returnData.payable_tax || 0)).toFixed(2),
      Number(returnData.net_tax || 0).toFixed(2),
      Number(returnData.surcharge_amount || 0).toFixed(2),
      Number(returnData.total_tax_payable || 0).toFixed(2),
      Number(returnData.tds_amount || 0).toFixed(2),
      Number(returnData.advance_tax_amount || 0).toFixed(2),
      Number(returnData.refund_amount || 0).toFixed(2),
      id,
    ];

    if (client) {
      const [res] = await client.execute(sql, values);
      return res;
    }
    return await db.query(sql, values);
  },

  /**
   * Get acknowledgment if exists for a return.
   */
  async getAcknowledgment(returnId) {
    const sql = `
      SELECT *
      FROM tax_return_acknowledgments
      WHERE tax_return_id = ?
      LIMIT 1
    `;
    const rows = await db.query(sql, [returnId]);
    return rows[0] || null;
  },

  /**
   * Create or update acknowledgment for a return.
   */
  async createAcknowledgment({ taxReturnId, acknowledgmentNumber, source = "SYSTEM", documentReference = null }, client = null) {
    const sql = `
      INSERT INTO tax_return_acknowledgments (tax_return_id, acknowledgment_number, source, document_reference)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE acknowledgment_number = VALUES(acknowledgment_number), document_reference = VALUES(document_reference)
    `;
    const values = [taxReturnId, acknowledgmentNumber, source, documentReference];
    if (client) {
      const [res] = await client.execute(sql, values);
      return res;
    }
    return await db.query(sql, values);
  },

  /**
   * Delete tax return and related records (supports transactional connection).
   */
  async deleteReturn(id, client = null) {
    if (client) {
      await client.execute("DELETE FROM tax_return_acknowledgments WHERE tax_return_id = ?", [id]);
      await client.execute("DELETE FROM tax_return_status_history WHERE tax_return_id = ?", [id]);
      await client.execute("DELETE FROM tax_return_details WHERE tax_return_id = ?", [id]);
      const [result] = await client.execute("DELETE FROM tax_returns WHERE id = ?", [id]);
      return result;
    }
    await db.query("DELETE FROM tax_return_acknowledgments WHERE tax_return_id = ?", [id]);
    await db.query("DELETE FROM tax_return_status_history WHERE tax_return_id = ?", [id]);
    await db.query("DELETE FROM tax_return_details WHERE tax_return_id = ?", [id]);
    return await db.query("DELETE FROM tax_returns WHERE id = ?", [id]);
  },

  /**
   * Record payment for a return and transition status to PAID.
   */
  async recordPayment(id, { paymentMethod, paymentReference, paidAt }, client = null) {
    const sql = `
      UPDATE tax_returns
      SET payment_status = 'PAID',
          payment_method = ?,
          payment_reference = ?,
          paid_at = ?,
          return_status = CASE 
            WHEN return_status IN ('DRAFT', 'VALIDATED') THEN 'PAID'
            ELSE return_status
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const values = [
      paymentMethod || "A-CHALLAN",
      paymentReference || `TXN-${Date.now()}`,
      paidAt || new Date(),
      id,
    ];
    if (client) {
      const [res] = await client.execute(sql, values);
      return res;
    }
    return await db.query(sql, values);
  },
};

module.exports = TaxReturnModel;

