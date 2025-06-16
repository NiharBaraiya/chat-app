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
const languageSelect = document.getElementById("language");
const form = document.getElementById("chatForm");
const msgInput = document.getElementById("msg");
const messages = document.getElementById("messages");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");

let selectedLang = "hi"; // default to Hindi

const languageSelect = document.getElementById("language");

// ✅ Add temporary "Loading..." option
const loadingOption = document.createElement("option");
loadingOption.value = "";
loadingOption.textContent = "🌐 Loading languages...";
languageSelect.appendChild(loadingOption);

// ✅ Fetch languages from LibreTranslate
fetch("https://libretranslate.com/languages")
  .then((res) => res.json())
  .then((languages) => {
    languageSelect.innerHTML = ""; // Clear "Loading..." option

    languages.forEach((lang) => {
      const option = document.createElement("option");
      option.value = lang.code;
      option.textContent = lang.name;
      languageSelect.appendChild(option);
    });

    // Set default language
    languageSelect.value = "hi";
    translateUI(); // Translate UI initially
  })
  .catch((err) => {
    console.error("Failed to load languages:", err);
    languageSelect.innerHTML = "";
    const errorOption = document.createElement("option");
    errorOption.value = "";
    errorOption.textContent = "❌ Failed to load languages";
    languageSelect.appendChild(errorOption);
  });


// ✅ Translate UI dynamically
function translateUI() {
  const elementsToTranslate = {
    title: "Multi-language Chat",
    languageLabel: "Select Language:",
    sendBtn: "Send",
    clearBtn: "Clear Chat",
    msg: "Type your message..."
  };

  for (let id in elementsToTranslate) {
    translateText(elementsToTranslate[id], selectedLang).then((translated) => {
      if (id === "msg") {
        msgInput.placeholder = translated;
      } else {
        const el = document.getElementById(id);
        if (el) el.textContent = translated;
      }
    });
  }
}

// ✅ Submit message
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const originalText = msgInput.value.trim();
  if (!originalText) return;

  const translated = await translateText(originalText, selectedLang);
  const li = document.createElement("li");
  li.textContent = translated;
  messages.appendChild(li);
  msgInput.value = "";
});

// ✅ Clear chat
clearBtn.addEventListener("click", () => {
  messages.innerHTML = "";
});

// ✅ Translate using LibreTranslate
async function translateText(text, targetLang) {
  try {
    const res = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "auto",
        target: targetLang,
        format: "text"
      })
    });
    const data = await res.json();
    return data.translatedText;
  } catch (err) {
    console.error("Translation failed:", err);
    return text;
  }
}

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
socket.on("message", (message) => {
  const li = document.createElement("li");
  li.classList.add("message");

  if (message.user === "System") {
    li.classList.add("system");
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
