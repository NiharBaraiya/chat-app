const socket = io(); // Localhost default

let username = "";

function startChat() {
  const nameInput = document.getElementById("username");
  username = nameInput.value.trim();
  if (!username) return;

  document.getElementById("name-input").style.display = "none";
  document.getElementById("chatForm").style.display = "flex";
  document.getElementById("messages").style.display = "block";

  socket.emit("joinLocalUser", username);
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
    input.focus();
  }
});

socket.on("message", (msg) => {
  const className = msg.user === username ? "you" : "other";
  const html = `<li class="${className}"><strong>${msg.user}</strong>: ${msg.text}</li>`;
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
