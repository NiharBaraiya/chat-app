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

function getIndianTime() {
  return moment().tz("Asia/Kolkata").format("h:mm A");
}

io.on("connection", (socket) => {
  socket.on("joinLocal", (name) => {
    users[socket.id] = { name };
    socket.broadcast.emit("localMessage", {
      user: "System",
      text: `${name} joined`,
      time: getIndianTime(),
    });
  });

  socket.on("localMessage", (text) => {
    const user = users[socket.id] || { name: "Unknown" };
    io.emit("localMessage", { user: user.name, text });
  });

  socket.on("joinRoom", ({ name, room }) => {
    socket.join(room);
    users[socket.id] = { name, room };

    socket.emit("message", {
      user: "System",
      text: `Welcome ${name}`,
      time: getIndianTime(),
    });

    socket.broadcast.to(room).emit("message", {
      user: "System",
      text: `${name} joined the chat`,
      time: getIndianTime(),
    });
  });

  socket.on("chatMessage", (text) => {
    const user = users[socket.id];
    if (user?.room) {
      io.to(user.room).emit("message", {
        user: user.name,
        text,
        time: getIndianTime(),
      });
    }
  });

  socket.on("typing", (isTyping) => {
    const user = users[socket.id];
    if (user?.room) {
      socket.to(user.room).emit("typing", isTyping ? `${user.name} is typing...` : "");
    } else if (user?.name) {
      socket.broadcast.emit("typing", isTyping ? `${user.name} is typing...` : "");
    }
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user?.room) {
      io.to(user.room).emit("message", {
        user: "System",
        text: `${user.name} left`,
        time: getIndianTime(),
      });
    } else if (user?.name) {
      socket.broadcast.emit("localMessage", {
        user: "System",
        text: `${user.name} left`,
        time: getIndianTime(),
      });
    }
    delete users[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server started on ${PORT}`));
