const socket = io("https://chat-app-dw0g.onrender.com");

const params = new URLSearchParams(window.location.search);
const name = params.get("name");
const room = params.get("room");

document.getElementById("room-name").innerText = `${room} Room`;

const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");

socket.emit("joinRoom", { name, room });

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = input.value.trim();
  if (msg) {
    socket.emit("chatMessage", msg);
    input.value = "";
    input.focus();
  }
});

socket.on("message", (msg) => {
  const cls = msg.user === name ? "you" : msg.user === "System" ? "system" : "other";
  messages.innerHTML += `<li class="${cls}">[${msg.time}] <strong>${msg.user}</strong>: ${msg.text}</li>`;
  messages.scrollTop = messages.scrollHeight;
});

input.addEventListener("input", () => {
  socket.emit("typing", true);
  clearTimeout(window.typingTimeout);
  window.typingTimeout = setTimeout(() => {
    socket.emit("typing", false);
  }, 1000);
});

socket.on("typing", (text) => {
  typing.innerText = text || "";
});
