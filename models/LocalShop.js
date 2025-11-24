const mongoose = require("mongoose");

const localShopSchema = new mongoose.Schema({
  shopName: { type: String, required: true },
  position: { type: String, required: true },
   role: { type: String, default: 'shop'},
  shopAddress: { type: String, required: true },
  shopPicture: { type: String },
  menuCard: { type: String },
  paymentPic: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  services: [{
    name: { type: String, required: true }
  }],
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
    area: { type: String }
  },
  activityCount: { type: Number, default: 0 },
  isLive: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  expiredAT: { type: Date, default: () => Date.now() + 360*24*60*60*1000 }
});

localShopSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("LocalShop", localShopSchema);
