const mongoose = require("mongoose");

const LoadSchema = new mongoose.Schema({
  pickupLocation: String,
  pickupPincode: String,
  dropLocation: String,
  material: String,
  fare: Number,

  status: {
    type: String,
    enum: ["OPEN", "ASSIGNED", "COMPLETED"],
    default: "OPEN"
  },

  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    default: null
  }
});

module.exports = mongoose.model("Load", LoadSchema);