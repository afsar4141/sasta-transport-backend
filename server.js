const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const {
  sendWhatsAppMessage,
  sendTemplateMessage
} = require("./services/whatsapp.service");

const app = express();
//app.use(cors());
//app.use(express.json());

// =====================
// MIDDLEWARES (FIXED FOR PROD)
// =====================
app.use(cors({
  origin: true, // allow all origins (safe for your use case)
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// ADMIN KEY
// =====================
const ADMIN_KEY = process.env.ADMIN_KEY;
const ADMIN_PHONE = process.env.ADMIN_PHONE; // admin WhatsApp number

const adminAuth = (req, res, next) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(401).send("Unauthorized");
  }
  next();
};

// =====================
// MONGODB CONNECTION
// =====================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// =====================
// MODELS
// =====================
const Driver = mongoose.model("Driver", {
  name: String,
  phone: String,
  truckType: String,
  area: String,
  city: { type: String, default: "Lucknow" },
  verified: { type: Boolean, default: false },
  blocked: { type: Boolean, default: false },
  subscribed: { type: Boolean, default: false }, // 🔥 FUTURE PAID MODEL
  createdAt: { type: Date, default: Date.now }
});

const Load = mongoose.model("Load", {
  material: String,
  pickup: String,
  drop: String,
  area: String,
  phone: String,
  status: { type: String, default: "OPEN" }, // OPEN | ASSIGNED
  assignedDriver: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

// =====================
// PUBLIC APIs
// =====================


// 🚚 Register Driver
app.post("/driver", async (req, res) => {
  try {
    const driver = new Driver(req.body);
    await driver.save();

    // 1️⃣ WhatsApp to DRIVER
//     await sendWhatsAppMessage(
//       driver.phone,
//       `🚚 Welcome to SastaTransport!
// You are registered successfully.
// You will receive loads from ${driver.area}.`
//     );
    // ✅ Driver notification (TEMPLATE)
await sendTemplateMessage(
  driver.phone,
  "driver_registered",
  [driver.name, driver.area]
);


    // 2️⃣ WhatsApp to ADMIN (THIS WAS MISSING)
//     await sendWhatsAppMessage(
//       ADMIN_PHONE,
//       `🆕 New Driver Registered

// 👤 Name: ${driver.name}
// 📞 Phone: ${driver.phone}
// 🚛 Truck Type: ${driver.truckType}
// 📍 Area: ${driver.area}
// 🏙️ City: ${driver.city}

// Status: ❌ Not Verified`
//     );
// ✅ Admin notification (TEMPLATE)
await sendTemplateMessage(
  ADMIN_PHONE,
  "admin_new_driver",
  [driver.name, driver.phone, driver.area]
);

    res.send({ success: true, message: "Driver registered" });
  } catch (err) {
    console.error("Driver register error:", err);
    res.status(500).send({ success: false });
  }
});

// 📦 Post Load (SHOP OWNER)
app.post("/load", async (req, res) => {
  try {
    const load = new Load(req.body);
    await load.save();

    // 1️⃣ Notify shop owner
    // await sendWhatsAppMessage(
    //   load.phone,
    //   "📦 Your transport request is live!\nNearby drivers are being notified."
    // );
    await sendTemplateMessage(
  load.phone,
  "load_submitted",
  [load.material, load.pickup, load.drop]
);

    // 2️⃣ Find drivers from same area
    const drivers = await Driver.find({
      area: load.area,
      verified: true,
      blocked: false
      // later add: subscribed: true
    });

    // 3️⃣ Send load to drivers
    for (let driver of drivers) {
      await sendWhatsAppMessage(
        driver.phone,
        `🚛 NEW LOAD AVAILABLE
Material: ${load.material}
Pickup: ${load.pickup}
Drop: ${load.drop}

Reply YES-${load._id} to accept first.`
      );
    }

    res.send({ success: true, message: "Load posted & drivers notified" });
  } catch (err) {
    res.status(500).send({ success: false });
  }
});

// =====================
// DRIVER ACCEPT LOAD (FIRST COME FIRST SERVE)
// =====================
app.post("/driver/accept", async (req, res) => {
  const { driverPhone, loadId } = req.body;

  const load = await Load.findOne({ _id: loadId, status: "OPEN" });
  if (!load) {
    return res.send({ success: false, message: "Load already taken" });
  }

  load.status = "ASSIGNED";
  load.assignedDriver = driverPhone;
  await load.save();

  await sendWhatsAppMessage(
    load.phone,
    `✅ Driver assigned!
Driver Phone: ${driverPhone}`
  );

  res.send({ success: true, message: "Load assigned to you" });
});

// =====================
// ADMIN APIs
// =====================
app.get("/admin/drivers", adminAuth, async (req, res) => {
  const drivers = await Driver.find().sort({ createdAt: -1 });
  res.json(drivers);
});

app.get("/admin/loads", adminAuth, async (req, res) => {
  const loads = await Load.find().sort({ createdAt: -1 });
  res.json(loads);
});

app.patch("/admin/driver/:id/verify", adminAuth, async (req, res) => {
  await Driver.findByIdAndUpdate(req.params.id, { verified: true });
  res.send({ success: true });
});

// =====================
// SERVER
// =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});