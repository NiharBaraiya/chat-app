const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const moment = require("moment");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Serve public folder
app.use(express.static(path.join(__dirname, "public")));

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

  socket.on("chatMessage", (msg) => {
    const sender = users[socket.id];
    if (sender?.room) {
      io.to(sender.room).emit("message", formatMessage(sender.name, msg));
    } else {
      io.emit("message", formatMessage("User", msg));
    }
  });

  socket.on("typing", (isTyping) => {
    const sender = users[socket.id];
    const room = sender?.room;
    const name = sender?.name || "User";

    const message = isTyping ? `${name} is typing...` : "";
    room
      ? socket.broadcast.to(room).emit("typing", message)
      : socket.broadcast.emit("typing", message);
  });

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
