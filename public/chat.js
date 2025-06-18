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

// ✅ Join room
if (name && room) {
  socket.emit("joinRoom", { name, room });
  roomNameElem.innerText = `${room} Room`;
}

// ✅ Send message
form.addEventListener("submit", function (e) {
  e.preventDefault();
  const message = input.value.trim();
  if (message) {
    socket.emit("chatMessage", message);
    input.value = "";
    input.focus();
  }
});

// ✅ Receive message
socket.on("message", (message) => {
  const li = document.createElement("li");
  li.classList.add("chat-message");

  if (message.user === "System") {
    li.classList.add("system-msg");
    li.innerText = message.text;
  } else if (message.user === name) {
    li.classList.add("sender");
    li.innerHTML = `<span class="timestamp">${message.time}</span> <strong>You</strong>: ${message.text}`;
  } else {
    li.classList.add("receiver");
    li.innerHTML = `<span class="timestamp">${message.time}</span> <strong>${message.user}</strong>: ${message.text}`;
  }

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

// ✅ Typing status
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

// ✅ Clear chat
clearButton.addEventListener("click", () => {
  messages.innerHTML = "";
});

// ✅ Update user list
socket.on("roomUsers", ({ users }) => {
  userList.innerHTML = "";
  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user.name;
    userList.appendChild(li);
  });
});

// ✅ File upload handler
fileInput?.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const maxSize = 5 * 1024 * 1024; // 5MB
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

// ✅ Receive file
socket.on("fileShared", ({ user, fileName, fileData, fileType, time }) => {
  const li = document.createElement("li");
  li.classList.add("chat-message", user === name ? "sender" : "receiver");

  const blob = new Blob(
    [Uint8Array.from(atob(fileData.split(',')[1]), c => c.charCodeAt(0))],
    { type: fileType }
  );
  const downloadUrl = URL.createObjectURL(blob);

  const fileExt = fileName.split('.').pop().toLowerCase();
  const fileIcons = {
    pdf: "📄", doc: "📝", docx: "📝", txt: "📃",
    jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️",
    zip: "🗜️", mp4: "🎥", mp3: "🎵", default: "📁"
  };
  const icon = fileIcons[fileExt] || fileIcons.default;

  let content;
  if (fileType.startsWith("image/")) {
    content = `
      <a href="${downloadUrl}" download="${fileName}" target="_blank">
        <img src="${downloadUrl}" alt="${fileName}" class="shared-img" />
      </a>`;
  } else {
    content = `<a href="${downloadUrl}" download="${fileName}" class="file-link">${icon} ${fileName}</a>`;
  }

  li.innerHTML = `<span class="timestamp">${time}</span> <strong>${user === name ? "You" : user}</strong>: ${content}`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});
// ✅ Emoji Logic
const emojiBtn = document.getElementById("emoji-btn");
const emojiPanel = document.getElementById("emoji-panel");
const emojiInput = document.getElementById("msg");

// List of emojis to show (you can add more!)
const emojiList = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","😘","😗",
  "😙","😚","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶",
  "😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵",
  "🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳",
  "🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤",
  "😡","😠","🤬","😈","👿"
];


// Populate the emoji panel
emojiList.forEach(emoji => {
  const btn = document.createElement("button");
  btn.textContent = emoji;
  btn.type = "button";
  btn.className = "emoji-btn";
  btn.addEventListener("click", () => {
    emojiInput.value += emoji;
    emojiInput.focus();
    emojiPanel.style.display = "none"; // auto-close panel
  });
  emojiPanel.appendChild(btn);
});

// Toggle emoji panel
emojiBtn.addEventListener("click", () => {
  emojiPanel.classList.toggle("show");
});

// Hide panel if clicked outside
document.addEventListener("click", (e) => {
  if (!emojiPanel.contains(e.target) && e.target !== emojiBtn) {
    emojiPanel.style.display = "none";
  }
});
