const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const moment = require("moment");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  console.log(`Serving: ${req.url}`);
  next();
});

// User tracking per room
const users = {};

function formatMessage(user, text) {
  return {
    user,
    text,
    time: moment().format("h:mm A"),
  };
}

io.on("connection", (socket) => {
  let currentUser = { id: socket.id, name: "Anonymous", room: null };

  // Handle room joining
  socket.on("joinRoom", ({ name, room }) => {
    currentUser.name = name;
    currentUser.room = room;
    socket.join(room);

    // Save user
    users[socket.id] = currentUser;

    // Welcome current user
    socket.emit("message", formatMessage("System", `Welcome ${name}!`));

    // Broadcast to others in room
    socket.broadcast
      .to(room)
      .emit("message", formatMessage("System", `${name} joined the chat`));
  });

  // Handle chat messages
  socket.on("chatMessage", (msg) => {
    const sender = users[socket.id];
    if (sender?.room) {
      io.to(sender.room).emit("message", formatMessage(sender.name, msg));
    } else {
      // For simple chat (no room)
      io.emit("message", formatMessage("User", msg));
    }
  });

  // Typing indicator
  socket.on("typing", (isTyping) => {
    const sender = users[socket.id];
    const name = sender?.name || "User";
    const room = sender?.room;

    if (room) {
      socket.broadcast.to(room).emit("typing", isTyping ? `${name} is typing...` : "");
    } else {
      socket.broadcast.emit("typing", isTyping ? "Someone is typing..." : "");
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user?.room) {
      socket.broadcast
        .to(user.room)
        .emit("message", formatMessage("System", `${user.name} left the chat`));
    }
    delete users[socket.id];
  });
});

// Run server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
