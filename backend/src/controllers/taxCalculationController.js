const TaxCalculationService =
  require("../services/taxCalculationService");

const TaxCalculationController = {

  // calculate tax
  // post /api/tax-calculations

  async calculateTax(req, res) {
    try {

      const userId = req.user.id;

      const tax_year = req.body?.tax_year || req.body?.taxYear;

      const result =
        await TaxCalculationService.calculateTax(
          userId,
          tax_year
        );

      return res.status(201).json({
        success: true,
        message: "Tax calculated successfully",
        data: result,
      });

    } catch (error) {

      // validation / client errors

      if (
        error.code === "FILING_HISTORY_UNAVAILABLE" ||
        error.code === "MISSING_AREA" ||
        error.code === "INACTIVE_RULE" ||
        error.code === "EXPIRED_RULE" ||
        error.code === "CONFLICTING_RULES" ||
        error.code === "RULE_NOT_FOUND" ||
        error.message.startsWith("Minimum tax rule") ||
        error.message.startsWith("Return filing history") ||
        error.message.startsWith("Taxpayer minimum tax area")
      ) {
        return res.status(400).json({
          success: false,
          code: error.code || "MINIMUM_TAX_ERROR",
          message: error.message,
          classificationStatus: error.classificationStatus || null,
        });
      }

      const clientErrorMessages = [

        "Tax year is required",

        "Invalid tax year format",

        "Invalid tax year range",

        "Taxpayer profile not found",

        "Invalid disabled child dependent count",

        "Invalid total income",

        "Failed to create tax calculation",

      ];


      // exact / prefix error match

      if (
        clientErrorMessages.some(
          (message) =>
            error.message === message ||
            error.message.startsWith(message)
        )
      ) {


        if (
          error.message ===
          "Taxpayer profile not found"
        ) {

          return res.status(404).json({
            success: false,
            message: error.message,
          });
        }


        // everything else

        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }


      // tax rule / threshold / rebate configuration errors

      if (
        error.message.startsWith(
          "No active tax rules"
        ) ||

        error.message.startsWith(
          "No active tax rebate rules"
        ) ||

        error.message.startsWith(
          "Tax threshold not found"
        ) ||

        error.message.startsWith(
          "Tax rebate rule"
        ) ||

        error.message.startsWith(
          "Invalid tax rule"
        ) ||

        error.message.startsWith(
          "Invalid rebate"
        ) ||

        error.message.startsWith(
          "Invalid INVESTMENT"
        ) ||

        error.message.startsWith(
          "Duplicate active tax rebate rule"
        ) ||

        error.message.startsWith(
          "Tax rules overlap"
        )
      ) {

        console.error(
          "Tax Configuration Error:",
          error.message
        );

        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }


      // server error

      console.error(
        "Tax Calculation Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },


  // get all calculations
  // get /api/tax-calculations

  async getCalculations(req, res) {
    try {

      const userId =
        req.user.id;

      const calculations =
        await TaxCalculationService
          .getCalculations(userId);

      return res.status(200).json({
        success: true,
        message:
          "Tax calculations fetched successfully",
        data: calculations,
      });

    } catch (error) {

      console.error(
        "Get Tax Calculations Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Internal server error",
      });
    }
  },


  // get single calculation
  // get /api/tax-calculations/:id

  async getCalculationById(req, res) {
    try {

      const userId =
        req.user.id;

      const calculationId =
        Number(req.params.id);


      // validate id

      if (
        !Number.isInteger(calculationId) ||
        calculationId <= 0
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Invalid calculation ID",
        });
      }


      // get calculation + details

      const calculation =
        await TaxCalculationService
          .getCalculationById(
            calculationId,
            userId
          );


      // not found

      if (!calculation) {

        return res.status(404).json({
          success: false,
          message:
            "Tax calculation not found",
        });
      }


      // success

      return res.status(200).json({
        success: true,
        message:
          "Tax calculation fetched successfully",
        data: calculation,
      });

    } catch (error) {

      console.error(
        "Get Tax Calculation By ID Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Internal server error",
      });
    }
  },

  // delete calculation
  // delete /api/tax-calculations/:id
  async deleteCalculation(req, res) {
    try {
      const userId = req.user.id;
      const calculationId = Number(req.params.id);

      if (!Number.isInteger(calculationId) || calculationId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid calculation ID",
        });
      }

      const deleted = await TaxCalculationService.deleteCalculation(
        calculationId,
        userId
      );

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Tax calculation not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Tax calculation deleted successfully",
      });
    } catch (error) {
      console.error("Delete Tax Calculation Error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
};


// export

module.exports =
  TaxCalculationController;