const express = require("express");
const http = require("http");
const path = require("path");
const socketio = require("socket.io");
const moment = require("moment-timezone");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, "public")));

const users = {};

function getTime() {
  return moment().tz("Asia/Kolkata").format("h:mm A");
}

io.on("connection", socket => {
  socket.on("joinRoom", ({ name, room }) => {
    socket.join(room);
    users[socket.id] = { name, room };

    socket.emit("message", {
      user: "System",
      text: `Welcome ${name}!`,
      time: getTime()
    });

    socket.broadcast.to(room).emit("message", {
      user: "System",
      text: `${name} joined the chat`,
      time: getTime()
    });
  });

  socket.on("chatMessage", (msg) => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit("message", {
        user: user.name,
        text: msg,
        time: getTime()
      });
    } else {
      io.emit("message", {
        user: "User",
        text: msg,
        time: getTime()
      });
    }
  });

  socket.on("typing", (isTyping) => {
    const user = users[socket.id];
    const room = user?.room;
    const text = isTyping ? `${user?.name || "User"} is typing...` : "";
    if (room) {
      socket.to(room).emit("typing", text);
    } else {
      socket.broadcast.emit("typing", text);
    }
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit("message", {
        user: "System",
        text: `${user.name} left the chat`,
        time: getTime()
      });
      delete users[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
