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
const pinnedContainer = document.getElementById("pinned-messages");

if (name && room) {
  socket.emit("joinRoom", { name, room });
  roomNameElem.innerText = `${room} Room`;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    socket.emit("chatMessage", { text: input.value, id: messageId });
    input.value = "";
    input.focus();
  }
});

messages.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const li = e.target.closest("li.chat-message.sender");
  if (!li) return;

  const messageId = li.dataset.id;
  const currentText = li.dataset.text;
  if (!messageId) return;

  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.innerHTML = `
    <button class="edit-btn">✏️ Edit</button>
    <button class="delete-btn">🗑️ Delete</button>
    <button class="pin-btn">📌 Pin</button>
  `;
  document.body.appendChild(menu);
  menu.style.top = `${e.pageY}px`;
  menu.style.left = `${e.pageX}px`;

  const removeMenu = () => menu.remove();
  document.addEventListener("click", removeMenu, { once: true });

  menu.querySelector(".edit-btn").onclick = () => {
    const newText = prompt("Edit your message:", currentText);
    if (newText && newText !== currentText) {
      socket.emit("editMessage", { messageId, newText });
    }
  };

  menu.querySelector(".delete-btn").onclick = () => {
    if (confirm("Are you sure you want to delete this message?")) {
      socket.emit("deleteMessage", messageId);
    }
  };

  menu.querySelector(".pin-btn").onclick = () => {
    socket.emit("pinMessage", messageId);
  };
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const msgElem = entry.target;
        const msgId = msgElem.dataset.id;
        const isReceiver = msgElem.classList.contains("receiver");
        if (isReceiver && msgId) {
          socket.emit("seenMessage", msgId);
          observer.unobserve(msgElem);
        }
      }
    });
  },
  { threshold: 1.0 }
);

socket.on("message", (message) => {
  const li = document.createElement("li");
  li.classList.add("chat-message");
  li.dataset.id = message.id;
  li.dataset.text = message.text;
  li.id = message.id;

  if (message.user === "System") {
    li.classList.add("system-msg");
    li.innerText = message.text;
  } else if (message.user === name) {
    li.classList.add("sender");
    li.innerHTML = `<strong>You:</strong> ${message.text} <span class="seen-check" id="seen-${message.id}" data-status="sent">✔</span>`;
  } else {
    li.classList.add("receiver");
    li.innerHTML = `<strong>${message.user}:</strong> ${message.text}`;
    observer.observe(li);
  }

  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

socket.on("messageSeen", (messageId) => {
  const span = document.getElementById(`seen-${messageId}`);
  if (span) {
    span.textContent = "✔✔";
    span.setAttribute("data-status", "seen");
    span.style.color = "blue";
    span.title = "Seen";
  }
});

socket.on("messageEdited", ({ messageId, newText }) => {
  const msgElem = document.getElementById(messageId);
  if (msgElem) {
    const textSpan = msgElem.querySelector(".msg-text");
    if (textSpan) {
      textSpan.textContent = newText + " (edited)";
    } else {
      msgElem.innerHTML = msgElem.innerHTML.replace(/>.*</, `> ${newText} (edited) <`);
    }
  }
});

socket.on("messageDeleted", (messageId) => {
  const msgElem = document.getElementById(messageId);
  if (msgElem) {
    msgElem.remove();
  }
});

socket.on("messagePinned", (msg) => {
  const originalMsg = document.getElementById(msg.id);
  if (originalMsg && !originalMsg.classList.contains("pinned-highlight")) {
    const pinIcon = document.createElement("span");
    pinIcon.className = "pin-icon";
    pinIcon.textContent = " 📌";
    originalMsg.appendChild(pinIcon);
    originalMsg.classList.add("pinned-highlight");
  }
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

  li.innerHTML = `<strong>${user === name ? "You" : user}:</strong> ${content}`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});

const emojiBtn = document.getElementById("emoji-btn");
const emojiPanel = document.getElementById("emoji-panel");
const emojiInput = document.getElementById("msg");
const emojiList = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","😘","😗",
  "😙","😚","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶",
  "😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵",
  "🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳",
  "🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤",
  "😡","😠","🤬","😈","👿"
];
emojiList.forEach(emoji => {
  const btn = document.createElement("button");
  btn.textContent = emoji;
  btn.type = "button";
  btn.className = "emoji-btn";
  btn.addEventListener("click", () => {
    emojiInput.value += emoji;
    emojiInput.focus();
    emojiPanel.style.display = "none";
  });
  emojiPanel.appendChild(btn);
});
emojiBtn.addEventListener("click", () => {
  emojiPanel.style.display = emojiPanel.style.display === "none" ? "block" : "none";
});
document.addEventListener("click", (e) => {
  if (!emojiPanel.contains(e.target) && e.target !== emojiBtn) {
    emojiPanel.style.display = "none";
  }
});
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");

searchButton.addEventListener("click", () => {
  const keyword = searchInput.value.trim().toLowerCase();
  if (!keyword) return;

  const allMessages = document.querySelectorAll("#messages .chat-message");
  let found = false;

  allMessages.forEach(msg => {
    msg.classList.remove("search-highlight");
  });

  for (const msg of allMessages) {
    const text = msg.dataset.text || msg.textContent;
    if (text.toLowerCase().includes(keyword)) {
      msg.scrollIntoView({ behavior: "smooth", block: "center" });
      msg.classList.add("search-highlight");
      found = true;

      setTimeout(() => {
        msg.classList.remove("search-highlight");
      }, 5000); // remove highlight after 5 sec
      break;
    }
  }

  if (!found) {
    alert("No matching message found.");
  }
});
