const socket = io();

const username = prompt("Enter your name:") || "Anonymous";
const form = document.getElementById("chat-form");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");

let typingTimeout;

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    socket.emit("chat message", `${username}: ${input.value.trim()}`);
    socket.emit("typing", "");
    input.value = "";
  }
});

input.addEventListener("input", () => {
  socket.emit("typing", `${username} is typing...`);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing", "");
  }, 3000);
});

socket.on("chat message", (msg) => {
  const li = document.createElement("li");
  li.textContent = msg;

  if (msg.startsWith(username + ":")) {
    li.classList.add("self");
  }

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

socket.on("typing", (msg) => {
  if (msg) {
    typing.innerText = msg;
    typing.style.display = "block";
  } else {
    typing.style.display = "none";
  }
});
