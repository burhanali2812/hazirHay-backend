const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema({
 name: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  profilePicture: { type: String, required: true },
  phone: { type: String, required: true, unique: true, match: /^[0-9]{11}$/ },
  role: { type: String, default: "worker" },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopDetails" },
  shopOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: "Shopkeeper" },
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

module.exports = mongoose.model("Worker", workerSchema);
