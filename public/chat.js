const socket = io();

const urlParams = new URLSearchParams(window.location.search);
const name = urlParams.get("name");
const room = urlParams.get("room");

const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");
const roomNameElem = document.getElementById("room-name");
const userList = document.getElementById("user-list");
const clearButton = document.getElementById("clearChat");
const fileInput = document.getElementById("fileInput");
const uploadProgress = document.getElementById("uploadProgress");
const emojiPicker = document.getElementById("emoji-picker");

const emojiList = ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","😘","😗","😋","😜","🤪","😎","😭","😡","😱"];

if (name && room) {
  socket.emit("joinRoom", { name, room });
  roomNameElem.innerText = `${room} Room`;
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
  const li = document.createElement("li");
  li.classList.add("message");
  li.id = `msg-${message.id}`; // Unique ID

  if (message.user === "System") {
    li.classList.add("system");
    li.innerText = message.text;
  } else {
    li.classList.add(message.user === name ? "sender" : "receiver");
    li.innerHTML = `
      <span class="timestamp">${message.time}</span> 
      <strong>${message.user === name ? "You" : message.user}</strong>: ${message.text}
      <div class="reactions"></div>
    `;
  }

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

let typingTimeout;
input.addEventListener("input", () => {
  socket.emit("typing", true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing", false);
  }, 3000);
});

socket.on("typing", (text) => {
  typing.innerText = text || "";
});

clearButton.addEventListener("click", () => {
  messages.innerHTML = "";
});

socket.on("roomUsers", ({ users }) => {
  userList.innerHTML = "";
  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user.name;
    userList.appendChild(li);
  });
});

fileInput?.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    alert("❌ File too large. Max 5MB allowed.");
    return;
  }

  const reader = new FileReader();
  reader.onloadstart = () => {
    uploadProgress.style.display = "block";
    uploadProgress.value = 0;
  };
  reader.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = (e.loaded / e.total) * 100;
      uploadProgress.value = percent;
    }
  };
  reader.onload = () => {
    const base64 = reader.result;
    socket.emit("fileUpload", {
      fileName: file.name,
      fileData: base64,
      fileType: file.type,
    });
    uploadProgress.style.display = "none";
    fileInput.value = "";
  };
  reader.readAsDataURL(file);
});

socket.on("fileShared", ({ user, fileName, fileData, fileType, time }) => {
  const li = document.createElement("li");
  li.classList.add("message", user === name ? "sender" : "receiver");

  const blob = new Blob([Uint8Array.from(atob(fileData.split(',')[1]), c => c.charCodeAt(0))], { type: fileType });
  const downloadUrl = URL.createObjectURL(blob);

  const fileExt = fileName.split('.').pop().toLowerCase();
  const fileIcons = {
    pdf: "📄", doc: "📝", docx: "📝", txt: "📃",
    jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️",
    zip: "🗜️", mp4: "🎥", mp3: "🎵", default: "📁"
  };
  const icon = fileIcons[fileExt] || fileIcons.default;

  let content = fileType.startsWith("image/")
    ? `<a href="${downloadUrl}" download="${fileName}" target="_blank">
         <img src="${downloadUrl}" alt="${fileName}" class="shared-img" />
       </a>`
    : `<a href="${downloadUrl}" download="${fileName}" class="file-link">${icon} ${fileName}</a>`;

  li.innerHTML = `
    <span class="timestamp">${time}</span> 
    <strong>${user === name ? "You" : user}</strong>: ${content}
  `;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

// ✅ Emoji Picker Rendering
emojiList.forEach((emoji) => {
  const span = document.createElement("span");
  span.textContent = emoji;
  span.addEventListener("click", () => {
    const lastMsg = messages.lastElementChild;
    if (lastMsg && lastMsg.id) {
      const messageId = lastMsg.id.replace("msg-", "");
      socket.emit("addReaction", { messageId, emoji });
    }
  });
  emojiPicker.appendChild(span);
});

// ✅ Handle incoming reactions
socket.on("reactionAdded", ({ messageId, emoji }) => {
  const msgElem = document.getElementById(`msg-${messageId}`);
  if (msgElem) {
    let reactionBox = msgElem.querySelector(".reactions");
    if (!reactionBox) {
      reactionBox = document.createElement("div");
      reactionBox.className = "reactions";
      msgElem.appendChild(reactionBox);
    }
    const span = document.createElement("span");
    span.textContent = emoji;
    reactionBox.appendChild(span);
  }
});
