
const mongoose = require("mongoose");

const shopKeeperSchema = new mongoose.Schema({
  name: { type: String, required: true },
   role: { type: String, default: 'shopKepper'},
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  cnic: { type: String, required: true },
  address: { type: String, required: true },
   profilePicture:{type:String},
  isVerified: { type: Boolean, default : false },
  isShop: { type: Boolean, default : false },
  isLive: { type: Boolean, default : false },
  createdAt: { type: Date, default: Date.now },
  activityCount: { type: Number, default: 0 },

});

module.exports = mongoose.model("ShopKeeper", shopKeeperSchema);
