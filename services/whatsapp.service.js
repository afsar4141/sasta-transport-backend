// services/whatsappService.js
const axios = require("axios");

const sendWhatsAppMessage = async (to, text) => {
  try {
    const formattedTo = to.startsWith("91") ? to : `91${to}`;

    await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: formattedTo,
        type: "text",
        text: { body: text }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("WhatsApp sent to:", formattedTo);
  } catch (error) {
    console.error(
      "WhatsApp Error:",
      error.response?.data || error.message
    );
  }
};

// ✅ TEMPLATE MESSAGE SENDER (ADD BELOW EXISTING CODE)
const sendTemplateMessage = async (to, templateName, params = []) => {
  try {
    const formattedTo = to.startsWith("91") ? to : `91${to}`;

    await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: formattedTo,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en_US" },
          components: [
            {
              type: "body",
              parameters: params.map(p => ({
                type: "text",
                text: p
              }))
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Template WhatsApp sent to:", formattedTo);
  } catch (error) {
    console.error(
      "Template WhatsApp Error:",
      error.response?.data || error.message
    );
  }
};

module.exports = { sendWhatsAppMessage, sendTemplateMessage };