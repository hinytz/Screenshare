const loginView = document.getElementById('login');
const roomView = document.getElementById('room');
const blockedView = document.getElementById('blocked');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const paneYou = document.getElementById('pane-you');
const paneThem = document.getElementById('pane-them');
const shareBtn = document.getElementById('share-btn');
const peerStatus = document.getElementById('peer-status');
const roomError = document.getElementById('room-error');
const unmuteBtn = document.getElementById('unmute');

let featured = 'them';

const DEFAULT_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

let iceServers = DEFAULT_ICE;
let socket = null;
let pc = null;
let polite = false;
let makingOffer = false;
let ignoreOffer = false;
let isSettingRemoteAnswerPending = false;
let localStream = null;
let remoteStream = null;

function showView(view) {
  loginView.hidden = view !== 'login';
  roomView.hidden = view !== 'room';
  blockedView.hidden = view !== 'blocked';
}

function setPaneLive(pane, live, label) {
  pane.dataset.live = live ? 'true' : 'false';
  pane.querySelector('.pane-state').textContent = label;
  if (!live && fullscreenElement() === pane) exitFullscreen();
  applyLayout();
}

function isLive(pane) {
  return pane.dataset.live === 'true';
}

function applyLayout() {
  const youLive = isLive(paneYou);
  const themLive = isLive(paneThem);
  if (featured === 'you' && !youLive && themLive) featured = 'them';
  if (featured === 'them' && !themLive && youLive) featured = 'you';
  paneYou.dataset.slot = featured === 'you' ? 'featured' : 'pip';
  paneThem.dataset.slot = featured === 'them' ? 'featured' : 'pip';
  paneYou.title = paneYou.dataset.slot === 'featured' ? 'Fullscreen' : 'Show this stream';
  paneThem.title = paneThem.dataset.slot === 'featured' ? 'Fullscreen' : 'Show this stream';
}

function swapFeatured() {
  featured = featured === 'you' ? 'them' : 'you';
  applyLayout();
}

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function requestFullscreen(el) {
  const fn = el.requestFullscreen || el.webkitRequestFullscreen;
  return fn ? fn.call(el) : Promise.reject(new Error('fullscreen unsupported'));
}

function exitFullscreen() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen;
  return fn ? fn.call(document) : Promise.resolve();
}

async function toggleFullscreen(el) {
  try {
    if (fullscreenElement()) {
      await exitFullscreen();
      return;
    }
    await requestFullscreen(el);
  } catch {
    showRoomError('Could not enter fullscreen.');
  }
}

function onPaneClick(event, pane) {
  if (event.target.closest('button')) return;
  if (!isLive(pane)) return;
  if (pane.dataset.slot === 'pip') {
    swapFeatured();
    return;
  }
  toggleFullscreen(pane);
}

function setPeerStatus(connected) {
  peerStatus.textContent = connected ? 'Connected' : 'Waiting';
  peerStatus.dataset.state = connected ? 'connected' : 'waiting';
}

function showRoomError(message) {
  if (!message) {
    roomError.hidden = true;
    roomError.textContent = '';
    return;
  }
  roomError.hidden = false;
  roomError.textContent = message;
}

function setLocalSharing(sharing) {
  shareBtn.dataset.sharing = sharing ? 'true' : 'false';
  shareBtn.textContent = sharing ? 'Stop sharing' : 'Share screen';
  if (sharing && !isLive(paneThem)) featured = 'you';
  setPaneLive(paneYou, sharing, sharing ? 'Live' : 'Idle');
}

function setRemoteSharing(sharing) {
  if (sharing && !isLive(paneYou)) featured = 'them';
  setPaneLive(paneThem, sharing, sharing ? 'Live' : 'Idle');
}

function send(payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function attachLocalStream(stream) {
  localStream = stream;
  localVideo.srcObject = stream;
  setLocalSharing(true);
  for (const track of stream.getTracks()) {
    track.addEventListener('ended', () => {
      if (localStream === stream) stopShare();
    });
    if (pc) pc.addTrack(track, stream);
  }
}

async function startShare() {
  showRoomError('');
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'never' },
      audio: true,
    });
    if (localStream) stopShare();
    attachLocalStream(stream);
  } catch (err) {
    if (err && err.name === 'NotAllowedError') {
      showRoomError('Screen share was blocked.');
      return;
    }
    showRoomError('Could not start screen share.');
  }
}

function stopShare() {
  if (localStream) {
    for (const track of localStream.getTracks()) track.stop();
    localStream = null;
  }
  localVideo.srcObject = null;
  setLocalSharing(false);
  if (!pc) return;
  for (const sender of pc.getSenders()) {
    if (sender.track) pc.removeTrack(sender);
  }
}

function clearRemote() {
  if (remoteStream) {
    for (const track of remoteStream.getTracks()) track.stop();
  }
  remoteStream = null;
  remoteVideo.srcObject = null;
  setRemoteSharing(false);
  unmuteBtn.hidden = true;
}

function watchRemoteTrack(track) {
  const refresh = () => {
    const live = Boolean(
      remoteStream && remoteStream.getTracks().some((t) => t.readyState === 'live')
    );
    setRemoteSharing(live);
    if (!live) {
      remoteVideo.srcObject = null;
      unmuteBtn.hidden = true;
    }
  };
  track.addEventListener('ended', refresh);
  track.addEventListener('mute', refresh);
  track.addEventListener('unmute', () => {
    if (remoteStream) remoteVideo.srcObject = remoteStream;
    setRemoteSharing(true);
  });
}

