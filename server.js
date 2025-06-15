const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const moment = require("moment");

const app = express();
const server = http.createServer(app);
const io = socketio(server);
// ✅ Force Render root URL to open simple.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "simple.html"));
});

// Serve public folder (for index.html, simple.html, chat.html etc.)
app.use(express.static(path.join(__dirname, "public")));

const users = {}; // Store users by socket.id

function formatMessage(user, text) {
  return {
    user,
    text,
    time: moment().format("h:mm A"),
  };
}

io.on("connection", (socket) => {
  let currentUser = {
    id: socket.id,
    name: "Anonymous",
    room: null,
  };

  // Room-based join (used by Render via chat.html?name=...&room=...)
  socket.on("joinRoom", ({ name, room }) => {
    currentUser.name = name;
    currentUser.room = room;
    users[socket.id] = currentUser;

    socket.join(room);

    socket.emit("message", formatMessage("System", `Welcome ${name}!`));
    socket.broadcast
      .to(room)
      .emit("message", formatMessage("System", `${name} joined the chat`));
  });

  // Handle chat message
  socket.on("chatMessage", (msgData) => {
    const sender = users[socket.id];
    let user = "User";
    let room = null;
    let msg = msgData;

    if (typeof msgData === "object") {
      user = msgData.name || "User";
      msg = msgData.msg;
    } else if (sender) {
      user = sender.name || "User";
      room = sender.room;
    }

    const formatted = formatMessage(user, msg);

    // If room is present, send to room; otherwise global
    room
      ? io.to(room).emit("message", formatted)
      : io.emit("message", formatted);
  });

  // Typing
  socket.on("typing", (isTyping) => {
    const sender = users[socket.id];
    const room = sender?.room;
    const name = sender?.name || "User";
    const msg = isTyping ? `${name} is typing...` : "";

    room
      ? socket.broadcast.to(room).emit("typing", msg)
      : socket.broadcast.emit("typing", msg);
  });

  // Disconnect
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user?.room) {
      socket.broadcast
        .to(user.room)
        .emit("message", formatMessage("System", `${user.name} left`));
    }
    delete users[socket.id];
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
