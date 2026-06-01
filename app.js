/* ═══════════════════════════════════════════════════════════════
   WebMSG  —  app.js
   Multi-server, multi-channel logic.
═══════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────
   DOM Elements
────────────────────────────────────────────── */
const el = {
  // Layout
  railServers: document.getElementById('rail-servers'),
  btnAddServer: document.getElementById('btn-add-server'),
  
  leftPanel: document.getElementById('left-panel'),
  rightPanel: document.getElementById('right-panel'),
  
  // Left Panel (Server Info & Channels)
  serverName: document.getElementById('current-server-name'),
  roleBadge: document.getElementById('current-role-badge'),
  inviteCode: document.getElementById('display-invite-code'),
  btnCopyCode: document.getElementById('btn-copy-code'),
  btnLeaveServer: document.getElementById('btn-leave-server'),
  channelList: document.getElementById('channel-list'),
  btnCreateChannel: document.getElementById('btn-create-channel'),

  // Main Chat
  activeChannelName: document.getElementById('active-channel-name'),
  messageFeed: document.getElementById('message-feed'),
  inputArea: document.getElementById('input-area'),

  // Chat Input
  chatForm: document.getElementById('chat-form'),
  messageInput: document.getElementById('message-input'),
  btnEmoji: document.getElementById('btn-emoji'),
  emojiPicker: document.getElementById('emoji-picker'),
  btnAttach: document.getElementById('btn-attach'),
  fileInput: document.getElementById('file-input'),
  uploadContainer: document.getElementById('upload-progress-container'),
  uploadFill: document.getElementById('upload-progress-fill'),
  uploadFilename: document.getElementById('upload-filename'),
  uploadPercent: document.getElementById('upload-percent'),

  // Right Panel (Members)
  memberCount: document.getElementById('member-count'),
  memberList: document.getElementById('member-list'),
  myAvInitial: document.getElementById('my-av-initial'),
  myUsername: document.getElementById('my-username-display'),

  // Landing / Intro Modal
  landingPage: document.getElementById('landing-page'),
  btnCloseLanding: document.getElementById('btn-close-landing'),
  toggleHost: document.getElementById('toggle-host'),
  toggleJoin: document.getElementById('toggle-join'),
  btnAuthAction: document.getElementById('btn-auth-action'),
  usernameInp: document.getElementById('username'),
  serverNameInp: document.getElementById('server-name'),
  inviteCodeGroup: document.getElementById('invite-code-group'),
  inviteCodeInp: document.getElementById('invite-code'),
  
  // Uploads
  btnUploadAvatar: document.getElementById('btn-upload-avatar'),
  inpAvatar: document.getElementById('inp-avatar'),
  avatarPreview: document.getElementById('avatar-preview'),
  btnUploadLogo: document.getElementById('btn-upload-logo'),
  inpLogo: document.getElementById('inp-logo'),
  logoPreview: document.getElementById('logo-preview'),
  
  // Channel Modal
  modalCreateChannel: document.getElementById('modal-create-channel'),
  btnCloseChannelModal: document.getElementById('btn-close-channel-modal'),
  newChannelName: document.getElementById('new-channel-name'),
  btnConfirmCreateChannel: document.getElementById('btn-confirm-create-channel'),

  // Toasts & Modals
  undoToast: document.getElementById('undo-toast'),
  btnUndoDelete: document.getElementById('btn-undo-delete'),
  errorToast: document.getElementById('error-toast'),
  errorToastMsg: document.getElementById('error-toast-msg'),
  
  // Image Viewer
  imageViewer: document.getElementById('image-viewer'),
  imageViewerImg: document.getElementById('image-viewer-img'),
  btnCloseViewer: document.getElementById('btn-close-viewer')
};

/* ──────────────────────────────────────────────
   State Management
────────────────────────────────────────────── */
// Data structure:
// servers = {
//   [roomId]: {
//     id: roomId,
//     name: string,
//     isHost: boolean,
//     username: string,
//     channels: [{id, name}],
//     members: [{id, name, isHost}],
//     history: [{id, channelId, senderId, senderName, text, time, file, isHost}]
//   }
// }
let savedServers = JSON.parse(localStorage.getItem('webmsg_servers')) || {};
let activeServerId = null;
let activeChannelId = 'general';

// State variables for uploads
let currentAvatarBase64 = null;
let currentLogoBase64 = null;

