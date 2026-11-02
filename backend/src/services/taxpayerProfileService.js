const TaxpayerProfileModel = require("../models/taxpayerProfileModel");
const MinimumTaxRuleModel = require("../models/minimumTaxRuleModel");

const TaxpayerProfileService = {

  async createProfile(userId, data) {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const profileData = await this.validateProfileData(data);

    const exists = await TaxpayerProfileModel.profileExists(userId);

    if (exists) {
      throw new Error("Taxpayer profile already exists");
    }

    if (profileData.tin_number) {
      const duplicateTin = await TaxpayerProfileModel.findByTin(profileData.tin_number);
      if (duplicateTin) {
        throw new Error("This e-TIN number is already registered.");
      }
    }

    return await TaxpayerProfileModel.createProfile({
      user_id: userId,
      tin_number: profileData.tin_number || null,
      date_of_birth: profileData.date_of_birth,
      gender: profileData.gender,
      minimum_tax_area: profileData.minimum_tax_area,
      is_new_taxpayer: profileData.is_new_taxpayer,
      is_physically_challenged: profileData.is_physically_challenged,
      disabled_child_dependents: profileData.disabled_child_dependents,
      is_freedom_fighter: profileData.is_freedom_fighter,
      is_july_warrior: profileData.is_july_warrior,
      net_wealth: profileData.net_wealth,
      has_multiple_motor_vehicles: profileData.has_multiple_motor_vehicles,
      has_large_house_property: profileData.has_large_house_property,
      tds_amount: profileData.tds_amount,
      advance_tax_amount: profileData.advance_tax_amount,
    });
  },


  async getProfile(userId) {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const rows = await TaxpayerProfileModel.getProfileByUserId(userId);
    if (rows && rows.length > 0) {
      const TaxCalculationService = require("./taxCalculationService");
      const category = TaxCalculationService.determineCategory(rows[0], new Date());
      rows[0].taxpayer_category = category;
      rows[0].category = category;
    }
    return rows;
  },


  async updateProfile(userId, data) {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const profileData = await this.validateProfileData(data);

    const exists = await TaxpayerProfileModel.profileExists(userId);

    if (!exists) {
      throw new Error("Taxpayer profile not found");
    }

    if (profileData.tin_number) {
      const duplicateTin = await TaxpayerProfileModel.findByTinExcludeUser(profileData.tin_number, userId);
      if (duplicateTin) {
        throw new Error("This e-TIN number is already registered.");
      }
    }

    return await TaxpayerProfileModel.updateProfile(userId, profileData);
  },


  async validateProfileData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Profile data is required");
    }

    let tinNumber = undefined;
    if (data.tin_number !== undefined && data.tin_number !== null && String(data.tin_number).trim() !== "") {
      tinNumber = String(data.tin_number).trim();
      const tinRegex = /^[0-9]{12}$/;
      if (!tinRegex.test(tinNumber)) {
        throw new Error("e-TIN must contain exactly 12 digits.");
      }
    }

    if (
      data.date_of_birth === undefined ||
      data.date_of_birth === null ||
      String(data.date_of_birth).trim() === ""
    ) {
      throw new Error("Date of birth is required");
    }

    const dateOfBirth = new Date(data.date_of_birth);

    if (Number.isNaN(dateOfBirth.getTime())) {
      throw new Error("Invalid date of birth");
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    dateOfBirth.setHours(0, 0, 0, 0);

    if (dateOfBirth > today) {
      throw new Error("Date of birth cannot be in the future");
    }


    let gender = (data.gender !== undefined && data.gender !== null)
      ? String(data.gender).trim().toUpperCase()
      : "";

    // Sync gender & flags if taxpayer_category is provided
    if (data.taxpayer_category) {
      const category = String(data.taxpayer_category).trim().toUpperCase();
      if (category === "WOMEN") {
        gender = "FEMALE";
      } else if (category === "THIRD_GENDER") {
        gender = "THIRD_GENDER";
      } else if (category === "GENERAL" && gender === "FEMALE") {
        gender = "MALE";
      }

      if (category === "WAR_WOUNDED_FREEDOM_FIGHTER") {
        data.is_freedom_fighter = true;
        data.is_july_warrior = false;
        data.is_physically_challenged = false;
      } else if (category === "JULY_WARRIOR") {
        data.is_july_warrior = true;
        data.is_freedom_fighter = false;
        data.is_physically_challenged = false;
      } else if (category === "PHYSICALLY_CHALLENGED") {
        data.is_physically_challenged = true;
        data.is_freedom_fighter = false;
        data.is_july_warrior = false;
      } else if (["GENERAL", "WOMEN", "SENIOR_CITIZEN", "THIRD_GENDER"].includes(category)) {
        data.is_freedom_fighter = false;
        data.is_july_warrior = false;
        data.is_physically_challenged = false;
      }

      if (category === "SENIOR_CITIZEN") {
        const dob = new Date(data.date_of_birth);
        const refToday = new Date();
        let age = refToday.getFullYear() - dob.getFullYear();
        const mDiff = refToday.getMonth() - dob.getMonth();
        if (mDiff < 0 || (mDiff === 0 && refToday.getDate() < dob.getDate())) {
          age--;
        }
        if (age < 65) {
          throw new Error("Senior Citizen category requires age 65 or above");
        }
      }
    }

    if (!gender) {
      throw new Error("Gender is required");
    }

    const allowedGenders = [
      "MALE",
      "FEMALE",
      "THIRD_GENDER",
    ];

    if (!allowedGenders.includes(gender)) {
      throw new Error(
        "Invalid gender. Allowed values are MALE, FEMALE and THIRD_GENDER.",
      );
    }

    // database driven area check with graceful fallback
    const minimumTaxArea =
      data.minimum_tax_area === undefined ||
        data.minimum_tax_area === null ||
        String(data.minimum_tax_area).trim() === ""
        ? "OTHER_AREA"
        : String(data.minimum_tax_area).trim().toUpperCase();

    const isNewTaxpayer =
      data.is_new_taxpayer === true ||
      data.is_new_taxpayer === 1 ||
      data.is_new_taxpayer === "true" ||
      data.is_new_taxpayer === "1";

    // physically challenged
    if (typeof data.is_physically_challenged !== "boolean") {
      data.is_physically_challenged = Boolean(data.is_physically_challenged);
    }

    const disabledChildDependents =
      data.disabled_child_dependents === undefined ||
        data.disabled_child_dependents === null ||
        data.disabled_child_dependents === ""
        ? 0
        : Number(data.disabled_child_dependents);

    if (
      !Number.isInteger(disabledChildDependents) ||
      disabledChildDependents < 0
    ) {
      throw new Error(
        "disabled_child_dependents must be a non-negative integer",
      );
    }

    // freedom fighter
    if (typeof data.is_freedom_fighter !== "boolean") {
      data.is_freedom_fighter = Boolean(data.is_freedom_fighter);
    }

    // july warrior
    if (typeof data.is_july_warrior !== "boolean") {
      data.is_july_warrior = Boolean(data.is_july_warrior);
    }

    // net wealth
    const netWealth =
      data.net_wealth === undefined ||
      data.net_wealth === null ||
      data.net_wealth === ""
        ? 0
        : Math.max(0, Number(data.net_wealth));

    if (!Number.isFinite(netWealth)) {
      throw new Error("net_wealth must be a valid number");
    }

    // surcharge triggers
    const hasMultipleMotorVehicles =
      data.has_multiple_motor_vehicles === true ||
      data.has_multiple_motor_vehicles === 1 ||
      data.has_multiple_motor_vehicles === "true" ||
      data.has_multiple_motor_vehicles === "1";

    const hasLargeHouseProperty =
      data.has_large_house_property === true ||
      data.has_large_house_property === 1 ||
      data.has_large_house_property === "true" ||
      data.has_large_house_property === "1";

    // tax credits: TDS & Advance Tax
    const tdsAmount =
      data.tds_amount === undefined
        ? undefined
        : data.tds_amount === null || data.tds_amount === ""
          ? 0
          : Math.max(0, Number(data.tds_amount));

    if (tdsAmount !== undefined && !Number.isFinite(tdsAmount)) {
      throw new Error("tds_amount must be a valid number");
    }

    const advanceTaxAmount =
      data.advance_tax_amount === undefined
        ? undefined
        : data.advance_tax_amount === null || data.advance_tax_amount === ""
          ? 0
          : Math.max(0, Number(data.advance_tax_amount));

    if (advanceTaxAmount !== undefined && !Number.isFinite(advanceTaxAmount)) {
      throw new Error("advance_tax_amount must be a valid number");
    }

    // return validated data
    return {
      tin_number: tinNumber,
      date_of_birth: data.date_of_birth,
      gender: gender,
      minimum_tax_area: minimumTaxArea,
      is_new_taxpayer: isNewTaxpayer,
      filing_history_status: isNewTaxpayer ? "FIRST_TIME_FILER" : "PREVIOUS_FILER",
      filing_history_verified: 1,
      is_physically_challenged: data.is_physically_challenged,
      disabled_child_dependents: disabledChildDependents,
      is_freedom_fighter: data.is_freedom_fighter,
      is_july_warrior: data.is_july_warrior,
      net_wealth: netWealth,
      has_multiple_motor_vehicles: hasMultipleMotorVehicles,
      has_large_house_property: hasLargeHouseProperty,
      tds_amount: tdsAmount,
      advance_tax_amount: advanceTaxAmount,
    };
  },
};

module.exports = TaxpayerProfileService;
