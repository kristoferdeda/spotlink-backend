const express = require("express");
const { registerUser, loginUser, verifyEmail } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register new user
router.post("/register", registerUser);

// @route   GET /api/auth/verify/:token
// @desc    Verify user email
router.get("/verify/:token", verifyEmail);

// @route   POST /api/auth/login
// @desc    Login user
router.post("/login", loginUser);

// @route   GET /api/auth/profile
// @desc    Get user profile (Protected)
router.get("/profile", authMiddleware, (req, res) => {
  res.json({ message: "✅ Profile data accessed", user: req.user });
});

module.exports = router;