// Network objects mapped by roomId
// activeConnections[roomId] = { peer, connections[], status }
let activeConnections = {}; 

let isJoinMode = false;
let pendingUndo = null;
let undoTimer = null;

const EMOJIS = [
  // Faces & Emotions
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
  "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸",
  "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️",
  "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😮‍💨", "😤", "😠",
  "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥",
  "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬",
  "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪",
  "😵", "😵‍💫", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕",
  "🤠", "🤡", "🥳", "🥸", "👻", "💀", "☠️", "👽", "👾", "🤖",

  // Hands, Gestures & Body
  "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞",
  "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍",
  "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝",
  "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂",
  "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅",

  // Hearts, Sparks & Effects
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
  "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
  "💟", "💥", "🔥", "✨", "🌟", "⭐", "⚡", "☄️", "💥", "💯",
  "🎉", "🎊", "🎈", "🔮", "🪄", "🧿", "🛎️", "🎀", "🎁", "🎫",

  // Animals & Nature
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨",
  "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🦆",
  "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛",
  "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🪳", "🦂", "🕸️", "🕷️",
  "🐢", "🐍", "🦎", "🐙", "🦑", "🦞", "🦀", "🐡", "🐠", "🐟",
  "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧",

  // Food & Drink
  "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐",
  "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑",
  "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅",
  "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳",
  "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🌭", "🍔", "🍟",
  "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🍿",

  // Travel, Places & Objects
  "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐",
  "🛻", "🚚", "🚛", "🚜", "🛵", "🏍️", "🛺", "🚲", "🛴", "🛹",
  "🚏", "🗺️", "🗿", "🗽", "🗼", "🏰", "🏯", "🏟️", "🎡", "🎢",
  "🚀", "🛸", "🚁", "🛶", "⛵", "🚤", "🛳️", "⛴️", "🚢", "⚓",
  "💻", "🖥️", "🖨️", "⌨️", "🖱️", "🖲️", "🗜️", "💽", "💾", "💿"
];
const MAX_FILE = 10 * 1024 * 1024;
const UNDO_MS = 5000;

