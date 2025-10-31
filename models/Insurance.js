// models/code.js
const mongoose = require("mongoose");

const insuranceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ip: { type: String, required: true },
  type: { type: String, required: true },
  cost: { type: String, required: true },
  time: { type: Date, default: Date.now },
});

module.exports = mongoose.model("insurance", insuranceSchema);