async function createPeerConnection() {
  if (pc) return pc;
  pc = new RTCPeerConnection({ iceServers });
  makingOffer = false;
  ignoreOffer = false;
  isSettingRemoteAnswerPending = false;

  pc.onicecandidate = ({ candidate }) => {
    send({ type: 'signal', data: { type: 'ice', candidate } });
  };

  pc.ontrack = ({ track, streams }) => {
    const inbound = streams[0] || remoteStream || new MediaStream();
    if (!streams[0] && !inbound.getTracks().includes(track)) {
      inbound.addTrack(track);
    }
    remoteStream = inbound;
    remoteVideo.srcObject = inbound;
    setRemoteSharing(true);
    watchRemoteTrack(track);
    remoteVideo.play().catch(() => {
      unmuteBtn.hidden = false;
    });
  };

  pc.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      await pc.setLocalDescription();
      send({ type: 'signal', data: { type: 'sdp', description: pc.localDescription } });
    } catch (err) {
      console.error(err);
      showRoomError('Could not negotiate the connection.');
    } finally {
      makingOffer = false;
    }
  };

  if (localStream) {
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
  }

  return pc;
}

async function closePeerConnection() {
  if (!pc) {
    clearRemote();
    return;
  }
  pc.onicecandidate = null;
  pc.ontrack = null;
  pc.onnegotiationneeded = null;
  pc.close();
  pc = null;
  clearRemote();
}

async function handleSignal(data) {
  if (!pc) await createPeerConnection();
  if (data.type === 'ice') {
    try {
      await pc.addIceCandidate(data.candidate);
    } catch (err) {
      if (!ignoreOffer) console.error(err);
    }
    return;
  }
  if (!data.description) return;

  const description = data.description;
  const readyForOffer =
    !makingOffer && (pc.signalingState === 'stable' || isSettingRemoteAnswerPending);
  const offerCollision = description.type === 'offer' && !readyForOffer;
  ignoreOffer = !polite && offerCollision;
  if (ignoreOffer) return;

  isSettingRemoteAnswerPending = description.type === 'answer';
  await pc.setRemoteDescription(description);
  isSettingRemoteAnswerPending = false;

  if (description.type === 'offer') {
    await pc.setLocalDescription();
    send({ type: 'signal', data: { type: 'sdp', description: pc.localDescription } });
  }
}

async function connectSocket() {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  let ticket = '';
  try {
    const res = await fetch('/api/ws-ticket', { credentials: 'same-origin' });
    if (res.ok) {
      const data = await res.json();
      ticket = data.ticket || '';
    }
  } catch {
    // Cookie on the upgrade may still work.
  }
  const query = ticket ? `?ticket=${encodeURIComponent(ticket)}` : '';
  socket = new WebSocket(`${protocol}://${location.host}/ws${query}`);
  let opened = false;

  socket.addEventListener('open', () => {
    opened = true;
    showRoomError('');
  });

  socket.addEventListener('message', async (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.type === 'room-full') {
      showView('blocked');
      socket.close();
      return;
    }

    if (msg.type === 'hello') {
      polite = Boolean(msg.polite);
      if (msg.peerPresent) {
        setPeerStatus(true);
        await createPeerConnection();
      } else {
        setPeerStatus(false);
      }
      return;
    }

    if (msg.type === 'peer-joined') {
      setPeerStatus(true);
      showRoomError('');
      await createPeerConnection();
      return;
    }

    if (msg.type === 'peer-left') {
      setPeerStatus(false);
      await closePeerConnection();
      return;
    }

    if (msg.type === 'signal') {
      try {
        await handleSignal(msg.data);
      } catch (err) {
        console.error(err);
        showRoomError('Signaling failed. Refresh and try again.');
      }
    }
  });

  socket.addEventListener('close', () => {
    if (!blockedView.hidden) return;
    setPeerStatus(false);
    closePeerConnection();
    showRoomError(
      opened
        ? 'Disconnected from the room.'
        : 'Live connection failed. In Cloudflare, enable Network → WebSockets, then refresh.'
    );
  });
}

async function enterRoom() {
  const configRes = await fetch('/api/config', { credentials: 'same-origin' });
  if (configRes.ok) {
    const config = await configRes.json();
    if (Array.isArray(config.iceServers) && config.iceServers.length) {
      iceServers = config.iceServers;
    }
  }
  showView('room');
  setLocalSharing(Boolean(localStream));
  setRemoteSharing(false);
  setPeerStatus(false);
  applyLayout();
  await connectSocket();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  loginError.textContent = 'Wrong password';
  loginBtn.disabled = true;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password: passwordInput.value }),
    });
    if (!res.ok) {
      loginError.hidden = false;
      return;
    }
    passwordInput.value = '';
    await enterRoom();
  } catch {
    loginError.textContent = 'Could not reach the server.';
    loginError.hidden = false;
  } finally {
    loginBtn.disabled = false;
  }
});

paneYou.addEventListener('click', (event) => onPaneClick(event, paneYou));
paneThem.addEventListener('click', (event) => onPaneClick(event, paneThem));

shareBtn.addEventListener('click', () => {
  if (localStream) stopShare();
  else startShare();
});

unmuteBtn.addEventListener('click', async () => {
  try {
    remoteVideo.muted = false;
    await remoteVideo.play();
    unmuteBtn.hidden = true;
  } catch {
    showRoomError('Browser blocked audio. Click the page and try again.');
  }
});

async function boot() {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (res.ok) {
      await enterRoom();
      return;
    }
  } catch {
    // Stay on login.
  }
  showView('login');
}

boot();