/* ──────────────────────────────────────────────
   Helpers
────────────────────────────────────────────── */
function genId(len=6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
function ts() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function saveState() {
  localStorage.setItem('webmsg_servers', JSON.stringify(savedServers));
}
function getActiveSrv() { return savedServers[activeServerId]; }
function getActiveNet() { return activeConnections[activeServerId]; }

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024, dm = 2, sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/* ──────────────────────────────────────────────
   Toasts & Modals
────────────────────────────────────────────── */
let errorTimer = null;
function showErrorToast(msg) {
  if (errorTimer) clearTimeout(errorTimer);
  el.errorToastMsg.textContent = msg;
  el.errorToast.classList.add('show');
  errorTimer = setTimeout(() => el.errorToast.classList.remove('show'), 4000);
}

function compressImage(file, maxSize, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > h) { if (w > maxSize) { h *= maxSize / w; w = maxSize; } }
      else { if (h > maxSize) { w *= maxSize / h; h = maxSize; } }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

el.btnCloseViewer.addEventListener('click', () => {
  el.imageViewer.classList.remove('active');
  setTimeout(() => el.imageViewerImg.src = '', 300);
});
el.imageViewer.addEventListener('click', (e) => {
  if (e.target === el.imageViewer) el.btnCloseViewer.click();
});

/* ──────────────────────────────────────────────
   UI Rendering
────────────────────────────────────────────── */
function renderApp() {
  renderServerRail();
  
  if (!activeServerId) {
    el.leftPanel.style.opacity = '0.3';
    el.leftPanel.style.pointerEvents = 'none';
    el.rightPanel.style.opacity = '0.3';
    el.inputArea.style.opacity = '0.3';
    el.inputArea.style.pointerEvents = 'none';
    el.messageFeed.innerHTML = '<div class="sys-msg"><span>Select or create a server to start chatting.</span></div>';
    
    // Show landing page if no servers exist
    if (Object.keys(savedServers).length === 0) {
      el.landingPage.classList.add('active');
      el.btnCloseLanding.style.display = 'none';
    }
    return;
  }

  // A server is active
  const srv = getActiveSrv();
  if (!srv) return;

  el.landingPage.classList.remove('active');

  el.leftPanel.style.opacity = '1';
  el.leftPanel.style.pointerEvents = 'auto';
  el.rightPanel.style.opacity = '1';
  el.inputArea.style.opacity = '1';
  el.inputArea.style.pointerEvents = 'auto';

  // Info
  el.serverName.textContent = srv.name;
  el.roleBadge.textContent = srv.isHost ? 'Host' : 'Guest';
  el.inviteCode.textContent = srv.id;
  el.myAvInitial.textContent = srv.username.charAt(0).toUpperCase();
  el.myUsername.textContent = srv.username;
  el.btnCreateChannel.style.display = srv.isHost ? 'block' : 'none';

  renderChannels();
  renderMembers();
  renderMessages();
}

function renderServerRail() {
  el.railServers.innerHTML = '';
  Object.values(savedServers).forEach(srv => {
    const btn = document.createElement('button');
    btn.className = `rail-btn ${srv.id === activeServerId ? 'active' : ''}`;
    btn.title = srv.name;
    
    if (srv.logo) {
      btn.style.backgroundImage = `url(${srv.logo})`;
      btn.style.backgroundSize = 'cover';
      btn.style.backgroundPosition = 'center';
      btn.style.color = 'transparent';
    } else {
      btn.textContent = srv.name.charAt(0).toUpperCase();
    }
    
    // Show a dot if disconnected? (For now, assume connected if we have a peer object)
    if (!activeConnections[srv.id]) {
      btn.style.opacity = '0.5';
    }

    btn.addEventListener('click', () => {
      activeServerId = srv.id;
      // Default to general channel on switch
      activeChannelId = 'general';
      renderApp();
    });
    el.railServers.appendChild(btn);
  });
}

function renderChannels() {
  const srv = getActiveSrv();
  if (!srv) return;
  el.channelList.innerHTML = '';
  srv.channels.forEach(ch => {
    const li = document.createElement('li');
    li.className = `list-item ${ch.id === activeChannelId ? 'active' : ''}`;
    li.innerHTML = `<i class="ph ph-hash"></i> <span>${ch.name}</span>`;
    li.addEventListener('click', () => {
      activeChannelId = ch.id;
      renderApp(); // re-render messages and active state
    });
    el.channelList.appendChild(li);
  });
  
  const actCh = srv.channels.find(c => c.id === activeChannelId);
  el.activeChannelName.textContent = actCh ? actCh.name : 'general';
}

function renderMembers() {
  const srv = getActiveSrv();
  if (!srv) return;
  el.memberCount.textContent = srv.members.length;
  el.memberList.innerHTML = '';
  
  srv.members.forEach(m => {
    const isSelf = m.name === srv.username;
    const li = document.createElement('li');
    li.className = `m-item ${m.isHost ? 'is-host' : ''}`;
    const avContent = m.avatar ? `<img src="${m.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : m.name.charAt(0).toUpperCase();
    const kickBtn = srv.isHost && !m.isHost ? `<button class="kick-btn" data-id="${m.id}" title="Kick"><i class="ph ph-user-x"></i></button>` : '';
    li.innerHTML = `
      <div class="m-av">${avContent}${m.isHost ? '<span class="m-crown" title="Host">👑</span>' : ''}</div>
      <span class="m-name">${m.name}${isSelf ? ' (You)' : ''}</span>
      ${kickBtn}
    `;
    el.memberList.appendChild(li);
  });
  
  // Add kick logic
  el.memberList.querySelectorAll('.kick-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = btn.getAttribute('data-id');
      const net = getActiveNet();
      const conn = net.connections.find(c => c.peer === targetId);
      if (conn) conn.close();
    });
  });
}

function renderMessages() {
  const srv = getActiveSrv();
  if (!srv) return;
  
  el.messageFeed.innerHTML = '';
  const msgs = srv.history.filter(m => m.channelId === activeChannelId);
  
  if (msgs.length === 0) {
    el.messageFeed.innerHTML = `<div class="sys-msg"><span>Welcome to #${el.activeChannelName.textContent}.</span></div>`;
    return;
  }
  
  msgs.forEach(m => appendMessageNode(m));
}

function appendMessageNode(msg) {
  if (document.getElementById(`msg-${msg.id}`)) return; // Prevent dupes

  const srv = getActiveSrv();
  const isSelf = msg.senderName === srv.username; // simplistic check

  const wrap = document.createElement('div');
  wrap.className = `msg-item ${isSelf ? 'is-self' : ''} ${msg.isHost ? 'is-host' : ''}`;
  wrap.id = `msg-${msg.id}`;

  const crownHtml = msg.isHost ? `<span class="crown-badge" title="Server Owner">👑</span>` : '';
  const hostTagHtml = msg.isHost ? `<span class="host-tag">Host</span>` : '';
  
  // Find sender avatar
  let senderAv = msg.senderName.charAt(0).toUpperCase();
  let hasAvImg = false;
  const memberObj = srv.members.find(m => m.name === msg.senderName);
  if (memberObj && memberObj.avatar) {
    senderAv = `<img src="${memberObj.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    hasAvImg = true;
  }

  let attachHtml = '';
  if (msg.file) {
    if (msg.file.mime.startsWith('image/')) {
      attachHtml = `<div class="msg-attachment"><img src="${msg.file.data}" alt="${msg.file.name}" class="chat-img" data-src="${msg.file.data}"></div>`;
    } else {
      let icon = 'ph-file';
      if (msg.file.name.endsWith('.zip')) icon = 'ph-file-zip';
      if (msg.file.name.endsWith('.txt')) icon = 'ph-file-text';
      if (msg.file.name.endsWith('.pdf')) icon = 'ph-file-pdf';
      
      // Calculate a rough size based on base64 data length
      const sizeBytes = Math.round((msg.file.data.length - 22) * 0.75); 
      const sizeStr = formatBytes(sizeBytes);

      attachHtml = `
        <div class="msg-attachment">
          <div class="file-card">
            <div class="fc-info">
              <div class="fc-icon"><i class="ph ${icon}"></i></div>
              <div class="fc-details">
                <span class="fc-name" title="${msg.file.name}">${msg.file.name}</span>
                <span class="fc-size">${sizeStr}</span>
              </div>
            </div>
            <a href="${msg.file.data}" download="${msg.file.name}" class="fc-download" title="Download">
              <i class="ph ph-download-simple"></i>
            </a>
          </div>
        </div>`;
    }
  }

  const textHtml = msg.text ? `<div class="msg-bubble">${msg.text}</div>` : '';
  
  const canDelete = srv.isHost || isSelf;
  const actionsHtml = canDelete
    ? `
      <div class="msg-actions">
        <button class="msg-ellipsis" data-id="${msg.id}" title="Options"><i class="ph ph-dots-three-vertical"></i></button>
      </div>`
    : '';

  wrap.innerHTML = `
    <div class="av ${hasAvImg ? 'has-img' : ''}">${senderAv}${crownHtml}</div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="name">${msg.senderName}</span>
        ${hostTagHtml}
        <span class="time">${msg.time}</span>
      </div>
      ${textHtml}
      ${attachHtml}
    </div>
    ${actionsHtml}
  `;

  // Clear welcome text if it's the first message
  const sysMsg = el.messageFeed.querySelector('.sys-msg');
  if (sysMsg) sysMsg.remove();

  el.messageFeed.appendChild(wrap);
  el.messageFeed.scrollTop = el.messageFeed.scrollHeight;

  // Image Viewer Handler
  const imgEl = wrap.querySelector('.chat-img');
  if (imgEl) {
    imgEl.addEventListener('click', () => {
      el.imageViewerImg.src = imgEl.getAttribute('data-src');
      el.imageViewer.classList.add('active');
    });
  }

    // Delete handler now uses ellipsis menu
    const ellipsisBtn = wrap.querySelector('.msg-ellipsis');
    if (ellipsisBtn) {
      ellipsisBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Remove any existing menu
        document.querySelectorAll('.msg-menu').forEach(m => m.remove());
        const menu = document.createElement('div');
        menu.className = 'msg-menu';
        const delMe = document.createElement('button');
        delMe.textContent = 'Delete for me';
        const delAll = document.createElement('button');
        delAll.textContent = 'Delete for everyone';
        menu.appendChild(delMe);
        menu.appendChild(delAll);
        // Position menu near button
        const rect = ellipsisBtn.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;
        document.body.appendChild(menu);
        const closeMenu = () => { menu.remove(); document.removeEventListener('click', closeMenu); };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
        delMe.addEventListener('click', () => {
          document.getElementById(`msg-${msg.id}`)?.remove();
          showUndoToast(msg, false);
          closeMenu();
        });
        delAll.addEventListener('click', () => {
          if (srv.isHost) {
            // Host deletes globally
            srv.history = srv.history.filter(m => m.id !== msg.id);
            saveState();
            broadcast(srv.id, 'delete_msg', { id: msg.id });
            document.getElementById(`msg-${msg.id}`)?.remove();
          } else {
            // Guest requests host to delete
            const net = getActiveNet();
            if (net && net.connections[0]?.open) {
              net.connections[0].send({ type: 'delete_req', id: msg.id });
            }
            document.getElementById(`msg-${msg.id}`)?.remove();
          }
          showUndoToast(msg, srv.isHost);
          closeMenu();
        });
      });
    }
}

function appendSysMsg(text) {
  const d = document.createElement('div');
  d.className = 'sys-msg'; d.innerHTML = `<span>${text}</span>`;
  el.messageFeed.appendChild(d);
  el.messageFeed.scrollTop = el.messageFeed.scrollHeight;
}

/* ──────────────────────────────────────────────
   Network Logic
────────────────────────────────────────────── */
function broadcast(roomId, type, data) {
  const net = activeConnections[roomId];
  if (!net) return;
  net.connections.forEach(c => { if (c.open) c.send({ type, data }); });
}

function connectHost(roomId, name) {
  const srv = savedServers[roomId];
  const peer = new Peer(roomId, { debug: 0 });
  
  activeConnections[roomId] = { peer, connections: [] };

  peer.on('open', id => {
    renderApp();
  });

  peer.on('connection', conn => {
    let guestName = 'Guest';
    
    conn.on('data', payload => {
      const srvObj = savedServers[roomId];
      if (!srvObj) return; // Server was deleted

      if (payload.type === 'join') {
        guestName = payload.name;
        srvObj.members.push({ id: conn.peer, name: guestName, isHost: false, avatar: payload.avatar || null });
        activeConnections[roomId].connections.push(conn);
        saveState();
        
        // Sync full state to guest (including logo)
        conn.send({ type: 'sync', history: srvObj.history, members: srvObj.members, channels: srvObj.channels, logo: srvObj.logo });
        broadcast(roomId, 'member_list', srvObj.members);
        
        if (activeServerId === roomId) {
          renderMembers();
          appendSysMsg(`✦ @${guestName} joined the server.`);
        }
      } 
      else if (payload.type === 'message') {
        const msg = {
          id: `${Date.now()}-${genId(4)}`,
          channelId: payload.channelId,
          senderId: conn.peer,
          senderName: guestName,
          text: payload.text || '',
          time: ts(),
          isHost: false,
          file: payload.file || null,
        };
        srvObj.history.push(msg);
        saveState();
        
        broadcast(roomId, 'new_message', msg);

        if (activeServerId === roomId && activeChannelId === msg.channelId) {
          appendMessageNode(msg);
        }
      } 
      else if (payload.type === 'delete_req') {
        const target = srvObj.history.find(m => m.id === payload.id);
        if (target && target.senderId === conn.peer) {
          srvObj.history = srvObj.history.filter(m => m.id !== payload.id);
          saveState();
          broadcast(roomId, 'delete_msg', { id: payload.id });
          
          if (activeServerId === roomId) {
            document.getElementById(`msg-${payload.id}`)?.remove();
          }
        }
      }
    });

    conn.on('close', () => {
      const srvObj = savedServers[roomId];
      if (srvObj) {
        srvObj.members = srvObj.members.filter(m => m.id !== conn.peer);
        saveState();
        broadcast(roomId, 'member_list', srvObj.members);
        if (activeServerId === roomId) {
          renderMembers();
          appendSysMsg(`✦ @${guestName} left.`);
        }
      }
      const net = activeConnections[roomId];
      if (net) {
        net.connections = net.connections.filter(c => c.peer !== conn.peer);
      }
    });
  });

  peer.on('error', err => {
    if (err.type === 'unavailable-id') {
      showErrorToast(`Could not start Host for ${roomId} (ID in use).`);
    } else {
      showErrorToast(`Error: ${err.message}`);
    }
  });
}

function connectGuest(targetId, name, guestAvatar) {
  const peer = new Peer({ debug: 0 });
  activeConnections[targetId] = { peer, connections: [] };
  
  let connTimeout = setTimeout(() => {
    if (activeConnections[targetId] && activeConnections[targetId].connections.length === 0) {
      showErrorToast(`Connection to ${targetId} timed out. Host might be offline.`);
      peer.destroy();
      delete activeConnections[targetId];
    }
  }, 8000);

  peer.on('open', () => {
    const conn = peer.connect(targetId, { reliable: true });
    activeConnections[targetId].connections = [conn];

    conn.on('open', () => {
      clearTimeout(connTimeout);
      conn.send({ type: 'join', name: name, avatar: guestAvatar });
      renderApp();
    });

    conn.on('data', payload => {
      const srvObj = savedServers[targetId];
      if (!srvObj) return;

      if (payload.type === 'sync') {
        srvObj.history = payload.history;
        srvObj.members = payload.members;
        srvObj.channels = payload.channels;
        if (payload.logo) srvObj.logo = payload.logo;
        saveState();
        if (activeServerId === targetId) {
          renderApp();
          appendSysMsg(`✦ Connected to host.`);
        }
      }  
      else if (payload.type === 'new_message') {
        srvObj.history.push(payload.data);
        saveState();
        if (activeServerId === targetId && activeChannelId === payload.data.channelId) {
          appendMessageNode(payload.data);
        }
      } 
      else if (payload.type === 'member_list') {
        srvObj.members = payload.data;
        saveState();
        if (activeServerId === targetId) renderMembers();
      } 
      else if (payload.type === 'delete_msg') {
        srvObj.history = srvObj.history.filter(m => m.id !== payload.data.id);
        saveState();
        if (activeServerId === targetId) {
          document.getElementById(`msg-${payload.data.id}`)?.remove();
        }
      }
      else if (payload.type === 'channel_update') {
        srvObj.channels = payload.data;
        saveState();
        if (activeServerId === targetId) {
          // If we are in a channel that was deleted, fallback to general
          if (!srvObj.channels.find(c => c.id === activeChannelId)) {
            activeChannelId = 'general';
          }
          renderApp();
        }
      }
    });

    conn.on('close', () => {
      if (activeServerId === targetId) {
        appendSysMsg('Host disconnected. Server is offline.');
        renderServerRail(); // dim icon
      }
    });
  });

  peer.on('error', err => {
    if(connTimeout) clearTimeout(connTimeout);
    showErrorToast(`Could not connect to ${targetId}: ` + err.message);
  });
}

// Auto-connect to saved servers on boot
Object.values(savedServers).forEach(srv => {
  // If we are auto-connecting, we don't know our own avatar unless we stored it in the member list
  // The host doesn't need to send avatar again, guests might need to grab it from storage
  let myMem = srv.members.find(m => m.name === srv.username);
  if (srv.isHost) connectHost(srv.id, srv.username);
  else connectGuest(srv.id, srv.username, myMem ? myMem.avatar : null);
});

/* ──────────────────────────────────────────────
   Interactions
────────────────────────────────────────────── */
// Landing Page / Add Server
el.btnAddServer.addEventListener('click', () => {
  el.landingPage.classList.add('active');
  el.btnCloseLanding.style.display = Object.keys(savedServers).length > 0 ? 'block' : 'none';
});
el.btnCloseLanding.addEventListener('click', () => {
  el.landingPage.classList.remove('active');
});

// Upload Handlers
el.btnUploadAvatar.addEventListener('click', () => el.inpAvatar.click());
el.btnUploadLogo.addEventListener('click', () => el.inpLogo.click());

el.inpAvatar.addEventListener('change', e => {
  if(e.target.files[0]) compressImage(e.target.files[0], 128, b64 => {
    currentAvatarBase64 = b64;
    el.avatarPreview.src = b64;
    el.avatarPreview.style.display = 'block';
  });
});
el.inpLogo.addEventListener('change', e => {
  if(e.target.files[0]) compressImage(e.target.files[0], 128, b64 => {
    currentLogoBase64 = b64;
    el.logoPreview.src = b64;
    el.logoPreview.style.display = 'block';
  });
});

el.toggleHost.addEventListener('click', () => {
  isJoinMode = false;
  el.toggleHost.classList.add('active'); el.toggleJoin.classList.remove('active');
  el.inviteCodeGroup.style.display = 'none';
  el.btnUploadLogo.style.display = 'flex';
  if(el.serverNameInp.parentElement.parentElement) el.serverNameInp.parentElement.parentElement.style.display = 'flex';
  el.btnAuthAction.innerHTML = '<i class="ph ph-rocket-launch"></i> Create Server';
});
el.toggleJoin.addEventListener('click', () => {
  isJoinMode = true;
  el.toggleJoin.classList.add('active'); el.toggleHost.classList.remove('active');
  el.inviteCodeGroup.style.display = 'flex';
  el.btnUploadLogo.style.display = 'none';
  if(el.serverNameInp.parentElement.parentElement) el.serverNameInp.parentElement.parentElement.style.display = 'none';
  el.btnAuthAction.innerHTML = '<i class="ph ph-sign-in"></i> Join Server';
});

// Init username from storage
el.usernameInp.value = localStorage.getItem('webmsg_last_username') || '';

el.btnAuthAction.addEventListener('click', () => {
  const username = el.usernameInp.value.trim();
  if (!username) { showErrorToast('Enter a name.'); return; }
  
  localStorage.setItem('webmsg_last_username', username);
  
  let roomId;
  let isHost = !isJoinMode;

  if (isHost) {
    const sname = el.serverNameInp.value.trim() || `${username}'s Server`;
    roomId = genId(6);
    savedServers[roomId] = {
      id: roomId, name: sname,
      isHost: true, username: username,
      logo: currentLogoBase64,
      channels: [{id: 'general', name: 'general'}],
      members: [{id: 'host', name: username, isHost: true, avatar: currentAvatarBase64}],
      history: []
    };
    saveState();
    connectHost(roomId, username);
  } else {
    roomId = el.inviteCodeInp.value.trim().toUpperCase();
    if (!roomId) { showErrorToast('Enter invite code.'); return; }
    if (savedServers[roomId]) { showErrorToast('You already have this server saved.'); return; }

    savedServers[roomId] = {
      id: roomId, name: `Server ${roomId}`,
      isHost: false, username: username,
      logo: null,
      channels: [], members: [], history: []
    };
    saveState();
    connectGuest(roomId, username, currentAvatarBase64);
  }

  activeServerId = roomId;
  activeChannelId = 'general';
  
  el.landingPage.classList.remove('active');
  
  // reset uploads
  currentAvatarBase64 = null; currentLogoBase64 = null;
  el.avatarPreview.style.display = 'none'; el.logoPreview.style.display = 'none';
  
  renderApp();
});

// Leave Server
el.btnLeaveServer.addEventListener('click', () => {
  if (!activeServerId) return;
  if (!confirm('Leave this server permanently?')) return;
  
  const net = activeConnections[activeServerId];
  if (net) {
    if (net.peer) net.peer.destroy();
    delete activeConnections[activeServerId];
  }
  
  delete savedServers[activeServerId];
  saveState();
  
  // Pick another server to view if any exist
  const remaining = Object.keys(savedServers);
  if (remaining.length > 0) {
    activeServerId = remaining[0];
    activeChannelId = 'general';
  } else {
    activeServerId = null;
  }
  renderApp();
});

// Create Channel
el.btnCreateChannel.addEventListener('click', () => {
  const srv = getActiveSrv();
  if (!srv || !srv.isHost) return;
  el.modalCreateChannel.classList.add('active');
  el.newChannelName.focus();
});
el.btnCloseChannelModal.addEventListener('click', () => {
  el.modalCreateChannel.classList.remove('active');
  el.newChannelName.value = '';
});
el.btnConfirmCreateChannel.addEventListener('click', () => {
  const srv = getActiveSrv();
  if (!srv || !srv.isHost) return;
  
  const name = el.newChannelName.value.trim();
  if (!name) { showErrorToast('Enter a channel name'); return; }
  
  const formatted = name.replace(/\s+/g, '-').toLowerCase();
  
  // check if exists
  if (srv.channels.find(c => c.id === formatted)) {
    showErrorToast('Channel already exists');
    return;
  }

  srv.channels.push({ id: formatted, name: formatted });
  saveState();
  
  broadcast(srv.id, 'channel_update', srv.channels);
  
  el.modalCreateChannel.classList.remove('active');
  el.newChannelName.value = '';
  renderApp();
});

// Copy Code
el.btnCopyCode.addEventListener('click', async () => {
  if (!activeServerId) return;
  try {
    await navigator.clipboard.writeText(activeServerId);
  } catch {
    const tmp = document.createElement('textarea');
    tmp.value = activeServerId; document.body.appendChild(tmp);
    tmp.select(); document.execCommand('copy'); tmp.remove();
  }
  const i = el.btnCopyCode.querySelector('i');
  if (i) {
    i.className = 'ph ph-check'; i.style.color = 'var(--green)';
    setTimeout(() => { i.className = 'ph ph-copy'; i.style.color = ''; }, 2000);
  }
});

/* ──────────────────────────────────────────────
   Messaging
────────────────────────────────────────────── */
function sendMsg(text, fileData = null) {
  if (!text && !fileData) return;
  const srv = getActiveSrv();
  if (!srv) return;

  if (srv.isHost) {
    const msg = {
      id: `${Date.now()}-${genId(4)}`,
      channelId: activeChannelId,
      senderId: 'host', // self
      senderName: srv.username,
      text, time: ts(), isHost: true, file: fileData
    };
    srv.history.push(msg);
    saveState();
    appendMessageNode(msg);
    broadcast(srv.id, 'new_message', msg);
  } else {
    const net = getActiveNet();
    if (net && net.connections[0]?.open) {
      net.connections[0].send({ type: 'message', channelId: activeChannelId, text, file: fileData });
    }
  }
}

el.chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = el.messageInput.value.trim();
  if (!text) return;
  sendMsg(text);
  el.messageInput.value = '';
});

