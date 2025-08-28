const mongoose = require("mongoose")
const express = require("express")
const cors = require("cors")
require("dotenv").config();
const AdminRoutes = require("./routes/AdminRoutes")
const ShopKepperRoutes = require("./routes/ShopKepperRoutes")
const UserRoutes = require("./routes/UserRoutes")
const ShopRoutes = require("./routes/ShopsRoutes")
const http = require("http");
const path = require("path");
const { initSocket } = require("./socket");

const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  "https://hazir-hay-frontend.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json())

const server = http.createServer(app);

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
initSocket(server);
app.use("/admin", AdminRoutes);
app.use("/shops", ShopRoutes);
app.use("/shopKeppers", ShopKepperRoutes);
app.use("/users", UserRoutes);
connectDB().then(()=>{
    server.listen(PORT, ()=>{
        console.log(`Server Running on PORT ${PORT}`)
    })
})