// models/code.js
const mongoose = require("mongoose");

const insuranceCardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ip: { type: String, required: true },
  vehicleType: { type: String, required: true },
  registrationYear: { type: String, required: true },
  cardId: { type: String, required: true },
  time: { type: Date, default: Date.now },
});

module.exports = mongoose.model("insuranceCard", insuranceCardSchema);
