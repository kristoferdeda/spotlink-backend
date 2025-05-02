const mongoose = require("mongoose");

const ParkingSpotSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    description: {
      type: String,
      required: false,
    },
    price: {
      type: Number,
      required: true,
    },
    availability: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Create a geospatial index for location-based searches
ParkingSpotSchema.index({ location: "2dsphere" });

const ParkingSpot = mongoose.model("ParkingSpot", ParkingSpotSchema);
module.exports = ParkingSpot;
