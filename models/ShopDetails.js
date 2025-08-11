const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, default: Date.now },
  msg: { type: String, required: true },
});

const serviceSchema = new mongoose.Schema({
  category: { type: String, required: true },
  subCategory: { type: String, required: true },
});

const workingHoursSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, 
  endTime: { type: String, required: true },
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
      type: String
    }
  },

  servicesOffered: [serviceSchema], 

  status: { type: String, default: "pending" },

  workingHours: workingHoursSchema,

  reviews: [reviewSchema],
});

module.exports = mongoose.model("ShopDetail", shopDetailSchema);
