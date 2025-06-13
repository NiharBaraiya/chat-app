const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("User connected");
socket.on("typing", (msg) => {
  socket.broadcast.emit("typing", msg); // send to everyone except sender
});

 socket.on("chat message", (msg) => {
 const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  io.emit("chat message", `[${time}] ${msg}`);
});

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
