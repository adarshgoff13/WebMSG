/* ═══════════════════════════════════════════════════════════════
   WebMSG  —  app.js
   Multi-server, multi-channel logic.
═══════════════════════════════════════════════════════════════ */

// Initialize Font Preferences
const savedFont = localStorage.getItem('chatFont') || "'Montserrat', sans-serif";
const savedFontSize = localStorage.getItem('chatFontSize') || "14";
document.documentElement.style.setProperty('--font', savedFont);
document.documentElement.style.setProperty('--msg-size', `${savedFontSize}px`);

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
  newChannelDesc: document.getElementById('new-channel-desc'),
  btnConfirmCreateChannel: document.getElementById('btn-confirm-create-channel'),

  // Search
  btnSearch: document.getElementById('btn-search'),
  searchPanel: document.getElementById('search-panel'),
  searchInput: document.getElementById('search-input'),
  searchResults: document.getElementById('search-results'),
  btnCloseSearch: document.getElementById('btn-close-search'),

  // Pinned Messages
  btnPinned: document.getElementById('btn-pinned'),
  pinnedPanel: document.getElementById('pinned-panel'),
  pinnedList: document.getElementById('pinned-list'),
  btnClosePinned: document.getElementById('btn-close-pinned'),

  // Toasts & Modals
  undoToast: document.getElementById('undo-toast'),
  btnUndoDelete: document.getElementById('btn-undo-delete'),
  errorToast: document.getElementById('error-toast'),
  errorToastMsg: document.getElementById('error-toast-msg'),
  
  // Image Viewer
  imageViewer: document.getElementById('image-viewer'),
  imageViewerImg: document.getElementById('image-viewer-img'),
  btnCloseViewer: document.getElementById('btn-close-viewer'),

  // Settings
  btnSettings: document.getElementById('btn-settings'),
  modalSettings: document.getElementById('modal-settings'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  inpSettingUsername: document.getElementById('inp-setting-username'),
  btnSaveUsername: document.getElementById('btn-save-username'),
  settingsServerNameGroup: document.getElementById('settings-server-name-group'),
  inpSettingServerName: document.getElementById('inp-setting-server-name'),
  btnSaveServerName: document.getElementById('btn-save-server-name'),
  inpSettingStorage: document.getElementById('inp-setting-storage'),
  storageValDisplay: document.getElementById('storage-val-display'),
  inpSettingFont: document.getElementById('inp-setting-font'),
  inpSettingFontSize: document.getElementById('inp-setting-fontsize'),
  fontSizeDisplay: document.getElementById('fontsize-val-display'),
  btnSettingLeave: document.getElementById('btn-setting-leave'),
  inpDeleteConfirm: document.getElementById('inp-delete-confirm'),
  btnDeleteData: document.getElementById('btn-delete-data'),

  // Staging
  stagingArea: document.getElementById('staging-area'),
  stagingFilename: document.getElementById('staging-filename'),
  btnRemoveStaged: document.getElementById('btn-remove-staged')
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
let stagedFiles = []; // up to 5 files queued for sending

const EMOJIS = (() => {
  const ranges = [
    [0x1F600, 0x1F64F], // Emoticons
    [0x1F300, 0x1F5FF], // Misc Symbols & Pictographs
    [0x1F680, 0x1F6FF], // Transport & Map
    [0x1F900, 0x1F9FF], // Supplemental
    [0x1FA70, 0x1FAFF], // Symbols and Pictographs Ext-A
    [0x2600, 0x26FF],   // Misc symbols
    [0x2700, 0x27BF],   // Dingbats
  ];
  let arr = [];
  for (const [start, end] of ranges) {
    for (let i = start; i <= end; i++) {
      arr.push(String.fromCodePoint(i));
    }
  }
  return arr;
})();
let MAX_FILE = parseInt(localStorage.getItem('maxStorageMB') || '10') * 1024 * 1024;
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
  // IMPORTANT: Strip file data (base64) from history before saving to localStorage
  // to avoid hitting the 5-10MB quota limit. File data lives only in fileCache.
  const stripped = {};
  for (const [id, srv] of Object.entries(savedServers)) {
    stripped[id] = {
      ...srv,
      history: srv.history.map(m => {
        if (!m.file) return m;
        return { ...m, file: { ...m.file, data: null } }; // keep metadata, drop blob
      })
    };
  }
  try {
    localStorage.setItem('webmsg_servers', JSON.stringify(stripped));
  } catch (e) {
    console.warn('localStorage quota exceeded, clearing old history to recover.');
    // Emergency: clear oldest messages
    for (const srv of Object.values(savedServers)) {
      if (srv.history.length > 50) srv.history = srv.history.slice(-50);
    }
    try { localStorage.setItem('webmsg_servers', JSON.stringify(stripped)); } catch(_) {}
  }
}

// In-memory file cache: fileId -> base64 data URL
// Files are never persisted to localStorage – they live only for the session.
const fileCache = {};

