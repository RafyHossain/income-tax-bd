const bcrypt = require("bcrypt");
const validator = require("validator");
const jwt = require("jsonwebtoken");

const UserModel = require("../models/UserModel");
const TaxpayerProfileModel = require("../models/taxpayerProfileModel");

const UserController = {
  async getUserByEmail(req, res) {
    try {
      const email = req.params.email;

      const user = await UserModel.findByEmail(email);

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async getUserByPhone(req, res) {
    try {
      const phone = req.params.phone;

      const user = await UserModel.findByphone(phone);

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async registerUser(req, res) {
    try {
      const { full_name, email, password, phone, nid, tin_number } = req.body;

      if (!full_name || !email || !password || !phone || !nid) {
        return res.status(400).json({
          success: false,
          message: "All fields are required.",
        });
      }

      if (tin_number === undefined || tin_number === null || String(tin_number).trim() === "") {
        return res.status(400).json({
          success: false,
          message: "e-TIN number is required.",
        });
      }

      const cleanTin = String(tin_number).trim();
      const tinRegex = /^[0-9]{12}$/;
      if (!tinRegex.test(cleanTin)) {
        return res.status(400).json({
          success: false,
          message: "e-TIN must contain exactly 12 digits.",
        });
      }

      if (!validator.isEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Email",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters.",
        });
      }

      const existingUser = await UserModel.findByEmail(email);

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already exists.",
        });
      }

      const existingPhone = await UserModel.findByphone(phone);

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: "Phone number already registered.",
        });
      }

      const existingNid = await UserModel.findByNid(nid);

      if (existingNid) {
        return res.status(409).json({
          success: false,
          message: "NID already registered.",
        });
      }

      const existingTin = await TaxpayerProfileModel.findByTin(cleanTin);

      if (existingTin) {
        return res.status(409).json({
          success: false,
          message: "This e-TIN number is already registered.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await UserModel.createWithProfile({
        full_name,
        email,
        password: hashedPassword,
        phone,
        nid,
        tin_number: cleanTin,
      });

      return res.status(201).json({
        success: true,
        message: "User registered successfully.",
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY" || error.errno === 1062) {
        const errorMsg = error.message || "";
        if (errorMsg.includes("tin_number") || errorMsg.includes("uk_taxpayer_profiles_tin")) {
          return res.status(409).json({
            success: false,
            message: "This e-TIN number is already registered.",
          });
        }
        if (errorMsg.includes("email")) {
          return res.status(409).json({
            success: false,
            message: "Email already exists.",
          });
        }
        if (errorMsg.includes("phone")) {
          return res.status(409).json({
            success: false,
            message: "Phone number already registered.",
          });
        }
        if (errorMsg.includes("nid")) {
          return res.status(409).json({
            success: false,
            message: "NID already registered.",
          });
        }
        return res.status(409).json({
          success: false,
          message: "Duplicate entry conflict.",
        });
      }

      console.error("Register Error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  },

  async loginUser(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required.",
        });
      }

      const user = await UserModel.findByEmail(email);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      const isPasswordCorrect = await bcrypt.compare(password, user.password);

      if (!isPasswordCorrect) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      const payload = {
        id: user.id,
        role: user.role,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      return res.status(200).json({
        success: true,
        message: "Login successful.",
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login Error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  },

  async getProfile(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      // Generate refreshed token with current database role
      const payload = {
        id: user.id,
        role: user.role,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      return res.status(200).json({
        success: true,
        data: user,
        token,
      });
    } catch (error) {
      console.error("Get Profile Error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  },
};

module.exports = UserController;
