// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true, unique: true },
    flag: { type: Boolean, default: false },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
