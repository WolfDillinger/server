const mongoose = require("mongoose");

const quoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ip: { type: String, required: true },
  term: { type: String, default: null },
  paymentMethod: { type: String, default: null },
  amount: { type: String, default: null },
  currency: { type: Number, default: null },
  time: { type: Date, default: Date.now },
});

module.exports = mongoose.model("quote", quoteSchema);
