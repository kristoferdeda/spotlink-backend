const Booking = require("../models/Booking");
const ParkingSpot = require("../models/ParkingSpot");
const User = require("../models/User");

// @desc    Book a parking spot
// @route   POST /api/bookings
// @access  Private
const bookParkingSpot = async (req, res) => {
    try {
        const { parkingSpotId } = req.body;
        const userId = req.user.id;

        if (!parkingSpotId) {
            return res.status(400).json({ message: "❌ Parking spot ID is required" });
        }

        // Check if the parking spot exists
        const parkingSpot = await ParkingSpot.findById(parkingSpotId).populate("owner");
        if (!parkingSpot) {
            return res.status(404).json({ message: "❌ Parking spot not found" });
        }

        // Prevent owner from booking their own spot
        if (parkingSpot.owner._id.toString() === userId) {
            return res.status(403).json({ message: "❌ You cannot book your own spot" });
        }

        // Check if the spot is already booked (available: false)
        if (!parkingSpot.availability) {
            return res.status(400).json({ message: "❌ This parking spot is already booked" });
        }

        // Check if user has already booked this spot
        const existingBooking = await Booking.findOne({ user: userId, parkingSpot: parkingSpotId, status: "active" });
        if (existingBooking) {
            return res.status(400).json({ message: "❌ You have already booked this spot" });
        }

        // Check if user has enough Park Points
        const user = await User.findById(userId);
        if (user.parkPoints < parkingSpot.price) {
            return res.status(400).json({ message: "❌ Insufficient Park Points" });
        }

        // Deduct Park Points from booking user
        user.parkPoints -= parkingSpot.price;
        await user.save();

        // Credit Park Points to the spot owner
        const owner = await User.findById(parkingSpot.owner._id);
        owner.parkPoints += parkingSpot.price;
        await owner.save();

        // Mark the parking spot as unavailable
        parkingSpot.availability = false;
        await parkingSpot.save();

        // Create booking with snapshot of parking spot details
        const newBooking = await Booking.create({
            user: userId,
            parkingSpot: parkingSpotId,
            parkingSpotSnapshot: {
                address: parkingSpot.address,
                location: parkingSpot.location,
                price: parkingSpot.price,
                owner: parkingSpot.owner,
            },
        });

        res.status(201).json({ message: "✅ Booking successful!", booking: newBooking });

    } catch (error) {
        res.status(500).json({ message: "❌ Server error", error: error.message });
    }
};



// @desc    Cancel a booking & refund points
// @route   DELETE /api/bookings/:id
// @access  Private
const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Find booking
        const booking = await Booking.findById(id).populate("parkingSpot");
        if (!booking) {
            return res.status(404).json({ message: "❌ Booking not found" });
        }

        // Ensure only the user who booked can cancel
        if (booking.user.toString() !== userId) {
            return res.status(403).json({ message: "❌ You are not authorized to cancel this booking" });
        }

        // Check if booking is already canceled
        if (booking.status === "canceled") {
            return res.status(400).json({ message: "❌ Booking is already canceled" });
        }

        // Refund Park Points to the user
        const user = await User.findById(userId);
        user.parkPoints += booking.parkingSpot.price;
        await user.save();

        // Deduct Park Points from the owner
        const owner = await User.findById(booking.parkingSpot.owner);
        owner.parkPoints -= booking.parkingSpot.price;
        await owner.save();

        // Mark booking as canceled
        booking.status = "canceled";
        await booking.save();

        // Mark the parking spot as available again
        booking.parkingSpot.availability = true;
        await booking.parkingSpot.save();

        res.json({ message: "✅ Booking canceled and Park Points refunded", booking });

    } catch (error) {
        res.status(500).json({ message: "❌ Server error", error: error.message });
    }
};



// @desc    Get user's booking history
// @route   GET /api/bookings/history
// @access  Private
const getBookingHistory = async (req, res) => {
    try {
      const userId = req.user.id;
  
      // Fetch all bookings for the authenticated user
      const bookings = await Booking.find({ user: userId })
        .sort({ bookedAt: -1 })
        .populate("parkingSpot", "address location price owner")
        .populate("parkingSpotSnapshot.owner", "name email");
  
      res.json({ message: "✅ Booking history fetched!", bookings });
    } catch (error) {
      res.status(500).json({ message: "❌ Server error", error: error.message });
    }
  };

const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    
// Only return non-canceled bookings
    const bookings = await Booking.find({ user: req.user.id, status: { $ne: "canceled" } })
    .populate("parkingSpot");

    res.json({ message: "✅ Active bookings fetched!", bookings });
  } catch (error) {
    console.error("❌ Error fetching user bookings:", error);
    res.status(500).json({ message: "❌ Server error" });
  }
};

module.exports = { bookParkingSpot, cancelBooking, getBookingHistory, getUserBookings };
