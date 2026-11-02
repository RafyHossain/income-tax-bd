const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const incomeRoutes = require("./routes/incomeRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const financialRoutes = require("./routes/financialRoutes");
const taxRuleRoutes = require("./routes/taxRuleRoutes");
const taxpayerProfileRoutes = require("./routes/taxpayerProfileRoutes");
const taxCalculationRoutes = require("./routes/taxCalculationRoutes");
const taxCalculationDetailRoutes = require("./routes/taxCalculationDetailRoutes");
const taxDeductionRuleRoutes = require("./routes/taxDeductionRuleRoutes");
const taxDeductionRoutes = require("./routes/taxDeductionRoutes");
const minimumTaxRuleRoutes = require("./routes/minimumTaxRuleRoutes");
const taxThresholdRoutes = require("./routes/taxThresholdRoutes");
const taxRebateRuleRoutes = require("./routes/taxRebateRuleRoutes");
const surchargeRuleRoutes = require("./routes/surchargeRuleRoutes");
const salaryExemptionRuleRoutes = require("./routes/salaryExemptionRuleRoutes");
const taxYearRoutes = require("./routes/taxYearRoutes");
const incomeExemptionRuleRoutes = require("./routes/incomeExemptionRuleRoutes");
const taxReturnRoutes = require("./routes/taxReturnRoutes");
const refundRoutes = require("./routes/refundRoutes");
const taxCreditRoutes = require("./routes/taxCreditRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:5173",
    ],
    credentials: true,
  }),
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Income Tax Calculation API Running",
  });
});

app.use("/api/auth", userRoutes);
app.use("/api/income", incomeRoutes);
app.use("/api/expense", expenseRoutes);
app.use("/api/financial", financialRoutes);
app.use("/api/tax-rules", taxRuleRoutes);
app.use("/api/taxpayer-profiles", taxpayerProfileRoutes);
app.use("/api/tax-calculations", taxCalculationRoutes);
app.use("/api/tax-calculation-details", taxCalculationDetailRoutes);
app.use("/api/tax-deduction-rules", taxDeductionRuleRoutes);
app.use("/api/tax-deductions", taxDeductionRoutes);
app.use("/api/minimum-tax-rules", minimumTaxRuleRoutes);
app.use("/api/tax-thresholds", taxThresholdRoutes);
app.use("/api/tax-rebate-rules", taxRebateRuleRoutes);
app.use("/api/surcharge-rules", surchargeRuleRoutes);
app.use("/api/salary-exemption-rules", salaryExemptionRuleRoutes);
app.use("/api/tax-years", taxYearRoutes);
app.use("/api/income-exemption-rules", incomeExemptionRuleRoutes);
app.use("/api/tax-returns", taxReturnRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api/tax-credits", taxCreditRoutes);
app.use("/api/admin", adminRoutes);

module.exports = app;
