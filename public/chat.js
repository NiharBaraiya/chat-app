<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Room Chat</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="chat-container">

    <!-- ✅ Sidebar for users -->
    <aside class="sidebar">
      <h3>👥 Users List</h3>
      <br>
      <ul id="user-list"></ul>
    </aside>
    <br>

    <!-- ✅ Chat Area -->
    <div class="chat-main">
      <h2 id="room-name">Room Chat</h2>
      <ul id="messages"></ul>
      <p id="typing"></p>

      <form id="chatForm">
        <input id="msg" type="text" placeholder="Your message..." required />
        <label class="upload-btn">
          📁 Choose File
          <input type="file" id="fileInput" accept="image/*,.pdf,.doc,.txt" />
        </label>
        <button type="submit">Send</button>
        <button type="button" id="clearChat" class="clear-btn">🧹 Clear Chat</button>
      </form>
      <progress id="uploadProgress" value="0" max="100" style="display: none;"></progress>
    </div>

  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script src="chat.js"></script>
</body>
</html>
