const mongoose = require("mongoose")
const express = require("express")
const cors = require("cors")
require("dotenv").config();
const AdminRoutes = require("./routes/AdminRoutes")

const app = express();
app.use(cors());
app.use(express.json())

const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
  res.send("HazirHay Backend is Live!");
});


const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    });
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    process.exit(1); // Exit process with failure
  }
};

app.use("/admin", AdminRoutes);
connectDB().then(()=>{
    app.listen(PORT, ()=>{
        console.log(`Server Running on PORT ${PORT}`)
    })
})