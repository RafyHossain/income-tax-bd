const db = require("../database/query");

const TaxYearModel = {
  // Get all tax years with optional status filter and dependency reference counts
  async getAllTaxYears(filters = {}) {
    let sql = `
      SELECT
        ty.id,
        ty.tax_year,
        ty.income_year,
        CAST(ty.start_date AS CHAR) as start_date,
        CAST(ty.end_date AS CHAR) as end_date,
        ty.status,
        ty.is_current,
        ty.description,
        ty.created_at,
        ty.updated_at,
        (
          (SELECT COUNT(*) FROM tax_rules WHERE tax_year = ty.tax_year) +
          (SELECT COUNT(*) FROM tax_thresholds WHERE tax_year = ty.tax_year) +
          (SELECT COUNT(*) FROM minimum_tax_rules WHERE tax_year = ty.tax_year) +
          (SELECT COUNT(*) FROM income_exemption_rules WHERE tax_year = ty.tax_year) +
          (SELECT COUNT(*) FROM salary_exemption_rules WHERE tax_year = ty.tax_year) +
          (SELECT COUNT(*) FROM tax_deduction_rules WHERE tax_year = ty.tax_year) +
          (SELECT COUNT(*) FROM tax_rebate_rules WHERE tax_year = ty.tax_year) +
          (SELECT COUNT(*) FROM surcharge_rules WHERE tax_year = ty.tax_year) +
          (SELECT COUNT(*) FROM tax_calculations WHERE tax_year = ty.tax_year) +
          (SELECT COUNT(*) FROM tax_returns WHERE tax_year = ty.tax_year OR assessment_year = ty.tax_year) +
          (SELECT COUNT(*) FROM tax_deductions WHERE tax_year = ty.tax_year)
        ) AS reference_count
      FROM tax_years ty
      WHERE 1 = 1
    `;
    const params = [];

    if (filters.status) {
      sql += " AND ty.status = ?";
      params.push(filters.status);
    }

    if (filters.search) {
      sql += " AND (ty.tax_year LIKE ? OR ty.income_year LIKE ? OR ty.description LIKE ?)";
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    sql += " ORDER BY ty.start_date DESC, ty.id DESC";

    const rows = await db.query(sql, params);
    return rows.map((r) => ({
      ...r,
      reference_count: Number(r.reference_count || 0),
      is_referenced: Number(r.reference_count || 0) > 0,
    }));
  },

  // Get single tax year by ID
  async getTaxYearById(id) {
    const sql = `
      SELECT
        id,
        tax_year,
        income_year,
        CAST(start_date AS CHAR) as start_date,
        CAST(end_date AS CHAR) as end_date,
        status,
        is_current,
        description,
        created_at,
        updated_at
      FROM tax_years
      WHERE id = ?
      LIMIT 1
    `;
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  },

  // Get single tax year by tax_year string (e.g. '2026-27')
  async getByTaxYear(taxYear) {
    const sql = `
      SELECT
        id,
        tax_year,
        income_year,
        CAST(start_date AS CHAR) as start_date,
        CAST(end_date AS CHAR) as end_date,
        status,
        is_current,
        description,
        created_at,
        updated_at
      FROM tax_years
      WHERE tax_year = ?
      LIMIT 1
    `;
    const rows = await db.query(sql, [taxYear]);
    return rows[0] || null;
  },

  // Get all distinct tax year strings from tax_years table
  async getTaxYearStrings() {
    const sql = `
      SELECT DISTINCT tax_year
      FROM tax_years
      ORDER BY tax_year DESC
    `;
    const rows = await db.query(sql);
    return rows.map((r) => r.tax_year);
  },

  // Create new tax year
  async createTaxYear(data) {
    const sql = `
      INSERT INTO tax_years (
        tax_year,
        income_year,
        start_date,
        end_date,
        status,
        is_current,
        description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.tax_year,
      data.income_year,
      data.start_date,
      data.end_date,
      data.status || "ACTIVE",
      data.is_current ? 1 : 0,
      data.description || null,
    ];
    return await db.query(sql, params);
  },

  // Update tax year
  async updateTaxYear(id, data) {
    const sql = `
      UPDATE tax_years
      SET
        income_year = COALESCE(?, income_year),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        status = COALESCE(?, status),
        is_current = COALESCE(?, is_current),
        description = COALESCE(?, description)
      WHERE id = ?
    `;
    const params = [
      data.income_year || null,
      data.start_date || null,
      data.end_date || null,
      data.status || null,
      data.is_current !== undefined ? (data.is_current ? 1 : 0) : null,
      data.description !== undefined ? data.description : null,
      id,
    ];
    return await db.query(sql, params);
  },

  // Toggle status
  async toggleStatus(id, status) {
    if (status === "INACTIVE") {
      const existing = await this.getTaxYearById(id);
      if (existing && existing.is_current === 1) {
        const err = new Error("The current active assessment year is protected and cannot be deactivated.");
        err.code = "CURRENT_YEAR_PROTECTED";
        throw err;
      }
    }
    const sql = `
      UPDATE tax_years
      SET status = ?
      WHERE id = ?
    `;
    return await db.query(sql, [status, id]);
  },

  // Set as current tax year (atomically resetting any other year)
  async setCurrentTaxYear(id) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("UPDATE tax_years SET is_current = 0");
      await connection.query("UPDATE tax_years SET is_current = 1, status = 'ACTIVE' WHERE id = ?", [id]);
      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  // Get reference counts across all related statutory rules, calculations, and returns
  async getReferenceCounts(taxYear) {
    const [counts] = await db.query(
      `
      SELECT
        (SELECT COUNT(*) FROM tax_rules WHERE tax_year = ?) AS tax_rules,
        (SELECT COUNT(*) FROM tax_thresholds WHERE tax_year = ?) AS tax_thresholds,
        (SELECT COUNT(*) FROM minimum_tax_rules WHERE tax_year = ?) AS minimum_tax_rules,
        (SELECT COUNT(*) FROM income_exemption_rules WHERE tax_year = ?) AS income_exemption_rules,
        (SELECT COUNT(*) FROM salary_exemption_rules WHERE tax_year = ?) AS salary_exemption_rules,
        (SELECT COUNT(*) FROM tax_deduction_rules WHERE tax_year = ?) AS tax_deduction_rules,
        (SELECT COUNT(*) FROM tax_rebate_rules WHERE tax_year = ?) AS tax_rebate_rules,
        (SELECT COUNT(*) FROM surcharge_rules WHERE tax_year = ?) AS surcharge_rules,
        (SELECT COUNT(*) FROM tax_calculations WHERE tax_year = ?) AS tax_calculations,
        (SELECT COUNT(*) FROM tax_returns WHERE tax_year = ? OR assessment_year = ?) AS tax_returns,
        (SELECT COUNT(*) FROM tax_deductions WHERE tax_year = ?) AS tax_deductions
      `,
      Array(12).fill(taxYear)
    );

    const details = {
      tax_rules: Number(counts?.tax_rules || 0),
      tax_thresholds: Number(counts?.tax_thresholds || 0),
      minimum_tax_rules: Number(counts?.minimum_tax_rules || 0),
      income_exemption_rules: Number(counts?.income_exemption_rules || 0),
      salary_exemption_rules: Number(counts?.salary_exemption_rules || 0),
      tax_deduction_rules: Number(counts?.tax_deduction_rules || 0),
      tax_rebate_rules: Number(counts?.tax_rebate_rules || 0),
      surcharge_rules: Number(counts?.surcharge_rules || 0),
      tax_calculations: Number(counts?.tax_calculations || 0),
      tax_returns: Number(counts?.tax_returns || 0),
      tax_deductions: Number(counts?.tax_deductions || 0),
    };

    const total = Object.values(details).reduce((sum, n) => sum + n, 0);

    return { total, details };
  },

  // Delete tax year and all related records (cascade cleanup in atomic transaction)
  async deleteTaxYear(id, taxYear) {
    // 1. Check if the tax year is protected
    const existing = await this.getTaxYearById(id);
    if (!existing) {
      throw new Error("Tax year not found.");
    }

    if (existing.is_current === 1) {
      const err = new Error("The current active assessment year is protected. Please set another assessment year as current before deleting this year.");
      err.code = "CURRENT_YEAR_PROTECTED";
      throw err;
    }

    const targetYear = taxYear || existing.tax_year;

    // 2. Count references for reporting
    const { total, details } = await this.getReferenceCounts(targetYear);

    // 3. Perform cascade deletion inside an atomic transaction
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // a. Delete tax returns and child records (acknowledgments, details, status history)
      const [returns] = await connection.query(
        "SELECT id FROM tax_returns WHERE tax_year = ? OR assessment_year = ?",
        [targetYear, targetYear]
      );
      if (returns && returns.length > 0) {
        const returnIds = returns.map((r) => r.id);
        await connection.query(
          "DELETE FROM tax_return_acknowledgments WHERE tax_return_id IN (?)",
          [returnIds]
        );
        await connection.query(
          "DELETE FROM tax_return_details WHERE tax_return_id IN (?)",
          [returnIds]
        );
        await connection.query(
          "DELETE FROM tax_return_status_history WHERE tax_return_id IN (?)",
          [returnIds]
        );
        await connection.query(
          "DELETE FROM tax_returns WHERE tax_year = ? OR assessment_year = ?",
          [targetYear, targetYear]
        );
      }

      // b. Delete tax calculations and child records (calculation details)
      const [calcs] = await connection.query(
        "SELECT id FROM tax_calculations WHERE tax_year = ?",
        [targetYear]
      );
      if (calcs && calcs.length > 0) {
        const calcIds = calcs.map((c) => c.id);
        await connection.query(
          "DELETE FROM tax_calculation_details WHERE tax_calculation_id IN (?)",
          [calcIds]
        );
        await connection.query(
          "DELETE FROM tax_calculations WHERE tax_year = ?",
          [targetYear]
        );
      }

      // c. Delete tax deductions
      await connection.query("DELETE FROM tax_deductions WHERE tax_year = ?", [targetYear]);

      // d. Delete statutory rules
      await connection.query("DELETE FROM tax_rules WHERE tax_year = ?", [targetYear]);
      await connection.query("DELETE FROM tax_thresholds WHERE tax_year = ?", [targetYear]);
      await connection.query("DELETE FROM minimum_tax_rules WHERE tax_year = ?", [targetYear]);
      await connection.query("DELETE FROM income_exemption_rules WHERE tax_year = ?", [targetYear]);
      await connection.query("DELETE FROM salary_exemption_rules WHERE tax_year = ?", [targetYear]);
      await connection.query("DELETE FROM tax_deduction_rules WHERE tax_year = ?", [targetYear]);
      await connection.query("DELETE FROM tax_rebate_rules WHERE tax_year = ?", [targetYear]);
      await connection.query("DELETE FROM surcharge_rules WHERE tax_year = ?", [targetYear]);

      // e. Finally, delete the tax year itself
      await connection.query("DELETE FROM tax_years WHERE id = ?", [id]);

      await connection.commit();

      return {
        id,
        tax_year: targetYear,
        action: "DELETED",
        reference_count: total,
        deleted_details: details,
        message: "Tax Year and all related records deleted successfully.",
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },
};

module.exports = TaxYearModel;

