const express = require("express");
const { 
  createParkingSpot, 
  getAllParkingSpots, 
  deleteParkingSpot, 
  getNearbyParkingSpots, 
  updateParkingSpot, 
  getUserParkingSpots
} = require("../controllers/parkingController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Create a new parking spot
// @route   POST /api/parking
// @desc    Create a new parking spot
// @access  Private (Authenticated users only)
router.post("/", authMiddleware, createParkingSpot);

// ✅ Get parking spots owned by the logged-in user
// @route   GET /api/parking/user
// @desc    Get parking spots listed by the logged-in user
// @access  Private
router.get("/user", authMiddleware, getUserParkingSpots);

// ✅ Get all available parking spots (Public)
// @route   GET /api/parking
// @desc    Get all available parking spots
// @access  Public
router.get("/", getAllParkingSpots);

// ✅ Get nearby parking spots based on location
// @route   GET /api/parking/nearby
// @desc    Get nearby parking spots based on user location
// @access  Public
router.get("/nearby", getNearbyParkingSpots);

// ✅ Delete a parking spot (Only the owner can delete)
// @route   DELETE /api/parking/:id
// @desc    Delete a parking spot (Only owner)
// @access  Private
router.delete("/:id", authMiddleware, deleteParkingSpot);

// ✅ Edit a parking spot (Only the owner can edit)
// @route   PUT /api/parking/:id
// @desc    Edit a parking spot (Only owner)
// @access  Private
router.put("/:id", authMiddleware, updateParkingSpot);

module.exports = router;
