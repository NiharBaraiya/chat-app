// public/chat.js

// Auto-detect if running on Render or Localhost
const isRender = window.location.hostname.includes("onrender.com");
const socket = isRender
  ? io("https://chat-app-dw0g.onrender.com")
  : io(); // defaults to localhost

// URL params for chat.html?name=...&room=...
const urlParams = new URLSearchParams(window.location.search);
let name = urlParams.get("name");
let room = urlParams.get("room");

const roomNameElem = document.getElementById("room-name");
const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");

// If name and room are present (room chat)
if (name && room) {
  socket.emit("joinRoom", { name, room });
  if (roomNameElem) {
    roomNameElem.innerText = `${room} Room`;
  }
}

// Send message
form.addEventListener("submit", function (e) {
  e.preventDefault();
  const message = input.value.trim();
  if (message) {
    socket.emit("chatMessage", message);
    input.value = "";
    input.focus();
  }
});

// Receive message
socket.on("message", (message) => {
  const isRoomChat = name && room;
  const className =
    isRoomChat && message.user === name
      ? "you"
      : message.user === "System"
      ? "system"
      : "other";

  const html = `
    <li class="${className}">
      [${message.time}] <strong>${message.user}</strong>: ${message.text}
    </li>
  `;
  messages.innerHTML += html;
  messages.scrollTop = messages.scrollHeight;
});

// Typing
let typingTimeout;
input.addEventListener("input", () => {
  socket.emit("typing", true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing", false);
  }, 1000);
});

socket.on("typing", (text) => {
  typing.innerText = text || "";
});
