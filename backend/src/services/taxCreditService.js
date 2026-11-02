const TaxCreditModel = require("../models/taxCreditModel");

const TaxCreditService = {
  // Get all credits for user
  async getMyCredits(userId) {
    if (!userId) {
      throw new Error("User ID is required.");
    }
    return await TaxCreditModel.findByUserId(userId);
  },

  // Get credit for a specific year
  async getCreditByYear(userId, taxYear) {
    if (!userId || !taxYear) {
      throw new Error("User ID and tax year are required.");
    }
    const record = await TaxCreditModel.findByUserAndYear(userId, taxYear);
    if (!record) {
      return {
        user_id: userId,
        tax_year: taxYear,
        tds_amount: "0.00",
        advance_tax_amount: "0.00",
        total_tax_credits: "0.00",
        challan_number: null,
        description: null,
      };
    }
    return record;
  },

  // Save or update tax credits
  async saveCredit(userId, data) {
    if (!userId) {
      throw new Error("User ID is required.");
    }

    const { tax_year, tds_amount, advance_tax_amount, challan_number, description } = data;

    if (!tax_year || !/^\d{4}-\d{2}$/.test(String(tax_year).trim())) {
      throw new Error("Valid tax year (YYYY-YY) is required.");
    }

    const tds = Number(tds_amount || 0);
    const advance = Number(advance_tax_amount || 0);

    if (!Number.isFinite(tds) || tds < 0) {
      throw new Error("TDS amount must be a non-negative number.");
    }

    if (!Number.isFinite(advance) || advance < 0) {
      throw new Error("Advance tax amount must be a non-negative number.");
    }

    return await TaxCreditModel.upsert(userId, {
      tax_year: String(tax_year).trim(),
      tds_amount: tds,
      advance_tax_amount: advance,
      challan_number: challan_number ? String(challan_number).trim() : null,
      description: description ? String(description).trim() : null,
    });
  },

  // Delete credit for tax year
  async deleteCredit(userId, taxYear) {
    if (!userId || !taxYear) {
      throw new Error("User ID and tax year are required.");
    }
    return await TaxCreditModel.deleteByUserAndYear(userId, taxYear);
  },
};

module.exports = TaxCreditService;

