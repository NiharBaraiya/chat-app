const socket = io(); // Localhost
let username = "";

function startChat() {
  const input = document.getElementById("username");
  username = input.value.trim();
  if (!username) return;

  socket.emit("joinLocalUser", username);
  document.getElementById("start").style.display = "none";
  document.getElementById("chatForm").style.display = "flex";
  document.getElementById("messages").style.display = "block";
}

const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = input.value.trim();
  if (msg) {
    socket.emit("chatMessage", msg);
    input.value = "";
  }
});

socket.on("message", (msg) => {
  const className = msg.user === username ? "you" : "other";
  messages.innerHTML += `<li class="${className}"><strong>${msg.user}</strong>: ${msg.text}</li>`;
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
