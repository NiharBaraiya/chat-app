const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

// ✅ Track users and room-wise user lists
const users = {};
const roomUsers = {};

function updateRoomUsers(room) {
  const userList = Object.values(users)
    .filter((u) => u.room === room)
    .map((u) => u.name);
  io.to(room).emit("roomUsers", userList);
}

io.on("connection", (socket) => {
  console.log("User connected");

  // ✅ When user joins a room
  socket.on("joinRoom", ({ name, room }) => {
    socket.join(room);
    users[socket.id] = { name, room };

    if (!roomUsers[room]) roomUsers[room] = [];
    roomUsers[room].push(name);

    updateRoomUsers(room);

    // Optional welcome system message
    socket.to(room).emit("chat message", `[System] ${name} joined the room.`);
  });

  // ✅ Typing indicator
  socket.on("typing", (msg) => {
    socket.broadcast.emit("typing", msg); // Send to others
  });

  // ✅ Chat messages with timestamp
  socket.on("chat message", (msg) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    io.emit("chat message", `[${time}] ${msg}`);
  });

  // ✅ Handle disconnect
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      roomUsers[user.room] = roomUsers[user.room]?.filter((n) => n !== user.name);
      updateRoomUsers(user.room);

      socket.to(user.room).emit("chat message", `[System] ${user.name} left the room.`);
      delete users[socket.id];
    }

    console.log("User disconnected");
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
