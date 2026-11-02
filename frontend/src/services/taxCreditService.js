import axiosPublic from "@/lib/axiosPublic";

const TaxCreditService = {
  // Get all tax credits for the logged-in user
  async getMyCredits() {
    const response = await axiosPublic.get("/tax-credits");
    return response.data;
  },

  // Get credit record for a specific tax year
  async getCreditByTaxYear(taxYear) {
    if (!taxYear) {
      throw new Error("Tax year is required.");
    }
    const response = await axiosPublic.get(`/tax-credits/${taxYear}`);
    return response.data;
  },

  // Save or update tax credits for a tax year
  async saveTaxCredit(payload) {
    const response = await axiosPublic.post("/tax-credits", payload);
    return response.data;
  },

  // Delete tax credit entry
  async deleteTaxCredit(taxYear) {
    if (!taxYear) {
      throw new Error("Tax year is required.");
    }
    const response = await axiosPublic.delete(`/tax-credits/${taxYear}`);
    return response.data;
  },
};

export default TaxCreditService;