function storeFile(fileId, data) { fileCache[fileId] = data; }
function getFile(fileId) { return fileCache[fileId] || null; }
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
      btn.style.backgroundImage = `url("${srv.logo}")`;
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
    li.title = ch.desc || '';
    li.innerHTML = `
      <i class="ph ph-hash"></i>
      <span class="ch-name">${ch.name}</span>
      ${srv.isHost ? `<button class="ch-delete-btn" data-id="${ch.id}" title="Delete channel"><i class="ph ph-trash"></i></button>` : ''}
    `;
    li.querySelector('.ch-name')?.addEventListener('click', () => {
      activeChannelId = ch.id;
      renderApp();
    });
    li.addEventListener('click', (e) => {
      if (e.target.closest('.ch-delete-btn')) return;
      activeChannelId = ch.id;
      renderApp();
    });
    el.channelList.appendChild(li);
  });

  // Delete channel handler (host only)
  el.channelList.querySelectorAll('.ch-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chId = btn.getAttribute('data-id');
      deleteChannel(chId);
    });
  });
  
  const actCh = srv.channels.find(c => c.id === activeChannelId);
  el.activeChannelName.textContent = actCh ? actCh.name : 'general';

  // Show channel description in header if any
  const descEl = document.getElementById('channel-desc-header');
  if (descEl) descEl.textContent = actCh && actCh.desc ? actCh.desc : '';
}

function deleteChannel(chId) {
  const srv = getActiveSrv();
  if (!srv || !srv.isHost) return;
  if (srv.channels.length <= 1) { showErrorToast('Cannot delete the last channel'); return; }
  
  showCustomConfirm('Delete Channel', `Delete #${chId}? All messages in this channel will be lost.`, 'Delete', true, () => {
    srv.channels = srv.channels.filter(c => c.id !== chId);
    srv.history = srv.history.filter(m => m.channelId !== chId);
    if (activeChannelId === chId) activeChannelId = srv.channels[0]?.id || 'general';
    saveState();
    broadcast(srv.id, 'channel_update', srv.channels);
    broadcast(srv.id, 'full_history', srv.history);
    renderApp();
  });
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

  el.memberList.querySelectorAll('.kick-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = btn.getAttribute('data-id');
      kickUser(targetId);
    });
  });
}

// ----- Kick User Function -----
function kickUser(peerId) {
  // Only host can kick
  const srv = getActiveSrv();
  if (!srv || !srv.isHost) return;
  // Find connection and close it
  const net = getActiveNet();
  if (net && net.connections) {
    const conn = net.connections.find(c => c.peer === peerId);
    if (conn) conn.close();
  }
  // Remove member from server state
  srv.members = srv.members.filter(m => m.id !== peerId);
  // Broadcast kick event to remaining peers
  broadcast(srv.id, 'user_kicked', { id: peerId });
  // Persist and UI refresh
  saveState();
  renderMembers();
}

// Handle incoming user_kicked event for guests
function handleUserKicked(data) {
  const srv = getActiveSrv();
  if (!srv) return;
  // Remove from members list
  srv.members = srv.members.filter(m => m.id !== data.id);
  // Close any existing connection
  const net = getActiveNet();
  if (net && net.connections) {
    net.connections = net.connections.filter(c => c.peer !== data.id);
  }
  saveState();
  if (activeServerId === srv.id) renderMembers();
}

// ----- Owner Badge UI -----
// Replace crown emoji with badge element
function getOwnerBadgeHtml(isHost) {
  if (!isHost) return '';
  return `<span class="owner-badge" title="Server Owner"><i class="ph ph-crown"></i> Owner</span>`;
}

// ----- Image Viewer Slider & Zoom -----
const imageViewerState = {
  imgs: [], // array of src strings
  index: 0,
  scale: 1,
  tx: 0,
  ty: 0,
  isPanning: false,
  startX: 0,
  startY: 0,
};

function openImageViewer(src) {
  // Build list of all image srcs in order of appearance
  const allImgEls = document.querySelectorAll('.chat-img');
  imageViewerState.imgs = Array.from(allImgEls).map(el => el.getAttribute('data-src'));
  imageViewerState.index = imageViewerState.imgs.findIndex(u => u === src);
  if (imageViewerState.index === -1) imageViewerState.index = 0;
  showCurrentImage();
  el.imageViewer.classList.add('active');
}

function showCurrentImage() {
  const src = imageViewerState.imgs[imageViewerState.index];
  if (!src) return;
  el.imageViewerImg.src = src;
  imageViewerState.scale = 1;
  imageViewerState.tx = 0;
  imageViewerState.ty = 0;
  el.imageViewerImg.style.transform = '';
  if (el.zoomSlider) el.zoomSlider.value = 1;
}

function updateZoom(newScale) {
  imageViewerState.scale = Math.min(Math.max(newScale, 0.2), 5);
  el.imageViewerImg.style.transform = `translate(${imageViewerState.tx}px, ${imageViewerState.ty}px) scale(${imageViewerState.scale})`;
  if (el.zoomSlider) el.zoomSlider.value = imageViewerState.scale;
}

// Wheel zoom
function onWheel(e) {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 0.1 : -0.1;
  updateZoom(imageViewerState.scale + delta);
}

// Drag to pan when zoomed
function onMouseDown(e) {
  if (imageViewerState.scale <= 1) return;
  e.preventDefault(); // Prevents the browser's native drag-and-drop from interrupting panning
  imageViewerState.isPanning = true;
  imageViewerState.startX = e.clientX;
  imageViewerState.startY = e.clientY;
}
function onMouseMove(e) {
  if (!imageViewerState.isPanning) return;
  const dx = e.clientX - imageViewerState.startX;
  const dy = e.clientY - imageViewerState.startY;
  imageViewerState.startX = e.clientX;
  imageViewerState.startY = e.clientY;
  imageViewerState.tx += dx;
  imageViewerState.ty += dy;
  el.imageViewerImg.style.transform = `translate(${imageViewerState.tx}px, ${imageViewerState.ty}px) scale(${imageViewerState.scale})`;
}
function onMouseUp() { imageViewerState.isPanning = false; }

