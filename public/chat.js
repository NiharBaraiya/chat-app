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
const languageSelect = document.getElementById("languageSelect");

let selectedLang = "hi";

// Load language list from working LibreTranslate mirror
const loadingOption = document.createElement("option");
loadingOption.value = "";
loadingOption.textContent = "🌐 Loading languages...";
languageSelect.innerHTML = "";
languageSelect.appendChild(loadingOption);

fetch("https://libretranslate.de/languages")
  .then((res) => res.json())
  .then((languages) => {
    languageSelect.innerHTML = "";
    languages.forEach((lang) => {
      const option = document.createElement("option");
      option.value = lang.code;
      option.textContent = lang.name;
      languageSelect.appendChild(option);
    });
    languageSelect.value = selectedLang;
    translateUI();
  })
  .catch((err) => {
    console.error("Failed to load languages", err);
    languageSelect.innerHTML = "<option value=''>❌ Language load error</option>";
  });

languageSelect.addEventListener("change", () => {
  selectedLang = languageSelect.value;
  translateUI();
});

// Translate UI
function translateUI() {
  const elementsToTranslate = {
    roomName: "Room Chat",
    msg: "Your message...",
    clearChat: "Clear Chat",
    chatFormBtn: "Send",
    typing: "",
    uploadLabel: "Send File:",
    sidebarTitle: "Users List"
  };

  for (const [id, text] of Object.entries(elementsToTranslate)) {
    translateText(text, selectedLang).then((translated) => {
      const safeText = translated || text;
      switch (id) {
        case "msg":
          input.placeholder = safeText;
          break;
        case "chatFormBtn":
          form.querySelector("button[type='submit']").textContent = safeText;
          break;
        case "clearChat":
          clearButton.textContent = `🧹 ${safeText}`;
          break;
        case "roomName":
          if (roomNameElem) roomNameElem.textContent = safeText;
          break;
        case "typing":
          if (typing) typing.textContent = safeText;
          break;
        case "uploadLabel":
          const label = document.querySelector("label[for='fileInput']");
          if (label) label.textContent = `📁 ${safeText}`;
          break;
        case "sidebarTitle":
          const sidebarTitle = document.querySelector(".sidebar h3");
          if (sidebarTitle) sidebarTitle.textContent = `👥 ${safeText}`;
          break;
      }
    });
  }
}

// Translate using LibreTranslate.de
async function translateText(text, targetLang) {
  if (!text || !targetLang) return text;
  try {
    const res = await fetch("https://libretranslate.de/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "auto", target: targetLang, format: "text" })
    });
    const data = await res.json();
    return data.translatedText || text;
  } catch (err) {
    console.error("Translation failed:", err);
    return text;
  }
}

// Join room
if (name && room) {
  socket.emit("joinRoom", { name, room });
  translateText(`${room} Room`, selectedLang).then((translatedRoom) => {
    if (roomNameElem) roomNameElem.textContent = translatedRoom;
  });

  // Welcome Message
  translateText(`Welcome ${name}!`, selectedLang).then((translatedWelcome) => {
    const li = document.createElement("li");
    li.classList.add("message", "system");
    li.textContent = translatedWelcome;
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
  });
}

// Submit message
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const originalText = input.value.trim();
  if (!originalText) return;

  const translated = await translateText(originalText, selectedLang);
  socket.emit("chatMessage", translated);
  input.value = "";
  input.focus();
});

// Clear chat
clearButton.addEventListener("click", () => {
  messages.innerHTML = "";
});

// Typing status
let typingTimeout;
input.addEventListener("input", () => {
  socket.emit("typing", true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit("typing", false), 1000);
});

socket.on("typing", (text) => {
  typing.innerText = text || "";
});

// Receive message
socket.on("message", (message) => {
  const li = document.createElement("li");
  li.classList.add("message");

  if (message.user === "System") {
    li.classList.add("system");
    li.textContent = message.text;
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

// User list
socket.on("roomUsers", ({ users }) => {
  userList.innerHTML = "";
  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user.name;
    userList.appendChild(li);
  });
});

// File upload
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
    if (e.lengthComputable) uploadProgress.value = (e.loaded / e.total) * 100;
  };
  reader.onload = () => {
    const base64 = reader.result;
    socket.emit("fileUpload", { fileName: file.name, fileData: base64, fileType: file.type });
    uploadProgress.style.display = "none";
    fileInput.value = "";
  };
  reader.readAsDataURL(file);
});

// Receive file
socket.on("fileShared", ({ user, fileName, fileData, fileType, time }) => {
  const li = document.createElement("li");
  li.classList.add("message", user === name ? "sender" : "receiver");
  const blob = new Blob([Uint8Array.from(atob(fileData.split(',')[1]), c => c.charCodeAt(0))], { type: fileType });
  const downloadUrl = URL.createObjectURL(blob);
  const iconMap = {
    pdf: "📄", doc: "📝", docx: "📝", txt: "📃",
    jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️",
    zip: "🗜️", mp4: "🎥", mp3: "🎵", default: "📁"
  };
  const ext = fileName.split(".").pop().toLowerCase();
  const icon = iconMap[ext] || iconMap.default;
  const content = fileType.startsWith("image/")
    ? `<a href="${downloadUrl}" download="${fileName}" target="_blank"><img src="${downloadUrl}" class="shared-img" alt="${fileName}" /></a>`
    : `<a href="${downloadUrl}" download="${fileName}" class="file-link">${icon} ${fileName}</a>`;
  li.innerHTML = `<span class="timestamp">${time}</span> <strong>${user === name ? "You" : user}</strong>: ${content}`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});
