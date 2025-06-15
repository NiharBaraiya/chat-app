const socket = io();

const urlParams = new URLSearchParams(window.location.search);
const name = urlParams.get("name");
const room = urlParams.get("room");

const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");
const roomNameElem = document.getElementById("room-name");

// Join room if name and room in URL
if (name && room) {
  socket.emit("joinRoom", { name, room });
  if (roomNameElem) roomNameElem.innerText = `${room} Room`;
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
  const li = document.createElement("li");
  li.innerHTML = `[${message.time}] <strong>${message.user}</strong>: ${message.text}`;
  messages.appendChild(li);
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
