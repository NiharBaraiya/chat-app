const socket = io("https://chat-app-dw0g.onrender.com");

const urlParams = new URLSearchParams(window.location.search);
let name = urlParams.get("name");
let room = urlParams.get("room");

const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");
const roomName = document.getElementById("room-name");

if (name && room) {
  socket.emit("joinRoom", { name, room });
  roomName.innerText = `${room} Room`;
}

form.addEventListener("submit", function (e) {
  e.preventDefault();
  const msg = input.value.trim();
  if (msg) {
    socket.emit("chatMessage", msg);
    input.value = "";
    input.focus();
  }
});

socket.on("message", (msg) => {
  const className = msg.user === name ? "you" : msg.user === "System" ? "system" : "other";
  const html = `<li class="${className}">[${msg.time}] <strong>${msg.user}</strong>: ${msg.text}</li>`;
  messages.innerHTML += html;
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
