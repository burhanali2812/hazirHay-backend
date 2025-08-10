const mongoose = require("mongoose");


const adminSchema = new mongoose.Schema({
    name:{type:String, required : true},
    email: { type: String, required: true, unique: true },
  password: { type: String, default: null },
  phone: { type: String, required: true },
   address: { type: String, required: true },
   profilePicture:{type:String, required : true},
})

module.exports = mongoose.model("Admin", adminSchema)