const User = require("../models/User");
const Booking = require("../models/Booking");
const ParkingSpot = require("../models/ParkingSpot");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Email Configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// @desc    Edit user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, password } = req.body;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    // Validate input
    if (!name && !email && !password) {
      return res.status(400).json({ message: "❌ At least one field must be updated" });
    }

    // Update only provided fields
    if (name) user.name = name;
    if (email) user.email = email;

    // If password is being updated, hash it before saving
    if (password) {
        user.password = password;
    }

    await user.save();

    res.json({
      message: "✅ Profile updated successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "❌ Server error", error: error.message });
  }
};

// @desc    Request password reset
// @route   POST /api/users/reset-password
// @access  Public
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "❌ Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "❌ User with this email does not exist" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    // Send reset link via email
    const resetLink = `http://localhost:5000/api/users/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Request",
      text: `Click the following link to reset your password: ${resetLink}\n\nThis link expires in 1 hour.`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "✅ Password reset email sent! Please check your inbox." });
  } catch (error) {
    res.status(500).json({ message: "❌ Server error", error: error.message });
  }
};

// @desc    Reset password using token
// @route   PUT /api/users/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "❌ New password is required" });
    }

    // Hash the token and find user
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "❌ Invalid or expired reset token" });
    }

    // Hash new password
    user.password = newPassword;


    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "✅ Password has been reset successfully!" });
  } catch (error) {
    res.status(500).json({ message: "❌ Server error", error: error.message });
  }
};

const deleteUserAccount = async (req, res) => {
    try {
      const userId = req.user.id;
      const { password } = req.body;
  
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "❌ User not found" });
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "❌ Incorrect password" });
  
      // 1. Handle spots owned by user
      const ownedSpots = await ParkingSpot.find({ owner: userId });
      for (const spot of ownedSpots) {
        const spotBookings = await Booking.find({ parkingSpot: spot._id, status: { $ne: "canceled" } });
        for (const booking of spotBookings) {
          // Refund the booking user
          const booker = await User.findById(booking.user);
          if (booker) {
            booker.parkPoints += spot.price;
            await booker.save();
          }
  
          // Remove booking
          await booking.deleteOne();
        }
  
        // Remove spot
        await spot.deleteOne();
      }
  
      // 2. Handle bookings made by the user (and refund the owners)
      const userBookings = await Booking.find({ user: userId, status: { $ne: "canceled" } });
      for (const booking of userBookings) {
        const spot = await ParkingSpot.findById(booking.parkingSpot);
        if (spot) {
          const owner = await User.findById(spot.owner);
          if (owner) {
            owner.parkPoints -= spot.price;
            await owner.save();
          }
  
          // Mark spot as available again
          spot.availability = true;
          await spot.save();
        }
  
        await booking.deleteOne();
      }
  
      // 3. Delete user
      await user.deleteOne();
  
      res.json({ message: "✅ Account and all associated data deleted with refunds." });
  
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "❌ Server error", error: error.message });
    }
  };
  

const getUserProfile = async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("-password");
      if (!user) {
        return res.status(404).json({ message: "❌ User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "❌ Server error", error: error.message });
    }
  };

module.exports = { 
  updateUserProfile, 
  requestPasswordReset, 
  resetPassword, 
  deleteUserAccount,
  getUserProfile 
};
