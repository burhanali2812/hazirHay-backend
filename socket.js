const { Server } = require("socket.io");
const {ShopKeeper} = require( "./models/ShopKeeper");

let io;

const initSocket = (server)=>{
    io = new Server(server,{
         cors: {
      origin: "https://hazir-hay-frontend.vercel.app/",
      methods: ["GET", "POST"],
    },
    })

    io.on("connection",(socket)=>{
        console.log("A New User Connected", socket.id);

        socket.on("diconnect",()=>{
            console.log("User Disconnected", socket.id);  
        })
    })
}

const getIO = () => io;

module.exports = { initSocket, getIO };
