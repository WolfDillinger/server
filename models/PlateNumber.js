// models/code.js
const mongoose = require("mongoose");

const plateNumberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ip: { type: String, required: true },
  plateNumber: { type: String, required: true },
  time: { type: Date, default: Date.now },
});

module.exports = mongoose.model("plateNumber", plateNumberSchema);