// File Upload
el.btnAttach.addEventListener('click', () => el.fileInput.click());
el.fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > MAX_FILE) { showErrorToast('Max file size is 10MB.'); el.fileInput.value = ''; return; }

  el.uploadContainer.classList.add('active');
  el.uploadFilename.textContent = file.name;
  el.uploadPercent.textContent = '0%';
  el.uploadFill.style.width = '0%';

  const reader = new FileReader();
  reader.onprogress = ev => {
    if (!ev.lengthComputable) return;
    const pct = Math.round((ev.loaded / ev.total) * 100);
    el.uploadPercent.textContent = `${pct}%`;
    el.uploadFill.style.width = `${pct}%`;
  };
  reader.onload = () => {
    el.uploadPercent.textContent = '100%';
    el.uploadFill.style.width = '100%';
    setTimeout(() => {
      el.uploadContainer.classList.remove('active');
      sendMsg('', { name: file.name, mime: file.type, data: reader.result });
      el.fileInput.value = '';
    }, 400);
  };
  reader.readAsDataURL(file);
});

// Emojis
EMOJIS.forEach(em => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'e-btn'; b.textContent = em;
  b.addEventListener('click', () => {
    el.messageInput.value += em;
    el.messageInput.focus();
    el.emojiPicker.classList.remove('open');
  });
  el.emojiPicker.appendChild(b);
});
el.btnEmoji.addEventListener('click', e => {
  e.stopPropagation();
  el.emojiPicker.classList.toggle('open');
});
document.addEventListener('click', e => {
  if (!el.emojiPicker.contains(e.target) && e.target !== el.btnEmoji) {
    el.emojiPicker.classList.remove('open');
  }
});

