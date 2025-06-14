const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

// ✅ Track users and room-wise user lists
const users = {};

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

    updateRoomUsers(room);

    // Welcome message to others in room
    socket.to(room).emit("message", {
      user: "System",
      text: `${name} joined the chat.`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  });

  // ✅ Typing indicator (sent only to others in the same room)
  socket.on("typing", (isTyping) => {
    const user = users[socket.id];
    if (user) {
      socket.to(user.room).emit("typing", isTyping ? `${user.name} is typing...` : "");
    }
  });

  // ✅ Handle chat message
  socket.on("chatMessage", (text) => {
    const user = users[socket.id];
    if (user) {
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      io.to(user.room).emit("message", {
        user: user.name,
        text,
        time,
      });
    }
  });

  // ✅ Handle disconnect
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      socket.to(user.room).emit("message", {
        user: "System",
        text: `${user.name} left the chat.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });

      delete users[socket.id];
      updateRoomUsers(user.room);
    }

    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
