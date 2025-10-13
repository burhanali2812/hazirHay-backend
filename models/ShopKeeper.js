
const mongoose = require("mongoose");

const shopKeeperSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  cnic: { type: String, required: true },
  address: { type: String, required: true },
   profilePicture:{type:String, required : true},
   verificationDocument:{type:String, required : true},
  isVerified: { type: Boolean, default : false },
  isBusy: { type: Boolean, default : false },
  isShop: { type: Boolean, default : false },
  isLive: { type: Boolean, default : false },

  createdAt: { type: Date, default: Date.now },
  activityCount: { type: Number, default: 0 },

  socketId: { type: String, default: null },

});

module.exports = mongoose.model("ShopKeeper", shopKeeperSchema);
