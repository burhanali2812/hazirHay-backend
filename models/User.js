const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
     name:{type:String, required : true},
    email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
   address: { type: String, required: true },
   profilePicture:{type:String, required : true},
   createdAt: { type: Date, default: Date.now },
   lastActive: { type: Date, default: Date.now },
   activityCount: { type: Number, default: 0 },
    location: [{
    name: {
      type: String,
    },
    coordinates: {
      type: [Number], 
    },

    area :{
      type: String,
    },
    isDefault : {
      type: Boolean,
      default : false,
    }
  }]

})

module.exports = mongoose.model("User", userSchema)