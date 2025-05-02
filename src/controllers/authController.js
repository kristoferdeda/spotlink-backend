const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// @desc    Register new user & send verification email
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check for required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "❌ All fields are required" });
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[.@$!%*?&])[A-Za-z\d.@$!%*?&]{8,}$/;


    // Enforce strong password policy
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "❌ Password must be at least 8 characters long and include at least one letter, one number, and one special character (.@$!%*?&).",
      });
    }    

    // Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "❌ Email is already in use" });
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create new user with token
    const newUser = await User.create({
      name,
      email,
      password,
      verificationToken,
    });

    // Prepare email verification link
    const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
    const verificationLink = `${BASE_URL}/api/auth/verify/${verificationToken}`;

    // Send verification email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify Your Email - SpotLink",
      html: `
        <h2>Welcome to SpotLink!</h2>
        <p>Click the link below to verify your email:</p>
        <a href="${verificationLink}" target="_blank">Verify Email</a>
      `,
    });

    res.status(201).json({
      message: "✅ Registration successful! Check your email for verification.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "❌ Server error", error: error.message });
  }
};


// @desc    Verify user email
// @route   GET /api/auth/verify/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });

    if (!user) {
      return res.status(400).json({ message: "❌ Invalid or expired token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: "✅ Email verified successfully! You can now log in." });
  } catch (error) {
    res.status(500).json({ message: "❌ Server error", error: error.message });
  }
};

// @desc    Login user & check verification
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "❌ Email and password are required" });

      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: "❌ Invalid credentials" });

      // Prevent login if email is not verified
      if (!user.isVerified) {
        return res.status(401).json({ message: "❌ Email not verified. Please check your email." });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "❌ Invalid credentials" });

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

      res.json({
        message: "✅ Login successful!",
        user: { id: user._id, name: user.name, email: user.email },
        token
      });

    } catch (error) {
      res.status(500).json({ message: "❌ Server error", error: error.message });
    }
};

module.exports = { registerUser, verifyEmail, loginUser };
