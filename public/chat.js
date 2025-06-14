const socket = io();
const urlParams = new URLSearchParams(window.location.search);
let name = urlParams.get("name");
let room = urlParams.get("room");

const roomNameElem = document.getElementById("room-name");
const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");

if (room) {
  roomNameElem.style.display = "block";
  roomNameElem.innerText = `${room} Room`;
  socket.emit("joinRoom", { name, room });
} else {
  socket.emit("joinRoom", { name, room: "general" });
}

form.addEventListener("submit", function (e) {
  e.preventDefault();
  const message = input.value.trim();
  if (message) {
    socket.emit("chatMessage", message);
    input.value = "";
    input.focus();
  }
});

socket.on("message", (message) => {
  const className = message.user === name
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
