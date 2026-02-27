const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { sendWhatsAppMessage } = require("../services/whatsapp.service");

/* =========================
   MODELS (USE SAME SCHEMA)
========================= */
const Load = mongoose.model("Load");
const Driver = mongoose.model("Driver");

/* =========================
   VERIFY WEBHOOK
========================= */
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("✅ WhatsApp Webhook Verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/* =========================
   RECEIVE WHATSAPP MESSAGE
========================= */
router.post("/", async (req, res) => {
  const message =
    req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (!message) {
    return res.sendStatus(200);
  }

  const from = message.from; // driver number
  const text = message.text?.body?.trim();

  console.log("📩 From:", from);
  console.log("📝 Text:", text);

  /* =========================
     DRIVER ACCEPT LOAD
     FORMAT: YES-LOADID
  ========================= */
  if (text?.startsWith("YES-")) {
    const loadId = text.split("YES-")[1];

    const driver = await Driver.findOne({
      phone: from.slice(-10),
      verified: true,
      blocked: false
    });

    if (!driver) {
      await sendWhatsAppMessage(
        from.slice(-10),
        "❌ You are not verified or blocked."
      );
      return res.sendStatus(200);
    }

    const load = await Load.findOne({
      _id: loadId,
      status: "OPEN"
    });

    if (!load) {
      await sendWhatsAppMessage(
        from.slice(-10),
        "❌ Load already assigned to another driver."
      );
      return res.sendStatus(200);
    }

    // ✅ ASSIGN LOAD
    load.status = "ASSIGNED";
    load.assignedDriver = driver.phone;
    await load.save();

    // Notify driver
    await sendWhatsAppMessage(
      driver.phone,
      `✅ Load assigned to you!

Material: ${load.material}
Pickup: ${load.pickup}
Drop: ${load.drop}

Please contact the shop owner.`
    );

    // Notify shop owner
    await sendWhatsAppMessage(
      load.phone,
      `🚚 Driver Assigned!

Driver Name: ${driver.name}
Driver Phone: ${driver.phone}

They will contact you shortly.`
    );

    return res.sendStatus(200);
  }

  /* =========================
     DEFAULT AUTO REPLY
  ========================= */
  await sendWhatsAppMessage(
    from.slice(-10),
    "🤖 Please reply in format:\nYES-<LOAD_ID>\nTo accept a load."
  );

  res.sendStatus(200);
});

module.exports = router;