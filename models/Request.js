const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  checkoutId: { type: String, required: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopDetails", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  shopOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: "ShopKeeper", required: true },
   location: [{
    coordinates: {
      type: [Number], 
    },
    area :{
      type: String,
    }
  }],
    serviceCharges: {
    rate: {
      type: [Number], 
    },
    distance :{
      type: Number,
    }
  },
  category: { type: String, required: true },
  subCategory: { type: String, required: true },
  orderId: { type: String, required: true },
  cost: { type: Number, required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected","completed"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Request", requestSchema);