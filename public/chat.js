const socket = io();

const urlParams = new URLSearchParams(window.location.search);
const name = urlParams.get("name") || "Guest";
const room = urlParams.get("room") || "General";

const messages = document.getElementById("messages");
const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPicker = document.getElementById("emoji-picker");
const clearBtn = document.getElementById("clear-btn");

document.getElementById("msg").focus();

socket.emit("joinRoom", { name, room });

socket.on("message", (message) => {
  const li = document.createElement("div");
  li.className = "message";
  li.setAttribute("data-id", message.id);

  li.innerHTML = `
    <span class="timestamp">${message.time}</span>
    <strong>${message.user === name ? "You" : message.user}</strong>: ${message.text}
    <button class="react-btn" data-id="${message.id}">😊</button>
    <div class="reactions" id="reactions-${message.id}"></div>
  `;

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

// Form submit (send message)
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = input.value.trim();
  if (msg !== "") {
    socket.emit("chatMessage", msg);
    input.value = "";
  }
});

// Clear all messages
clearBtn.addEventListener("click", () => {
  messages.innerHTML = "";
});

// Show emoji picker when 😊 button clicked
messages.addEventListener("click", (e) => {
  if (e.target.classList.contains("react-btn")) {
    const msgId = e.target.dataset.id;
    emojiPicker.setAttribute("data-msg-id", msgId);
    emojiPicker.style.display = "block";
    emojiPicker.scrollIntoView({ behavior: "smooth" });
  }
});

// Emoji list
const emojiList = ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","😉","😍","😘","😋","😛","😜","🤪","😝","🤗","🤫","🤔","😐","😑","😶","😏","😒","🙄","😬","🥵","🥶","😎","🤓","🧐","😕","🙁","😮","😲","😳","🥺","😢","😭","😱","😖","😞","😓","😫","🥱","😤","😡","😠","🤬"];

emojiList.forEach((emoji) => {
  const span = document.createElement("span");
  span.textContent = emoji;
  span.addEventListener("click", () => {
    const msgId = emojiPicker.getAttribute("data-msg-id");
    if (msgId) {
      socket.emit("addReaction", { messageId: msgId, emoji });
      emojiPicker.style.display = "none";
    }
  });
  emojiPicker.appendChild(span);
});

// Reaction handler
socket.on("reactionAdded", ({ messageId, emoji }) => {
  const target = document.getElementById(`reactions-${messageId}`);
  if (target) {
    target.innerHTML += `${emoji} `;
  }
});
