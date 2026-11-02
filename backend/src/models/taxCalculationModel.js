const db = require("../database/query");

const TaxCalculationModel = {
  // create tax calculation
  async createCalculation(data) {
    const sql = `
            INSERT INTO tax_calculations (
                user_id,
                tax_year,
                category,
                total_income,
                total_deduction,
                taxable_income,
                eligible_investment,
                gross_tax,
                tax_rebate,
                tax_liability,
                salary_income,
                salary_exemption,
                house_property_income,
                business_income,
                capital_gain_income,
                agriculture_income,
                other_income,
                net_tax,
                minimum_tax,
                minimum_tax_rule_id,
                net_wealth,
                surcharge_rate,
                surcharge_amount,
                total_tax_payable,
                tds_amount,
                advance_tax_amount,
                final_payable,
                refund_amount,
                filing_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    const values = [
      data.user_id,
      data.tax_year,
      data.category,
      data.total_income,
      data.total_deduction,
      data.taxable_income,
      data.eligible_investment,
      data.gross_tax,
      data.tax_rebate,
      data.tax_liability,
      data.salary_income || 0,
      data.salary_exemption || 0,
      data.house_property_income || 0,
      data.business_income || 0,
      data.capital_gain_income || 0,
      data.agriculture_income || 0,
      data.other_income || 0,
      data.net_tax || 0,
      data.minimum_tax || 0,
      data.minimum_tax_rule_id || null,
      data.net_wealth || 0,
      data.surcharge_rate || 0,
      data.surcharge_amount || 0,
      data.total_tax_payable || 0,
      data.tds_amount || 0,
      data.advance_tax_amount || 0,
      data.final_payable || 0,
      data.refund_amount || 0,
      data.filing_status || "DRAFT",
    ];

    return await db.query(sql, values);
  },

  // get all calculations of user
  async getCalculationsByUserId(userId) {
    const sql = `
            SELECT
                tc.id,
                tc.user_id,
                tc.tax_year,
                tc.category,
                tc.total_income,
                tc.total_deduction,
                tc.taxable_income,
                tc.eligible_investment,
                tc.gross_tax,
                tc.tax_rebate,
                tc.tax_liability,
                tc.salary_income,
                tc.salary_exemption,
                tc.house_property_income,
                tc.business_income,
                tc.capital_gain_income,
                tc.agriculture_income,
                tc.other_income,
                tc.net_tax,
                tc.minimum_tax,
                tc.minimum_tax_rule_id,
                mtr.rule_type AS minimum_tax_rule_type,
                mtr.area_code AS minimum_tax_area,
                mtr.area_name AS minimum_tax_area_name,
                tc.net_wealth,
                tc.surcharge_rate,
                tc.surcharge_amount,
                tc.total_tax_payable,
                tc.tds_amount,
                tc.advance_tax_amount,
                tc.final_payable,
                tc.refund_amount,
                tc.filing_status,
                tc.calculated_at,
                tc.created_at,
                tc.updated_at
            FROM tax_calculations tc
            LEFT JOIN minimum_tax_rules mtr ON tc.minimum_tax_rule_id = mtr.id
            WHERE tc.user_id = ?
            ORDER BY tc.calculated_at DESC, tc.id DESC
        `;

    return await db.query(sql, [userId]);
  },

  // get single calculation
  async getCalculationById(id, userId) {
    const sql = `
            SELECT
                tc.id,
                tc.user_id,
                tc.tax_year,
                tc.category,
                tc.total_income,
                tc.total_deduction,
                tc.taxable_income,
                tc.eligible_investment,
                tc.gross_tax,
                tc.tax_rebate,
                tc.tax_liability,
                tc.salary_income,
                tc.salary_exemption,
                tc.house_property_income,
                tc.business_income,
                tc.capital_gain_income,
                tc.agriculture_income,
                tc.other_income,
                tc.net_tax,
                tc.minimum_tax,
                tc.minimum_tax_rule_id,
                mtr.rule_type AS minimum_tax_rule_type,
                mtr.area_code AS minimum_tax_area,
                mtr.area_name AS minimum_tax_area_name,
                tc.net_wealth,
                tc.surcharge_rate,
                tc.surcharge_amount,
                tc.total_tax_payable,
                tc.tds_amount,
                tc.advance_tax_amount,
                tc.final_payable,
                tc.refund_amount,
                tc.filing_status,
                tc.calculated_at,
                tc.created_at,
                tc.updated_at
            FROM tax_calculations tc
            LEFT JOIN minimum_tax_rules mtr ON tc.minimum_tax_rule_id = mtr.id
            WHERE tc.id = ?
              AND tc.user_id = ?
            LIMIT 1
        `;

    const rows = await db.query(sql, [id, userId]);

    return rows[0] || null;
  },

  // delete single calculation
  async deleteCalculation(id, userId) {
    const sql = `
      DELETE FROM tax_calculations
      WHERE id = ? AND user_id = ?
    `;

    return await db.query(sql, [id, userId]);
  },
};

module.exports = TaxCalculationModel;
