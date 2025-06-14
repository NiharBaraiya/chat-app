const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const moment = require("moment");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// In-memory users by room
const users = {};

function formatMessage(user, text, system = false) {
  return {
    user,
    text,
    time: moment().format("h:mm A"),
    system,
  };
}

// Handle socket connection
io.on("connection", (socket) => {
  // SIMPLE CHAT (localhost only)
  socket.on("simpleChatMessage", (msg) => {
    io.emit("simpleMessage", formatMessage("User", msg));
  });

  // ROOM CHAT (Render)
  socket.on("joinRoom", ({ name, room }) => {
    socket.join(room);
    if (!users[room]) users[room] = [];
    users[room].push({ id: socket.id, name });

    // Welcome user
    socket.emit("message", formatMessage("System", `Welcome ${name} to the chat`, true));

    // Broadcast to others in the room
    socket.broadcast.to(room).emit("message", formatMessage("System", `${name} joined the chat`, true));

    // Handle messages
    socket.on("chatMessage", (msg) => {
      io.to(room).emit("message", formatMessage(name, msg));
    });

    // On disconnect
    socket.on("disconnect", () => {
      const userIndex = users[room]?.findIndex((u) => u.id === socket.id);
      if (userIndex !== -1) {
        const user = users[room][userIndex];
        users[room].splice(userIndex, 1);
        io.to(room).emit("message", formatMessage("System", `${user.name} left the chat`, true));
      }
    });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
