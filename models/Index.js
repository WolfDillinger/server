const mongoose = require("mongoose");

const indexSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  phone: { type: String, required: true },
  ip: { type: String, required: true },
  time: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Index", indexSchema);
