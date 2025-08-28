const { Server } = require("socket.io");
const {ShopKeeper} = require( "./models/ShopKeeper");

let io;

const initSocket = (server)=>{
   const allowedOrigins = [
  "http://localhost:3000",
  "https://hazir-hay-frontend.vercel.app"
];

io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

    io.on("connection",(socket)=>{
        console.log("A New User Connected", socket.id);

        socket.on("diconnect",()=>{
            console.log("User Disconnected", socket.id);  
        })
    })
}

const getIO = () => io;

module.exports = { initSocket, getIO };
