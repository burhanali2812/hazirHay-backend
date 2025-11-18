const mongoose = require("mongoose");
import axios from "axios";

const apiKey = process.env.GEMINI_API_KEY;

const workerSchema = new mongoose.Schema({
 name: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  profilePicture: { type: String, required: true },
  phone: { type: String, required: true, unique: true, match: /^[0-9]{11}$/ },
  role: { type: String, default: "worker" },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopDetails" },
  shopOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: "Shopkeeper" },
   isBusy: { type: Boolean, default : false },
   orderCount: { type: Number, default: 0 },
  location: {
    coordinates: {
      type: [Number],
    },
    area: {
      type: String,
    },
  },
  createdAt: { type: Date, default: Date.now },
});

router.post("/ask", async (req, res) => {
  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      {
        contents: [{ parts: [{ text: req.body.prompt }] }]
      },
      {
        headers: {
          "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY
        }
      }
    );

    res.json({ answer: response.data });
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(500).json({ error: "Gemini request failed" });
  }
});


module.exports = mongoose.model("Worker", workerSchema);
