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
  // For room-based chat (Render)
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

  // For simple localhost chat
  socket.on("joinLocalUser", (name) => {
    users[socket.id] = { name };
  });

  socket.on("chatMessage", (msg) => {
    const user = users[socket.id];
    const message = {
      user: user?.name || "Guest",
      text: msg,
      time: getTime()
    };

    if (user?.room) {
      io.to(user.room).emit("message", message);
    } else {
      io.emit("message", message);
    }
  });

  socket.on("typing", (isTyping) => {
    const user = users[socket.id];
    const text = isTyping ? `${user?.name || "User"} is typing...` : "";
    if (user?.room) {
      socket.to(user.room).emit("typing", text);
    } else {
      socket.broadcast.emit("typing", text);
    }
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user?.room) {
      io.to(user.room).emit("message", {
        user: "System",
        text: `${user.name} left the chat`,
        time: getTime()
      });
    }
    delete users[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