// Add UI controls to image viewer (slider)
document.addEventListener('DOMContentLoaded', () => {
  el.zoomSlider = document.getElementById('zoom-slider');
  if (el.zoomSlider) {
    el.zoomSlider.addEventListener('input', (e) => {
      updateZoom(parseFloat(e.target.value));
    });
    const zoomMinus = el.zoomSlider.previousElementSibling;
    const zoomPlus = el.zoomSlider.nextElementSibling;
    if (zoomMinus) zoomMinus.addEventListener('click', () => updateZoom(imageViewerState.scale - 0.2));
    if (zoomPlus) zoomPlus.addEventListener('click', () => updateZoom(imageViewerState.scale + 0.2));
  }

  if (el.imageViewerImg) {
    el.imageViewerImg.addEventListener('wheel', onWheel);
    el.imageViewerImg.addEventListener('mousedown', onMouseDown);
  }
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (!el.imageViewer || !el.imageViewer.classList.contains('active')) return;
    if (e.key === 'Escape') el.btnCloseViewer.click();
  });
});



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
  
  if (msg.isSystem) {
    const wrap = document.createElement('div');
    wrap.className = 'sys-msg';
    wrap.id = `msg-${msg.id}`;
    wrap.innerHTML = `<span>${msg.text}</span>`;
    
    // Clear welcome text if it's the first message
    const welcomeMsg = el.messageFeed.querySelector('.sys-msg');
    if (welcomeMsg && welcomeMsg.textContent.includes('Welcome')) welcomeMsg.remove();
    
    el.messageFeed.appendChild(wrap);
    el.messageFeed.scrollTo({ top: el.messageFeed.scrollHeight, behavior: 'smooth' });
    return;
  }

  const isSelf = msg.senderName === srv.username; // simplistic check

  let isClustered = false;
  const lastEl = el.messageFeed.lastElementChild;
  if (lastEl && lastEl.classList.contains('msg-item')) {
    const lastName = lastEl.querySelector('.msg-meta .name')?.textContent;
    const lastTime = lastEl.querySelector('.msg-meta .time')?.textContent;
    if (lastName === msg.senderName && lastTime === msg.time) {
      isClustered = true;
    }
  }

  const wrap = document.createElement('div');
  wrap.className = `msg-item ${isSelf ? 'is-self' : ''} ${msg.isHost ? 'is-host' : ''} ${isClustered ? 'is-clustered' : ''}`;
  wrap.id = `msg-${msg.id}`;

  // Replace crown emoji with badge in member list
  const crownHtml = '';
  const hostTagHtml = '';

  
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
    // Resolve actual file data: live data > fileCache > null (page was reloaded)
    const fileData = msg.file.data || getFile(msg.file.fileId) || null;
    if (msg.file.mime && msg.file.mime.startsWith('image/')) {
      if (fileData) {
        attachHtml = `<div class="msg-attachment"><img src="${fileData}" alt="${msg.file.name}" class="chat-img" data-src="${fileData}"></div>`;
      } else {
        attachHtml = `<div class="msg-attachment"><div class="file-card"><div class="fc-info"><div class="fc-icon"><i class="ph ph-image-broken"></i></div><div class="fc-details"><span class="fc-name">${msg.file.name}</span><span class="fc-size" style="color:var(--red)">Unavailable after reload</span></div></div></div></div>`;
      }
    } else {
      let icon = 'ph-file';
      if (msg.file.name.endsWith('.zip')) icon = 'ph-file-zip';
      if (msg.file.name.endsWith('.txt')) icon = 'ph-file-text';
      if (msg.file.name.endsWith('.pdf')) icon = 'ph-file-pdf';

      if (fileData) {
        const sizeBytes = Math.round((fileData.length - 22) * 0.75);
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
              <a href="${fileData}" download="${msg.file.name}" class="fc-download" title="Download">
                <i class="ph ph-download-simple"></i>
              </a>
            </div>
          </div>`;
      } else {
        attachHtml = `<div class="msg-attachment"><div class="file-card"><div class="fc-info"><div class="fc-icon"><i class="ph ${icon}"></i></div><div class="fc-details"><span class="fc-name">${msg.file.name}</span><span class="fc-size" style="color:var(--red)">Unavailable after reload</span></div></div></div></div>`;
      }
    }
  }

  let parsedText = msg.text || '';
  let isPinged = false;
  if (parsedText) {
    parsedText = parsedText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Parse Links
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    parsedText = parsedText.replace(urlRegex, url => `<a href="${url}" target="_blank" class="msg-link">${url}</a>`);
    
    const pingRegex = /@([a-zA-Z0-9_\s]+?)(?=\s|$|<)/g;
    parsedText = parsedText.replace(/@([a-zA-Z0-9_]+)/g, (match, username) => {
      if (username.toLowerCase() === srv.username.toLowerCase() || username.toLowerCase() === 'everyone') isPinged = true;
      return `<span class="ping">${match}</span>`;
    });
    if (isPinged) wrap.classList.add('is-pinged');
  }
  
  const textHtml = parsedText ? `<div class="msg-bubble">${parsedText}</div>` : '';
  
  if (isClustered) {
    const bubble = lastEl.querySelector('.msg-bubble');
    const msgBody = lastEl.querySelector('.msg-body');
    
    if (bubble && parsedText) {
      const line = document.createElement('div');
      line.id = `msg-${msg.id}`; // store ID so delete works if triggered externally
      line.style.marginTop = '4px';
      line.innerHTML = parsedText;
      bubble.appendChild(line);
    } else if (!bubble && parsedText && msgBody) {
      // If previous msg had no text bubble (only attachment), create one
      msgBody.insertAdjacentHTML('beforeend', textHtml);
      const newBubble = msgBody.querySelector('.msg-bubble');
      newBubble.id = `msg-${msg.id}`;
    }
    
    if (attachHtml && msgBody) {
      msgBody.insertAdjacentHTML('beforeend', attachHtml);
    }
    
    el.messageFeed.scrollTo({ top: el.messageFeed.scrollHeight, behavior: 'smooth' });
    return; // skip appending new wrapper
  }
  
  const canDelete = true; // Everyone can delete for me or kick
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
  el.messageFeed.scrollTo({ top: el.messageFeed.scrollHeight, behavior: 'smooth' });

  // Image Viewer Handler
  const imgEl = wrap.querySelector('.chat-img');
  if (imgEl) {
    imgEl.addEventListener('click', () => {
      openImageViewer(imgEl.getAttribute('data-src'));
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
        menu.appendChild(delMe);

        let delAll = null;
        if (srv.isHost) {
          delAll = document.createElement('button');
          delAll.textContent = 'Delete for everyone';
          menu.appendChild(delAll);
          
          if (!isSelf) {
            const kickOpt = document.createElement('button');
            kickOpt.innerHTML = '<i class="ph ph-user-x"></i> Kick User';
            kickOpt.style.color = 'var(--red)';
            menu.appendChild(kickOpt);
            
            kickOpt.addEventListener('click', () => {
              const memberObj = srv.members.find(m => m.name === msg.senderName);
              if (memberObj) {
                const net = getActiveNet();
                const conn = net.connections.find(c => c.peer === memberObj.id);
                if (conn) conn.close();
              }
              closeMenu();
            });
          }
        }
        // Pin/Unpin option
        const isPinned = (srv.pinned || []).some(p => p.id === msg.id);
        const pinBtn = document.createElement('button');
        pinBtn.innerHTML = isPinned
          ? '<i class="ph ph-push-pin-slash"></i> Unpin Message'
          : '<i class="ph ph-push-pin"></i> Pin Message';
        menu.appendChild(pinBtn);
        pinBtn.addEventListener('click', () => { pinMessage(msg, !isPinned); closeMenu(); });

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
        if (delAll) {
          delAll.addEventListener('click', () => {
            // Host deletes globally, but we use undo toast first
            document.getElementById(`msg-${msg.id}`)?.remove();
            showUndoToast(msg, true);
            closeMenu();
          });
        }
      });
    }
}

function appendSysMsg(text) {
  const d = document.createElement('div');
  d.className = 'sys-msg'; d.innerHTML = `<span>${text}</span>`;
  el.messageFeed.appendChild(d);
  el.messageFeed.scrollTop = el.messageFeed.scrollHeight;
}

/* ── Pin Message ── */
function pinMessage(msg, shouldPin) {
  const srv = getActiveSrv();
  if (!srv) return;
  if (!srv.pinned) srv.pinned = [];
  if (shouldPin) {
    if (!srv.pinned.find(p => p.id === msg.id)) {
      srv.pinned.push(msg);
      
      const text = `${srv.username} has pinned a message.`;
      
      if (srv.isHost) {
        const sysMsg = {
          id: `sys-${Date.now()}-${genId(4)}`,
          channelId: activeChannelId,
          senderId: 'system',
          senderName: 'System',
          text, time: ts(), isSystem: true
        };
        srv.history.push(sysMsg);
        appendMessageNode(sysMsg);
        broadcast(srv.id, 'new_message', sysMsg);
      } else {
        appendSysMsg(text);
      }
    }
  } else {
    srv.pinned = srv.pinned.filter(p => p.id !== msg.id);
  }
  saveState();
  if (srv.isHost) broadcast(srv.id, 'pin_update', srv.pinned);
  renderPinnedPanel();
}

function renderPinnedPanel() {
  if (!el.pinnedList) return;
  const srv = getActiveSrv();
  const pinned = (srv && srv.pinned) ? srv.pinned : [];
  el.pinnedList.innerHTML = '';
  if (pinned.length === 0) {
    el.pinnedList.innerHTML = '<li class="sys-msg" style="padding:16px;"><span>No pinned messages yet.</span></li>';
    return;
  }
  pinned.slice().reverse().forEach(msg => {
    const li = document.createElement('li');
    li.className = 'pinned-item';
    
    let previewHtml = '';
    if (msg.file) {
      if (msg.file.mime && msg.file.mime.startsWith('image/')) {
        previewHtml = `<div class="pinned-preview"><img src="${msg.file.data}" style="max-height: 80px; border-radius: 4px; margin-top: 6px;"></div>`;
      } else {
        previewHtml = `<div class="pinned-preview" style="margin-top: 6px; font-size: 0.8rem; color: var(--accent);"><i class="ph ph-file"></i> ${msg.file.name}</div>`;
      }
    }
    
    li.innerHTML = `
      <div class="pinned-meta"><i class="ph ph-push-pin" style="color:var(--accent);"></i> <strong>${msg.senderName}</strong> <span class="time">${msg.time}</span></div>
      <div class="pinned-text">${msg.text ? msg.text.substring(0, 120) + (msg.text.length > 120 ? '…' : '') : ''}</div>
      ${previewHtml}
      ${ (srv && srv.isHost) ? `<button class="pin-remove-btn" data-id="${msg.id}" title="Unpin"><i class="ph ph-x"></i></button>` : ''}
    `;
    // Jump to message on click
    li.addEventListener('click', (e) => {
      if (e.target.closest('.pin-remove-btn')) return;
      const msgEl = document.getElementById(`msg-${msg.id}`);
      if (msgEl) { msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); msgEl.classList.add('highlight-msg'); setTimeout(() => msgEl.classList.remove('highlight-msg'), 2000); }
      closePinnedPanel();
    });
    el.pinnedList.appendChild(li);
  });
  el.pinnedList.querySelectorAll('.pin-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const srv2 = getActiveSrv();
      if (srv2) pinMessage(srv2.pinned.find(p => p.id === id), false);
    });
  });
}

function openPinnedPanel() {
  if (!el.pinnedPanel) return;
  renderPinnedPanel();
  el.pinnedPanel.classList.add('active');
}
function closePinnedPanel() { el.pinnedPanel?.classList.remove('active'); }

/* ── Search ── */
function openSearchPanel() {
  if (!el.searchPanel) return;
  el.searchPanel.classList.add('active');
  el.searchInput?.focus();
  renderSearchResults('');
}
function closeSearchPanel() { el.searchPanel?.classList.remove('active'); }

function renderSearchResults(query) {
  if (!el.searchResults) return;
  const srv = getActiveSrv();
  if (!srv) { el.searchResults.innerHTML = ''; return; }
  const q = query.toLowerCase().trim();
  const results = q === '' ? [] : srv.history.filter(m => {
    const textMatch = m.text && m.text.toLowerCase().includes(q);
    const fileMatch = m.file && m.file.name && m.file.name.toLowerCase().includes(q);
    return textMatch || fileMatch;
  });
  el.searchResults.innerHTML = '';
  if (q === '') {
    el.searchResults.innerHTML = '<li class="sys-msg" style="padding:16px;"><span>Type to search messages and files...</span></li>';
    return;
  }
  if (results.length === 0) {
    el.searchResults.innerHTML = '<li class="sys-msg" style="padding:16px;"><span>No results found.</span></li>';
    return;
  }
  results.forEach(msg => {
    const li = document.createElement('li');
    li.className = 'search-result-item';
    const preview = msg.text ? msg.text.substring(0, 100) + (msg.text.length > 100 ? '…' : '') : `📎 ${msg.file.name}`;
    li.innerHTML = `
      <div class="pinned-meta"><strong>${msg.senderName}</strong> <span class="time">${msg.time}</span></div>
      <div class="pinned-text">${preview}</div>
    `;
    li.addEventListener('click', () => {
      const msgEl = document.getElementById(`msg-${msg.id}`);
      if (msgEl) { msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); msgEl.classList.add('highlight-msg'); setTimeout(() => msgEl.classList.remove('highlight-msg'), 2000); }
      closeSearchPanel();
    });
    el.searchResults.appendChild(li);
  });
}

/* ──────────────────────────────────────────────
   Network Logic
────────────────────────────────────────────── */
// Chunk size: 48KB (safe for all browsers' SCTP data channel limits)
const CHUNK_SIZE = 48 * 1024;

function sendChunked(conn, payload) {
  const str = JSON.stringify(payload);
  if (str.length <= CHUNK_SIZE) {
    conn.send(payload);
    return;
  }
  // Chunk the JSON string
  const totalChunks = Math.ceil(str.length / CHUNK_SIZE);
  const chunkId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  for (let i = 0; i < totalChunks; i++) {
    const slice = str.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    conn.send({ __chunk: true, id: chunkId, index: i, total: totalChunks, slice });
  }
}

// Per-connection chunk reassembly buffers
const chunkBuffers = {};

function handleIncoming(rawPayload, conn, handler) {
  if (rawPayload && rawPayload.__chunk) {
    const { id, index, total, slice } = rawPayload;
    if (!chunkBuffers[id]) chunkBuffers[id] = { parts: [], received: 0, total };
    chunkBuffers[id].parts[index] = slice;
    chunkBuffers[id].received++;
    if (chunkBuffers[id].received === total) {
      const full = JSON.parse(chunkBuffers[id].parts.join(''));
      delete chunkBuffers[id];
      handler(full, conn);
    }
    return;
  }
  handler(rawPayload, conn);
}

function broadcast(roomId, type, data) {
  const net = activeConnections[roomId];
  if (!net) return;
  net.connections.forEach(c => { if (c.open) sendChunked(c, { type, data }); });
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
    
    conn.on('data', rawPayload => {
      handleIncoming(rawPayload, conn, (payload) => {
        const srvObj = savedServers[roomId];
        if (!srvObj) return;

        if (payload.type === 'join') {
          guestName = payload.name;
          srvObj.members.push({ id: conn.peer, name: guestName, isHost: false, avatar: payload.avatar || null, role: 'member' });
          activeConnections[roomId].connections.push(conn);
          saveState();

          // Sync state WITHOUT file blobs to avoid huge payloads
          const safeHistory = srvObj.history.map(m => {
            if (!m.file) return m;
            return { ...m, file: { ...m.file, data: null } };
          });
          sendChunked(conn, { type: 'sync', history: safeHistory, members: srvObj.members, channels: srvObj.channels, logo: srvObj.logo });
          broadcast(roomId, 'member_list', srvObj.members);

          if (activeServerId === roomId) {
            renderMembers();
            appendSysMsg(`✦ @${guestName} joined the server.`);
          }
        }
        else if (payload.type === 'message') {
          const fileData = payload.file || null;
          const fileId = fileData ? `${Date.now()}-file` : null;
          if (fileData && fileData.data) {
            storeFile(fileId, fileData.data); // cache blob in memory
          }
          const msg = {
            id: `${Date.now()}-${genId(4)}`,
            channelId: payload.channelId,
            senderId: conn.peer,
            senderName: guestName,
            text: payload.text || '',
            time: ts(),
            isHost: false,
            file: fileData ? { name: fileData.name, mime: fileData.mime, fileId, data: fileData.data } : null,
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

function connectGuest(targetId, name, guestAvatar, isNewJoin = false) {
  const peer = new Peer({ debug: 0 });
  activeConnections[targetId] = { peer, connections: [] };
  
  let connTimeout = setTimeout(() => {
    if (activeConnections[targetId] && activeConnections[targetId].connections.length === 0) {
      showErrorToast(`Connection to ${targetId} timed out. Host might be offline.`);
      peer.destroy();
      delete activeConnections[targetId];
      if (isNewJoin) {
        delete savedServers[targetId];
        saveState();
        if (activeServerId === targetId) activeServerId = null;
        renderApp();
      }
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

    conn.on('data', rawPayload => {
      handleIncoming(rawPayload, conn, (payload) => {
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
          const msg = payload.data;
          // Cache incoming file blobs in memory (never saved to localStorage)
          if (msg.file && msg.file.data) {
            storeFile(msg.file.fileId || msg.id, msg.file.data);
          }
          srvObj.history.push(msg);
          saveState();
          if (activeServerId === targetId && activeChannelId === msg.channelId) {
            appendMessageNode(msg);
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
            if (!srvObj.channels.find(c => c.id === activeChannelId)) {
              activeChannelId = 'general';
            }
            renderApp();
          }
        }
        else if (payload.type === 'user_kicked') {
          handleUserKicked(payload.data);
        }
        else if (payload.type === 'full_history') {
          srvObj.history = payload.data;
          saveState();
          if (activeServerId === targetId) renderMessages();
        }
        else if (payload.type === 'pin_update') {
          srvObj.pinned = payload.data;
          saveState();
          if (activeServerId === targetId) renderPinnedPanel();
        }
        else if (payload.type === 'sys_msg') {
          if (activeServerId === targetId) {
            appendSysMsg(payload.data);
          }
        }
      });
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
    if (isNewJoin) {
      delete savedServers[targetId];
      saveState();
      if (activeServerId === targetId) activeServerId = null;
      renderApp();
    }
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

// Theme Toggle Logic
const btnThemeToggle = document.getElementById('btn-theme-toggle');
if (btnThemeToggle) {
  const currentTheme = localStorage.getItem('webmsg_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  btnThemeToggle.innerHTML = currentTheme === 'light' ? '<i class="ph ph-moon"></i>' : '<i class="ph ph-sun"></i>';

  btnThemeToggle.addEventListener('click', () => {
    const theme = document.documentElement.getAttribute('data-theme');
    const newTheme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('webmsg_theme', newTheme);
    btnThemeToggle.innerHTML = newTheme === 'light' ? '<i class="ph ph-moon"></i>' : '<i class="ph ph-sun"></i>';
  });
}

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
    // Add role property when host creates server
    savedServers[roomId] = {
      id: roomId,
      name: sname,
      isHost: true,
      username: username,
      logo: currentLogoBase64,
      roles: {
        admin: { canKick: true, canChangeName: true, color: '#FF5555' },
        member: { canKick: false, canChangeName: false, color: '#FFFFFF' }
      },
      channels: [{id: 'general', name: 'general'}],
      members: [{id: 'host', name: username, isHost: true, avatar: currentAvatarBase64, role: 'admin'}],
      history: []
    };
    saveState();
    connectHost(roomId, username);
  } else {
    roomId = el.inviteCodeInp.value.trim().toUpperCase();
    if (!roomId) { showErrorToast('Enter invite code.'); return; }
    if (savedServers[roomId]) { showErrorToast('You already have this server saved.'); return; }

    // Add role for guest when they join (default to member)
    savedServers[roomId] = {
      id: roomId, name: `Server ${roomId}`,
      isHost: false, username: username,
      logo: null,
      roles: {
        admin: { canKick: true, canChangeName: true, color: '#FF5555' },
        member: { canKick: false, canChangeName: false, color: '#FFFFFF' }
      },
      channels: [], members: [], history: []
    };
    saveState();
    connectGuest(roomId, username, currentAvatarBase64, true);
  }

  activeServerId = roomId;
  activeChannelId = 'general';
  
  el.landingPage.classList.remove('active');
  
  // reset uploads
  currentAvatarBase64 = null; currentLogoBase64 = null;
  el.avatarPreview.style.display = 'none'; el.logoPreview.style.display = 'none';
  
  renderApp();
});

// Leave Server (reusable function)
function leaveServer() {
  if (!activeServerId) return;
  showCustomConfirm('Leave Server', 'Leave this server permanently?', 'Leave', true, () => {
    const net = activeConnections[activeServerId];
    if (net) {
      if (net.peer) net.peer.destroy();
      delete activeConnections[activeServerId];
    }
    delete savedServers[activeServerId];
    saveState();
    const remaining = Object.keys(savedServers);
    if (remaining.length > 0) {
      activeServerId = remaining[0];
      activeChannelId = 'general';
    } else {
      activeServerId = null;
    }
    renderApp();
  });
}

el.btnLeaveServer.addEventListener('click', () => leaveServer());

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
  const desc = el.newChannelDesc ? el.newChannelDesc.value.trim() : '';
  
  // check if exists
  if (srv.channels.find(c => c.id === formatted)) {
    showErrorToast('Channel already exists');
    return;
  }

  srv.channels.push({ id: formatted, name: formatted, desc });
  saveState();
  
  broadcast(srv.id, 'channel_update', srv.channels);
  
  el.modalCreateChannel.classList.remove('active');
  el.newChannelName.value = '';
  if (el.newChannelDesc) el.newChannelDesc.value = '';
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

  // Cache file blob in memory
  const fileId = fileData ? `${Date.now()}-file` : null;
  if (fileData && fileData.data) storeFile(fileId, fileData.data);
  const filePayload = fileData ? { ...fileData, fileId } : null;

  if (srv.isHost) {
    const msg = {
      id: `${Date.now()}-${genId(4)}`,
      channelId: activeChannelId,
      senderId: 'host',
      senderName: srv.username,
      text, time: ts(), isHost: true, file: filePayload
    };
    srv.history.push(msg);
    saveState();
    appendMessageNode(msg);
    broadcast(srv.id, 'new_message', msg);
  } else {
    const net = getActiveNet();
    if (net && net.connections[0]?.open) {
      sendChunked(net.connections[0], { type: 'message', channelId: activeChannelId, text, file: filePayload });
    } else {
      showErrorToast('Not connected to host. Please check your connection.');
    }
  }
}

el.chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = el.messageInput.value.trim();
  if (!text && stagedFiles.length === 0) return;

  if (stagedFiles.length > 0) {
    // Send text with first file, then each remaining file as its own message
    sendMsg(text, stagedFiles[0]);
    for (let i = 1; i < stagedFiles.length; i++) {
      setTimeout(() => sendMsg('', stagedFiles[i]), i * 80);
    }
  } else {
    sendMsg(text, null);
  }

  el.messageInput.value = '';
  stagedFiles = [];
  renderStagingArea();
});

// File staging helpers
function renderStagingArea() {
  const list = document.getElementById('staged-files-list');
  const label = document.getElementById('staged-count-label');
  if (!list) return;
  list.innerHTML = '';
  stagedFiles.forEach((f, idx) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;background:var(--glass);border:1px solid var(--border);border-radius:8px;padding:6px 10px;overflow:hidden;';
    // Thumbnail or icon
    if (f.mime && f.mime.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = f.data;
      img.style.cssText = 'width:32px;height:32px;object-fit:cover;border-radius:4px;flex-shrink:0;';
      row.appendChild(img);
    } else {
      const ic = document.createElement('i');
      ic.className = 'ph ph-file-text';
      ic.style.cssText = 'color:var(--accent);font-size:18px;flex-shrink:0;';
      row.appendChild(ic);
    }
    // Name
    const name = document.createElement('span');
    name.textContent = f.name;
    name.style.cssText = 'font-size:12px;font-weight:700;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    row.appendChild(name);
    // Remove button
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.innerHTML = '<i class="ph ph-x"></i>';
    rm.style.cssText = 'background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;flex-shrink:0;padding:2px;';
    rm.addEventListener('click', () => { stagedFiles.splice(idx, 1); renderStagingArea(); });
    row.appendChild(rm);
    list.appendChild(row);
  });
  if (label) label.textContent = `${stagedFiles.length} / 5 files`;
  el.stagingArea.style.display = stagedFiles.length > 0 ? 'flex' : 'none';
}

// File Upload & Staging
el.btnAttach.addEventListener('click', () => el.fileInput.click());
el.fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  if (stagedFiles.length >= 5) {
    showErrorToast('Maximum 5 files allowed per message.');
    el.fileInput.value = '';
    return;
  }

  const currentMaxMB = parseInt(localStorage.getItem('maxStorageMB') || '10');
  const maxBytes = currentMaxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    showErrorToast(`Max file size is ${currentMaxMB}MB.`);
    el.fileInput.value = '';
    return;
  }

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
      stagedFiles.push({ name: file.name, mime: file.type, data: reader.result });
      renderStagingArea();
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

/* ── Search & Pinned Panel Event Listeners ── */
el.btnSearch?.addEventListener('click', openSearchPanel);
el.btnCloseSearch?.addEventListener('click', closeSearchPanel);
el.searchInput?.addEventListener('input', (e) => renderSearchResults(e.target.value));

el.btnPinned?.addEventListener('click', openPinnedPanel);
el.btnClosePinned?.addEventListener('click', closePinnedPanel);

// Close panels on overlay click
el.searchPanel?.addEventListener('click', (e) => { if (e.target === el.searchPanel) closeSearchPanel(); });
el.pinnedPanel?.addEventListener('click', (e) => { if (e.target === el.pinnedPanel) closePinnedPanel(); });

// Close channel modal also clears description
el.btnCloseChannelModal?.removeEventListener('click', () => {});
el.btnCloseChannelModal?.addEventListener('click', () => {
  el.modalCreateChannel.classList.remove('active');
  el.newChannelName.value = '';
  if (el.newChannelDesc) el.newChannelDesc.value = '';
});

/* ── Custom Confirm Modal ── */
function showCustomConfirm(title, message, okText, isDestructive, onConfirm) {
  const modal = document.getElementById('modal-confirm');
  if (!modal) {
    if (confirm(message)) onConfirm();
    return;
  }
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  const okBtn = document.getElementById('btn-confirm-ok');
  okBtn.textContent = okText;
  okBtn.style.background = isDestructive ? 'var(--red)' : 'var(--accent)';
  
  const cancelBtn = document.getElementById('btn-confirm-cancel');
  
  modal.classList.add('active');
  
  const closeConfirm = () => {
    modal.classList.remove('active');
    okBtn.removeEventListener('click', handleOk);
    cancelBtn.removeEventListener('click', closeConfirm);
  };
  
  const handleOk = () => {
    closeConfirm();
    onConfirm();
  };
  
  okBtn.addEventListener('click', handleOk);
  cancelBtn.addEventListener('click', closeConfirm);
}

/* ── Settings Logic ── */
if (el.btnSettings) {
  el.btnSettings.addEventListener('click', () => {
    const srv = getActiveSrv();
    if (!srv) return;
    
    // Populate
    el.inpSettingUsername.value = srv.username;
    if (srv.isHost) {
      el.settingsServerNameGroup.style.display = 'block';
      el.inpSettingServerName.value = srv.name;
    } else {
      el.settingsServerNameGroup.style.display = 'none';
    }
    
    const currentMaxMB = parseInt(localStorage.getItem('maxStorageMB') || '10');
    el.inpSettingStorage.value = currentMaxMB;
    el.storageValDisplay.textContent = currentMaxMB >= 1000 ? `${(currentMaxMB/1000).toFixed(1)}GB` : `${currentMaxMB}MB`;

    if (el.inpSettingFont) el.inpSettingFont.value = localStorage.getItem('chatFont') || "'Montserrat', sans-serif";
    if (el.inpSettingFontSize) {
      const fs = localStorage.getItem('chatFontSize') || "14";
      el.inpSettingFontSize.value = fs;
      if (el.fontSizeDisplay) el.fontSizeDisplay.textContent = `${fs}px`;
    }
    
    el.modalSettings.classList.add('active');
  });
}

if (el.btnCloseSettings) {
  el.btnCloseSettings.addEventListener('click', () => {
    el.modalSettings.classList.remove('active');
  });
}

if (el.btnSaveUsername) {
  el.btnSaveUsername.addEventListener('click', () => {
    const srv = getActiveSrv();
    const newName = el.inpSettingUsername.value.trim();
    if (!srv || !newName || newName === srv.username) return;
    srv.username = newName;
    saveState();
    el.myUsername.textContent = newName;
    el.myAvInitial.textContent = newName.charAt(0).toUpperCase();
    if (!srv.isHost) {
      const net = getActiveNet();
      if (net && net.connections[0]?.open) {
        net.connections[0].send({ type: 'rename', name: newName });
      }
    } else {
      broadcast(srv.id, 'channel_update', srv.channels); // Force UI update
    }
    el.modalSettings.classList.remove('active');
  });
}

if (el.btnSaveServerName) {
  el.btnSaveServerName.addEventListener('click', () => {
    const srv = getActiveSrv();
    const newName = el.inpSettingServerName.value.trim();
    if (!srv || !srv.isHost || !newName || newName === srv.name) return;
    srv.name = newName;
    saveState();
    const serverNameEl = document.getElementById('current-server-name');
    if (serverNameEl) serverNameEl.textContent = newName;
    broadcast(srv.id, 'channel_update', srv.channels);
    el.modalSettings.classList.remove('active');
  });
}

if (el.inpSettingStorage) {
  el.inpSettingStorage.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    el.storageValDisplay.textContent = val >= 1000 ? `${(val/1000).toFixed(1)}GB` : `${val}MB`;
  });
  el.inpSettingStorage.addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    localStorage.setItem('maxStorageMB', val.toString());
    MAX_FILE = val * 1024 * 1024;
  });
}

if (el.inpSettingFont) {
  el.inpSettingFont.addEventListener('change', (e) => {
    const val = e.target.value;
    localStorage.setItem('chatFont', val);
    document.documentElement.style.setProperty('--font', val);
  });
}

if (el.inpSettingFontSize) {
  el.inpSettingFontSize.addEventListener('input', (e) => {
    const val = e.target.value;
    if (el.fontSizeDisplay) el.fontSizeDisplay.textContent = `${val}px`;
    document.documentElement.style.setProperty('--msg-size', `${val}px`);
  });
  el.inpSettingFontSize.addEventListener('change', (e) => {
    localStorage.setItem('chatFontSize', e.target.value);
  });
}

if (el.btnSettingLeave) {
  el.btnSettingLeave.addEventListener('click', () => {
    el.modalSettings.classList.remove('active');
    leaveServer();
  });
}

if (el.btnDeleteData && el.inpDeleteConfirm) {
  el.btnDeleteData.addEventListener('click', () => {
    const srv = getActiveSrv();
    const typed = el.inpDeleteConfirm.value.trim();
    if (!srv || !typed) return;
    
    if (typed !== srv.username) {
      showErrorToast("Username doesn't match!");
      return;
    }
    
    // Wipe everything
    localStorage.clear();
    Object.keys(activeConnections).forEach(k => {
      if (activeConnections[k] && activeConnections[k].peer) {
        activeConnections[k].peer.destroy();
      }
    });
    location.reload();
  });
}
