const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
     name:{type:String, required : true},
    email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
   address: { type: String, required: true },
   profilePicture:{type:String},
   createdAt: { type: Date, default: Date.now },
   lastActive: { type: Date, default: Date.now },
      role: { type: String, default: 'user'},
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
    },
     createdAt: { type: Date, default: Date.now },
  }]

})

module.exports = mongoose.model("User", userSchema)