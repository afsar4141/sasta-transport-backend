const mongoose = require("mongoose");

const DriverSchema = new mongoose.Schema({
  name: String,
  phone: String,

  areaPincode: String,     // 👈 IMPORTANT
  vehicleType: String,

  isActive: {
    type: Boolean,
    default: true
  },

  subscriptionStatus: {
    type: String,
    enum: ["FREE", "PAID"],
    default: "FREE"
  }
});

module.exports = mongoose.model("Driver", DriverSchema);