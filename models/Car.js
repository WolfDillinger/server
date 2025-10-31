const mongoose = require("mongoose");

const carSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ip: { type: String, required: true },
  brand: { type: String, default: null },
  carBody: { type: String, default: null },
  model: { type: String, default: null },
  year: { type: String, default: null },
  seat: { type: String, default: null },
  cyl: { type: String, default: null },
  time: { type: Date, default: Date.now },
});

module.exports = mongoose.model("car", carSchema);
