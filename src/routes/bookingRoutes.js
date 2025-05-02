const express = require("express");
const { bookParkingSpot, cancelBooking, getBookingHistory, getUserBookings } = require("../controllers/bookingController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// @route   POST /api/bookings
// @desc    Book a parking spot
// @access  Private
router.post("/", authMiddleware, bookParkingSpot);

// @route   DELETE /api/bookings/:id
// @desc    Cancel a booking & refund points
// @access  Private
router.delete("/:id", authMiddleware, cancelBooking);

// @route   GET /api/bookings/history
// @desc    Get user's booking history
// @access  Private
router.get("/history", authMiddleware, getBookingHistory);

// ✅ Missing Route: Get active bookings for logged-in user
// @route   GET /api/bookings/user
// @desc    Get active bookings for logged-in user
// @access  Private
router.get("/user", authMiddleware, getUserBookings);

module.exports = router;
