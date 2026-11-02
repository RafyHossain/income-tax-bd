const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const TaxCreditController = require("../controllers/taxCreditController");

const router = express.Router();

router.use(verifyToken);

router.get("/", TaxCreditController.getMyCredits);
router.get("/:taxYear", TaxCreditController.getCreditByYear);
router.post("/", TaxCreditController.saveCredit);
router.delete("/:taxYear", TaxCreditController.deleteCredit);

module.exports = router;

