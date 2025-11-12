const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const AdminRoutes = require("./routes/AdminRoutes");
const ShopKepperRoutes = require("./routes/ShopKepperRoutes");
const UserRoutes = require("./routes/UserRoutes");
const ShopRoutes = require("./routes/ShopsRoutes");
const RequestRoutes = require("./routes/RequestRoutes");
const Cart = require("./routes/CartRoutes");
const Notification = require("./routes/NotificationRoutes");
const Worker = require("./routes/WorkerRoutes");
const Transactions = require("./routes/TransactionRoutes");
const http = require("http");
const { initSocket } = require("./socket");

const app = express();

// ===== CORS CONFIG =====
const allowedOrigins = [
    "http://localhost:3001",                  
    "https://hazir-hay-frontend.vercel.app"  
];

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors());

app.use(express.json());

// ===== ROUTES =====
app.use("/admin", AdminRoutes);
app.use("/shops", ShopRoutes);
app.use("/shopKeppers", ShopKepperRoutes);
app.use("/users", UserRoutes);
app.use("/requests", RequestRoutes);
app.use("/cart", Cart);
app.use("/notification", Notification);
app.use("/worker", Worker);
app.use("/transactions", Transactions);


app.get("/", (req, res) => {
    res.send("HazirHay Backend is Live!");
});


const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000
        });
        console.log("MongoDB Connected");
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
        process.exit(1);
    }
};


const server = http.createServer(app);
initSocket(server);


const PORT = process.env.PORT || 3000;
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server Running on PORT ${PORT}`);
    });
});
