const express = require("express");
const { updateUserProfile, requestPasswordReset, resetPassword, deleteUserAccount, getUserProfile } = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// @route   PUT /api/users/profile
// @desc    Edit user profile
// @access  Private
router.put("/profile", authMiddleware, updateUserProfile);

// @route   POST /api/users/reset-password
// @desc    Request password reset (send email)
// @access  Public
router.post("/reset-password", requestPasswordReset);

// @route   PUT /api/users/reset-password/:token
// @desc    Reset password using token
// @access  Public
router.put("/reset-password/:token", resetPassword);

// @route   DELETE /api/users/delete
// @desc    Delete user account
// @access  Private
router.delete("/delete", authMiddleware, deleteUserAccount);

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get("/profile", authMiddleware, getUserProfile);

module.exports = router;
