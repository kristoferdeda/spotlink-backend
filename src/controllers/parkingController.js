const axios = require("axios");
const ParkingSpot = require("../models/ParkingSpot");
const Booking = require("../models/Booking");

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

// @desc    Create a new parking spot
// @route   POST /api/parking
// @access  Private
const createParkingSpot = async (req, res) => {
  try {
    const { description, price, location } = req.body;

    if (!location || !price) {
      return res.status(400).json({ message: "❌ Price is required" });
    }

    // Optionally reverse geocode to get address (if needed)
    let address = "Unknown Address";
    if (GOOGLE_MAPS_API_KEY && location.coordinates?.length === 2) {
      const [lng, lat] = location.coordinates;
      const geoRes = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            latlng: `${lat},${lng}`,
            key: GOOGLE_MAPS_API_KEY,
          },
        }
      );

      if (geoRes.data.results.length) {
        address = geoRes.data.results[0].formatted_address;
      }
    }

    const newSpot = await ParkingSpot.create({
      owner: req.user.id,
      address,
      location,
      description: description || "No description provided",
      price,
    });

    res.status(201).json({ message: "✅ Parking spot added!", parkingSpot: newSpot });
  } catch (error) {
    res.status(500).json({ message: "❌ Server error", error: error.message });
  }
};


// @desc    Get all available parking spots
// @route   GET /api/parking
// @access  Public
const getAllParkingSpots = async (req, res) => {
  try {
    const spots = await ParkingSpot.find({ availability: { $ne: false } }).populate("owner", "name email");

    res.json({ message: "✅ Available parking spots fetched!", spots });
  } catch (error) {
    res.status(500).json({ message: "❌ Server error", error: error.message });
  }
};

// @desc    Delete a parking spot (Only owner can delete)
// @route   DELETE /api/parking/:id
// @access  Private
const deleteParkingSpot = async (req, res) => {
  try {
    const spotId = req.params.id;

    // Fetch the spot
    const spot = await ParkingSpot.findById(spotId);
    if (!spot) {
      return res.status(404).json({ message: "❌ Parking spot not found" });
    }


    // Check ownership
    if (!req.user || String(spot.owner) !== String(req.user.id)) {
      return res.status(403).json({ message: "❌ Not authorized to delete this spot" });
    }

    // Clean up any bookings associated with this spot
    await Booking.deleteMany({ parkingSpot: spot._id });

    // Delete the spot
    await spot.deleteOne();

    res.json({ message: "✅ Parking spot deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "❌ Server error", error: error.message });
  }
};

// @desc    Get parking spots near a location
// @route   GET /api/parking/nearby?lat=40.7128&lng=-74.0060&radius=5000
// @access  Public
const getNearbyParkingSpots = async (req, res) => {
  try {
    let { lat, lng, radius } = req.query;

    // Ensure latitude and longitude are numbers
    lat = parseFloat(lat);
    lng = parseFloat(lng);
    radius = parseInt(radius);

    if (Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radius)) {
      return res.status(400).json({ message: "❌ Invalid latitude, longitude, or radius." });
    }

    const spots = await ParkingSpot.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radius,
        },
      },
    });

    res.json({ message: "✅ Nearby parking spots found!", spots });
  } catch (error) {
    res.status(500).json({ message: "❌ Server error", error: error.message });
  }
};

// @desc    Edit a parking spot (Only owner can edit)
// @route   PUT /api/parking/:id
// @access  Private
const updateParkingSpot = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { address, description, price } = req.body;

    // Find parking spot
    const parkingSpot = await ParkingSpot.findById(id);

    if (!parkingSpot) {
      return res.status(404).json({ message: "❌ Parking spot not found" });
    }

    // Ensure only the owner can edit
    if (parkingSpot.owner.toString() !== userId) {
      return res.status(403).json({ message: "❌ You are not authorized to edit this spot" });
    }

    // Validate at least one field is provided
    if (!address && !description && !price) {
      return res.status(400).json({ message: "❌ At least one field must be updated" });
    }

    // If address is being updated, fetch new lat/lng
    if (address) {
      const geoResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            address,
            key: GOOGLE_MAPS_API_KEY,
          },
        }
      );

      if (!geoResponse.data.results.length) {
        return res.status(400).json({ message: "❌ Invalid address. Unable to geocode." });
      }

      const { lat, lng } = geoResponse.data.results[0].geometry.location;
      parkingSpot.address = address;
      parkingSpot.location = {
        type: "Point",
        coordinates: [lng, lat],
      };
    }

    // Update only provided fields
    if (description) parkingSpot.description = description;
    if (price) parkingSpot.price = price;

    await parkingSpot.save();

    res.json({ message: "✅ Parking spot updated successfully!", parkingSpot });
  } catch (error) {
    res.status(500).json({ message: "❌ Server error", error: error.message });
  }
};


// Get parking spots owned by the logged-in user
const getUserParkingSpots = async (req, res) => {
  try {
    const userId = req.user.id;
    const spots = await ParkingSpot.find({ owner: userId });

    res.json({ message: "✅ User's parking spots fetched!", spots });
  } catch (error) {
    console.error("❌ Error fetching user parking spots:", error);
    res.status(500).json({ message: "❌ Server error" });
  }
};

module.exports = { createParkingSpot, getNearbyParkingSpots, getAllParkingSpots, deleteParkingSpot, updateParkingSpot, getUserParkingSpots };
