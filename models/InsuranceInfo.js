// models/code.js
const mongoose = require("mongoose");

const insuranceInfoSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ip: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  gender: { type: String, required: true },
  address: { type: String, required: true },
  dob: { type: String, required: true },
  time: { type: Date, default: Date.now },
});

module.exports = mongoose.model("insuranceInfo", insuranceInfoSchema);
