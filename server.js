const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);
const crypto = require("crypto");
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public"), { index: false }));

app.get("/", (req, res) => {
  const host = req.headers.host;
  if (host.includes("localhost")) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    res.sendFile(path.join(__dirname, "public", "simple.html"));
  }
});

app.get("/simple", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "simple.html"));
});

app.get("/index", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🔁 In-memory stores
const users = {};         // socket.id → { name, room }
const roomUsers = {};     // room → Set of usernames
const messages = {};      // messageId → message object

io.on("connection", (socket) => {

  // ✅ Join Room
  socket.on("joinRoom", ({ name, room }) => {
    const currentUser = { name, room };
    users[socket.id] = currentUser;
    socket.join(room);

    if (!roomUsers[room]) roomUsers[room] = new Set();

    const existing = [...roomUsers[room]];
    if (existing.length > 0) {
      socket.emit("message", formatMessage("System", `${existing.join(", ")} already joined this chat.`));
    }

    roomUsers[room].add(name);

    socket.emit("message", formatMessage("System", `Welcome ${name}!`));
    socket.broadcast.to(room).emit("message", formatMessage("System", `${name} joined the chat.`));

    io.to(room).emit("roomUsers", {
      room,
      users: [...roomUsers[room]].map(name => ({ name })),
    });
  });

  // ✅ Send Message
  socket.on("chatMessage", (text) => {
    const user = users[socket.id];
    if (user) {
      const message = {
        id: crypto.randomUUID(),
        user: user.name,
        text,
        time: getCurrentTime()
      };
      messages[message.id] = message;
      io.to(user.room).emit("message", message);
    }
  });

  // ✅ Seen Message (🆕)
  socket.on("seenMessage", (messageId) => {
    const user = users[socket.id];
    const msg = messages[messageId];
    if (user && msg) {
      const senderSocketId = Object.keys(users).find(id => users[id].name === msg.user && users[id].room === user.room);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageSeen", messageId);
      }
    }
  });

  // ✅ Typing Indicator
  socket.on("typing", (status) => {
    const user = users[socket.id];
    if (user) {
      const typingText = status ? `${user.name} is typing...` : "";
      socket.to(user.room).emit("typing", typingText);
    }
  });

  // ✅ File Upload
  socket.on("fileUpload", ({ fileName, fileData, fileType }) => {
    const user = users[socket.id];
    if (user) {
      const time = getCurrentTime();
      io.to(user.room).emit("fileShared", {
        user: user.name,
        fileName,
        fileData,
        fileType,
        time,
      });
    }
  });

  // ✅ (Future) Emoji Reaction
  socket.on("addReaction", ({ messageId, emoji }) => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit("reactionAdded", { messageId, emoji });
    }
  });

  // ✅ Edit Message
  socket.on("editMessage", ({ messageId, newText }) => {
    const user = users[socket.id];
    const msg = messages[messageId];
    if (!msg || !user) return;

    if (msg.user === user.name) {
      msg.text = newText;
      io.to(user.room).emit("messageEdited", { messageId, newText });
    }
  });

  // ✅ Delete Message
  socket.on("deleteMessage", (messageId) => {
    const user = users[socket.id];
    const msg = messages[messageId];
    if (!msg || !user) return;

    if (msg.user === user.name) {
      delete messages[messageId];
      io.to(user.room).emit("messageDeleted", messageId);
    }
  });

  // ✅ Pin Message
  socket.on("pinMessage", (messageId) => {
    const user = users[socket.id];
    const msg = messages[messageId];
    if (!msg || !user) return;

    io.to(user.room).emit("messagePinned", msg);
  });

  // ✅ Disconnect
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      socket.to(user.room).emit("message", formatMessage("System", `${user.name} left the chat.`));
      socket.to(user.room).emit("typing", "");

      if (roomUsers[user.room]) {
        roomUsers[user.room].delete(user.name);
        if (roomUsers[user.room].size > 0) {
          io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: [...roomUsers[user.room]].map(name => ({ name })),
          });
        } else {
          delete roomUsers[user.room];
        }
      }

      delete users[socket.id];
    }
  });
});

// ✅ Format Message Utility
function formatMessage(user, text) {
  const message = {
    id: crypto.randomUUID(),
    user,
    text,
    time: getCurrentTime()
  };
  messages[message.id] = message;
  return message;
}

// ✅ IST Time Formatter
function getCurrentTime() {
  return new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ✅ Start Server
http.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

