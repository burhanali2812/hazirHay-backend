const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  name: { type: String},
  date: { type: Date, default: Date.now },
  msg: { type: String },
  rate : {type : Number}
});

const serviceSchema = new mongoose.Schema({
  category: { type: String, required: true },
  subCategory: { 
    name : {type: String, required: true},
    price: {type: Number, required: true},
    description: {type: String}
   },
});



const shopDetailSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ShopKeeper",
    required: true,
  },
  shopName: { type: String, required: true },
  shopAddress: { type: String, required: true },
  license: { type: String, required: true },
  shopPicture: { type: String, required: true },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], 
      required: true,
    },

    area :{
      type: String,
      required : true
    }
  },

  servicesOffered: [serviceSchema], 

  status: { type: String, default: "pending" },
  isLive: { type: Boolean, default : false },
   socketId: { type: String, default: null },
   

  reviews: [reviewSchema],
  createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model("ShopDetail", shopDetailSchema);