/* ──────────────────────────────────────────────
   Undo Delete logic
────────────────────────────────────────────── */
function showUndoToast(msg, shouldBroadcast) {
  if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; pendingUndo = null; }
  pendingUndo = { msg, broadcastDelete: shouldBroadcast };
  el.undoToast.classList.add('show');
  undoTimer = setTimeout(() => {
    const srv = savedServers[msg.roomId] || getActiveSrv();
    if (srv) {
      srv.history = srv.history.filter(m => m.id !== msg.id);
      saveState();
      if (shouldBroadcast) broadcast(srv.id, 'delete_msg', { id: msg.id });
    }
    pendingUndo = null; undoTimer = null;
    el.undoToast.classList.remove('show');
  }, UNDO_MS);
}

el.btnUndoDelete.addEventListener('click', () => {
  if (!pendingUndo) return;
  clearTimeout(undoTimer); undoTimer = null;
  // Re-insert if we are in the correct tab
  if (activeServerId && activeChannelId === pendingUndo.msg.channelId) {
    appendMessageNode(pendingUndo.msg);
  }
  pendingUndo = null;
  el.undoToast.classList.remove('show');
});

// Boot init UI
if (Object.keys(savedServers).length > 0) {
  activeServerId = Object.keys(savedServers)[0]; // select first server
}
renderApp();