const socket = io(); // will auto-connect to render or local

const params = new URLSearchParams(window.location.search);
const name = params.get("name");
const room = params.get("room");

const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");
const roomName = document.getElementById("room-name");

socket.emit("joinRoom", { name, room });
roomName.innerText = `${room} Room`;

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = input.value.trim();
  if (msg) {
    socket.emit("chatMessage", msg);
    input.value = "";
  }
});

socket.on("message", (msg) => {
  const className = msg.user === name ? "you" : msg.user === "System" ? "system" : "other";
  messages.innerHTML += `<li class="${className}">[${msg.time}] <strong>${msg.user}</strong>: ${msg.text}</li>`;
  messages.scrollTop = messages.scrollHeight;
});

let typingTimeout;
input.addEventListener("input", () => {
  socket.emit("typing", true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit("typing", false), 1000);
});

socket.on("typing", (text) => {
  typing.innerText = text || "";
});
