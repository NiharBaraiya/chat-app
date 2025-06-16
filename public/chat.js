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

// Fetch supported languages from API
async function populateLanguages() {
  try {
    const res = await fetch("https://libretranslate.com/languages");
    const langs = await res.json();

    languageSelect.innerHTML = ""; // Clear default option

    langs.forEach(lang => {
      const option = document.createElement("option");
      option.value = lang.code;
      option.textContent = lang.name;
      languageSelect.appendChild(option);
    });

    // Restore previously selected language
    const savedLang = localStorage.getItem("chatLang");
    if (savedLang) languageSelect.value = savedLang;
  } catch (err) {
    console.error("Failed to load languages", err);
    languageSelect.innerHTML = `<option value="en">English</option>`;
  }
}

document.addEventListener("DOMContentLoaded", populateLanguages);

languageSelect.addEventListener("change", () => {
  localStorage.setItem("chatLang", languageSelect.value);
});

// ✅ Join room if name and room exist
if (name && room) {
  socket.emit("joinRoom", { name, room });
  if (roomNameElem) {
    roomNameElem.innerText = `${room} Room`;
  }
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
socket.on("message", async (message) => {
  const targetLang = localStorage.getItem("chatLang") || "en";

  let translatedText = message.text;

  if (targetLang !== "en" && message.user !== "System") {
    try {
      translatedText = await translateText(message.text, targetLang);
    } catch (err) {
      console.warn("Translation failed", err);
    }
  }

  const li = document.createElement("li");
  li.classList.add("message");

  if (message.user === "System") {
    li.classList.add("system");
    li.innerText = translatedText;
  } else if (message.user === name) {
    li.classList.add("sender");
    li.innerHTML = `<span class="timestamp">${message.time}</span> <strong>You</strong>: ${translatedText}`;
  } else {
    li.classList.add("receiver");
    li.innerHTML = `<span class="timestamp">${message.time}</span> <strong>${message.user}</strong>: ${translatedText}`;
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

// ✅ Clear chat button
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

// ✅ File Upload
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

// ✅ Receive file in chat
socket.on("fileShared", ({ user, fileName, fileData, fileType, time }) => {
  const li = document.createElement("li");
  li.classList.add("message", user === name ? "sender" : "receiver");

  const blob = new Blob([Uint8Array.from(atob(fileData.split(',')[1]), c => c.charCodeAt(0))], { type: fileType });
  const downloadUrl = URL.createObjectURL(blob);

  let content = "";
  const fileExt = fileName.split('.').pop().toLowerCase();

  const fileIcons = {
    pdf: "📄",
    doc: "📝",
    docx: "📝",
    txt: "📃",
    jpg: "🖼️",
    jpeg: "🖼️",
    png: "🖼️",
    gif: "🖼️",
    zip: "🗜️",
    mp4: "🎥",
    mp3: "🎵",
    default: "📁"
  };

  const icon = fileIcons[fileExt] || fileIcons.default;

  if (fileType.startsWith("image/")) {
    content = `
      <a href="${downloadUrl}" download="${fileName}" target="_blank">
        <img src="${downloadUrl}" alt="${fileName}" class="shared-img" />
      </a>`;
  } else {
    content = `<a href="${downloadUrl}" download="${fileName}" class="file-link">${icon} ${fileName}</a>`;
  }

  li.innerHTML = `
    <span class="timestamp">${time}</span> <strong>${user === name ? "You" : user}</strong>: ${content}
  `;

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});
async function translateText(text, targetLang) {
  const res = await fetch("https://libretranslate.com/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      q: text,
      source: "auto",
      target: targetLang,
      format: "text"
    })
  });

  const data = await res.json();
  return data.translatedText;
}
