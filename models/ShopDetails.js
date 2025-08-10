
const mongoose = require("mongoose");

const shopDetailSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ShopKeeper",
    required: true
  },
  shopName: { type: String, required: true },
  shopAddress: { type: String, required: true },
  license: { type: String, required: true },
   shopPicture:{type:String, required : true},
});

module.exports = mongoose.model("ShopDetail", shopDetailSchema);
