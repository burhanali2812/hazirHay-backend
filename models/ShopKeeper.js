
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
});

module.exports = mongoose.model("ShopKeeper", shopKeeperSchema);
