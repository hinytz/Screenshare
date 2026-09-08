const loginView = document.getElementById('login');
const roomView = document.getElementById('room');
const loginForm = document.getElementById('login-form');
const roomNameInput = document.getElementById('room-name');
const passwordInput = document.getElementById('password');
const usernameInput = document.getElementById('username');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const modeJoin = document.getElementById('mode-join');
const modeCreate = document.getElementById('mode-create');
const stage = document.querySelector('.stage');
const pipRail = document.getElementById('pip-rail');
const localVideo = document.getElementById('local-video');
const paneYou = document.getElementById('pane-you');
const youName = document.getElementById('you-name');
const shareBtn = document.getElementById('share-btn');
const changeBtn = document.getElementById('change-btn');
const cameraBtn = document.getElementById('camera-btn');
const floatBtn = document.getElementById('float-btn');
const leaveBtn = document.getElementById('leave-btn');
const peerStatus = document.getElementById('peer-status');
const peoplePanel = document.getElementById('people-panel');
const peopleList = document.getElementById('people-list');
const micBtn = document.getElementById('mic-btn');
const micPanel = document.getElementById('mic-panel');
const micToggle = document.getElementById('mic-toggle');
const micDevice = document.getElementById('mic-device');
const micGainSlider = document.getElementById('mic-gain');
const micVadSlider = document.getElementById('mic-vad');
const micLevel = document.getElementById('mic-level');
const roomError = document.getElementById('room-error');
const picker = document.getElementById('picker');
const pickerTitle = document.getElementById('picker-title');
const pickerGrid = document.getElementById('picker-grid');
const pickerCancel = document.getElementById('picker-cancel');
const qualityRow = document.getElementById('quality-row');
const pickerContinue = document.getElementById('picker-continue');
const pickerTabs = document.getElementById('picker-tabs');
const pickerTabWindows = document.getElementById('picker-tab-windows');
const pickerTabBrowsers = document.getElementById('picker-tab-browsers');
const pickerEmpty = document.getElementById('picker-empty');
const cameraPreview = document.getElementById('camera-preview');
const camFeature = document.getElementById('cam-feature');
const camStack = document.getElementById('cam-stack');
const desktop = window.screenshareDesktop;

const QUALITY_PRESETS = {
  '720p30': { id: '720p30', label: '720p 30', width: 1280, height: 720, fps: 30, maxBitrate: 6_000_000 },
  '1080p30': { id: '1080p30', label: '1080p 30', width: 1920, height: 1080, fps: 30, maxBitrate: 6_000_000 },
  '720p60': { id: '720p60', label: '720p 60', width: 1280, height: 720, fps: 60, maxBitrate: 6_000_000 },
  '1080p60': { id: '1080p60', label: '1080p 60', width: 1920, height: 1080, fps: 60, maxBitrate: 6_000_000 },
};

let shareQuality = '1080p30';
let replacingShare = false;
let lastDesktopSource = null;
let lastDesktopCaptureAt = 0;
let shareEndTimer = null;

const DEFAULT_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const ROOM_CACHE_KEY = 'screenshare.rooms';
const MIC_CACHE_KEY = 'screenshare.mic';
const MAX_PEOPLE = 5;
const MIC_BITRATE = 64_000;
const VAD_HANG_MS = 160;
const PERSON_MIC_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2A2.8 2.8 0 0 0 9.2 6v5.2a2.8 2.8 0 1 0 5.6 0V6A2.8 2.8 0 0 0 12 3.2Zm-6.2 8.3a.9.9 0 0 1 .9.9 5.3 5.3 0 0 0 10.6 0 .9.9 0 1 1 1.8 0 7.1 7.1 0 0 1-6.2 7v1.7h2.4a.9.9 0 1 1 0 1.8H9.7a.9.9 0 1 1 0-1.8h2.4v-1.7a7.1 7.1 0 0 1-6.2-7 .9.9 0 0 1 .9-.9Z"/><path class="mic-slash" d="M5.2 5.2l13.6 13.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';

let iceServers = DEFAULT_ICE;
let events = null;
let reconnectTimer = null;
let socketGen = 0;
let roomQueue = Promise.resolve();
let myId = null;
let myName = '';
let homeMode = 'join';
let leavingRoom = false;
let featured = 'you';
let featuredView = { kind: 'pane' };
let localStream = null;
let cameraStream = null;
let cameraPreviewStream = null;
let floatWin = null;
let floatPoll = null;
let mediaUnlocked = false;
let micUnmuted = false;
let micSpeaking = false;
let micHangUntil = 0;
let micRawStream = null;
let micProcessedStream = null;
let micCtx = null;
let micSource = null;
let micInputGain = null;
let micAnalyser = null;
let micGate = null;
let micDest = null;
let micSink = null;
let micVadRaf = 0;
let micStarting = false;
let micDenied = false;
let voiceCtx = null;
let voicePeerId = null;
let micSettings = { deviceId: '', gain: 1, threshold: 0.04 };
const peers = new Map();
const CAMERA_CONSTRAINTS = {
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
  audio: false,
};
let desktopAudio = {
  ctx: null,
  node: null,
  mute: null,
  unsub: null,
  energyTimer: null,
};

function showView(view) {
  loginView.hidden = view !== 'login';
  roomView.hidden = view !== 'room';
}

function peerLabel(id) {
  const peer = peers.get(id);
  if (peer && peer.name) return peer.name;
  return `Peer ${String(id).slice(0, 4)}`;
}

function setYouName(name) {
  myName = name || '';
  youName.textContent = myName || 'You';
}

function setHomeMode(mode) {
  homeMode = mode === 'create' ? 'create' : 'join';
  modeJoin.setAttribute('aria-selected', homeMode === 'join' ? 'true' : 'false');
  modeCreate.setAttribute('aria-selected', homeMode === 'create' ? 'true' : 'false');
  loginBtn.textContent = homeMode === 'create' ? 'Create' : 'Enter';
}

function loadCachedRoom() {
  try {
    const raw = localStorage.getItem(ROOM_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.name !== 'string' || typeof data.password !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}

function cachePermanentRoom(name, password) {
  localStorage.setItem(ROOM_CACHE_KEY, JSON.stringify({ name, password }));
}

function prefillJoinForm() {
  const cached = loadCachedRoom();
  if (!cached) return;
  roomNameInput.value = cached.name;
  passwordInput.value = cached.password;
}

function renderPeopleList() {
  const rows = [];
  if (myName) rows.push({ id: 'self', name: myName, self: true });
  for (const peer of peers.values()) {
    rows.push({ id: peer.id, name: peer.name || peerLabel(peer.id), self: false, peer });
  }
  const openId = voicePeerId;
  peopleList.replaceChildren(
    ...rows.map((item) => {
      const li = document.createElement('li');
      li.dataset.self = item.self ? 'true' : 'false';
      if (!item.self) li.dataset.peer = item.id;

      const mic = document.createElement('button');
      mic.type = 'button';
      mic.className = 'person-mic';
      mic.innerHTML = PERSON_MIC_SVG;
      mic.setAttribute('aria-label', item.self ? 'Your microphone' : `Voice for ${item.name}`);

      const name = document.createElement('span');
      name.className = 'person-name';
      name.textContent = item.self ? `${item.name} (you)` : item.name;

      li.append(mic, name);

      if (item.self) {
        mic.addEventListener('click', (event) => {
          event.stopPropagation();
          if (micBtn.disabled) return;
          setMicOpen(micPanel.hidden);
        });
      } else {
        const pop = document.createElement('div');
        pop.className = 'voice-pop';
        pop.hidden = openId !== item.id;
        const muteBtn = document.createElement('button');
        muteBtn.type = 'button';
        muteBtn.className = 'voice-mute';
        const vol = document.createElement('input');
        vol.type = 'range';
        vol.min = '0';
        vol.max = '200';
        vol.value = String(Math.round((item.peer.voiceVolume ?? 1) * 100));
        vol.setAttribute('aria-label', `Volume for ${item.name}`);
        muteBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          item.peer.voiceMuted = !item.peer.voiceMuted;
          applyVoiceGain(item.peer);
          refreshPeopleVoice();
        });
        vol.addEventListener('pointerdown', (event) => event.stopPropagation());
        vol.addEventListener('click', (event) => event.stopPropagation());
        vol.addEventListener('input', () => {
          item.peer.voiceVolume = Number(vol.value) / 100;
          if (item.peer.voiceVolume > 0) item.peer.voiceMuted = false;
          applyVoiceGain(item.peer);
          refreshPeopleVoice();
        });
        pop.append(muteBtn, vol);
        li.append(pop);
        mic.addEventListener('click', (event) => {
          event.stopPropagation();
          voicePeerId = voicePeerId === item.id ? null : item.id;
          refreshPeopleVoice();
        });
      }
      return li;
    })
  );
  refreshPeopleVoice();
}

function refreshPeopleVoice() {
  for (const li of peopleList.querySelectorAll('li')) {
    const mic = li.querySelector('.person-mic');
    const pop = li.querySelector('.voice-pop');
    const muteBtn = li.querySelector('.voice-mute');
    if (li.dataset.self === 'true') {
      if (!mic) continue;
      mic.dataset.muted = micUnmuted ? 'false' : 'true';
      mic.dataset.speaking = micSpeaking ? 'true' : 'false';
      continue;
    }
    const peer = peers.get(li.dataset.peer);
    if (!peer || !mic) continue;
    mic.dataset.muted = peer.voiceMuted ? 'true' : 'false';
    mic.dataset.speaking = peer.voiceSpeaking && !peer.voiceMuted ? 'true' : 'false';
    if (pop) pop.hidden = voicePeerId !== peer.id;
    if (muteBtn) muteBtn.textContent = peer.voiceMuted ? 'Unmute' : 'Mute';
  }
}

function loadMicSettings() {
  try {
    const raw = localStorage.getItem(MIC_CACHE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return;
    if (typeof data.deviceId === 'string') micSettings.deviceId = data.deviceId;
    if (Number.isFinite(data.gain)) micSettings.gain = Math.min(2, Math.max(0, data.gain));
    if (Number.isFinite(data.threshold)) {
      const threshold = Math.min(1, Math.max(0, data.threshold));
      micSettings.threshold = threshold === 0.12 ? 0.04 : threshold;
    }
  } catch {
    // keep defaults
  }
}

function saveMicSettings() {
  localStorage.setItem(MIC_CACHE_KEY, JSON.stringify(micSettings));
}

function syncMicControls() {
  if (micGainSlider) micGainSlider.value = String(Math.round(micSettings.gain * 100));
  if (micVadSlider) micVadSlider.value = String(Math.round(micSettings.threshold * 100));
  if (micToggle) micToggle.textContent = micUnmuted ? 'Mute' : 'Unmute';
  if (micDevice && micSettings.deviceId) micDevice.value = micSettings.deviceId;
}

function setMicLive(live) {
  micBtn.dataset.live = live ? 'true' : 'false';
  micBtn.dataset.muted = live ? 'false' : 'true';
  micBtn.setAttribute('aria-pressed', live ? 'true' : 'false');
}

function setMicOpen(open) {
  if (open) setPeopleOpen(false);
  voicePeerId = null;
  refreshPeopleVoice();
  micPanel.hidden = !open;
  micBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function setPeopleOpen(open) {
  if (open) setMicOpen(false);
  peoplePanel.hidden = !open;
  peerStatus.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (!open) {
    voicePeerId = null;
    refreshPeopleVoice();
  }
}

function isLive(pane) {
  return pane && pane.dataset.live === 'true';
}

function allPanes() {
  return [paneYou, ...[...peers.values()].map((peer) => peer.pane)];
}

function peerByPc(pc) {
  for (const peer of peers.values()) {
    if (peer.pc === pc) return peer;
  }
  return null;
}

function getFeaturedPane() {
  if (featured === 'you') return paneYou;
  return peers.get(featured)?.pane || paneYou;
}

function setPaneLive(pane, live, label) {
  if (!pane) return;
  pane.dataset.live = live ? 'true' : 'false';
  pane.querySelector('.pane-state').textContent = label;
  if (!live && fullscreenElement() === pane) exitFullscreen();
  applyLayout();
}

function applyLayout() {
  if (featured !== 'you' && !peers.has(featured)) featured = 'you';
  const liveRemote = [...peers.values()].find((peer) => isLive(peer.pane));
  if (featured === 'you' && !isLive(paneYou) && liveRemote) featured = liveRemote.id;
  if (featured !== 'you' && (!peers.has(featured) || !isLive(peers.get(featured).pane))) {
    featured = isLive(paneYou) ? 'you' : liveRemote ? liveRemote.id : 'you';
  }

  for (const pane of allPanes()) {
    const id = pane === paneYou ? 'you' : pane.dataset.peer;
    const isFeatured = featured === id;
    pane.dataset.slot = isFeatured ? 'featured' : 'pip';
    pane.title = isFeatured ? 'Fullscreen' : 'Show this stream';
    if (isFeatured) stage.insertBefore(pane, pipRail);
    else pipRail.append(pane);
  }
  placeCamChrome();
}

function setPeerStatus() {
  const count = (myName ? 1 : 0) + peers.size;
  peerStatus.textContent = `${count} / ${MAX_PEOPLE}`;
  peerStatus.dataset.state = count > 1 ? 'connected' : 'waiting';
  renderPeopleList();
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
  changeBtn.hidden = !sharing;
  if (sharing && ![...peers.values()].some((peer) => isLive(peer.pane))) {
    featured = 'you';
  }
  setPaneLive(paneYou, sharing, sharing ? 'Live' : 'Idle');
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
  if (event.target.closest('button') || event.target.closest('.pane-controls')) return;
  if (!isLive(pane)) return;
  const peer = [...peers.values()].find((item) => item.pane === pane);
  if (peer) unlockRemoteAudio(peer);
  const id = pane === paneYou ? 'you' : pane.dataset.peer;
  if (pane.dataset.slot === 'pip') {
    featured = id;
    featuredView = { kind: 'pane' };
    applyLayout();
    renderCamFeature();
    renderCamStack();
    return;
  }
  toggleFullscreen(pane);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function peerPolite(id) {
  return Boolean(myId) && String(myId) > String(id);
}

async function sendSignal(to, data) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch('/api/signal', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'signal', to, data }),
      });
      if (res.ok) return;
      if (res.status !== 404 && res.status !== 409) break;
    } catch {
      // retry
    }
    await sleep(250 * (attempt + 1));
  }
  showRoomError('Could not send signaling data.');
}

function currentQuality() {
  return QUALITY_PRESETS[shareQuality] || QUALITY_PRESETS['1080p30'];
}

function videoCaptureConstraints() {
  const preset = currentQuality();
  return {
    cursor: 'never',
    width: { ideal: preset.width },
    height: { ideal: preset.height },
    frameRate: { ideal: preset.fps },
  };
}

function applyCaptureHint(track) {
  if (track.kind === 'video' && 'contentHint' in track) track.contentHint = 'detail';
}

const SCREEN_CODEC_PREF = ['video/vp9', 'video/av1', 'video/h264'];
const CAMERA_CODEC_PREF = ['video/av1', 'video/vp9', 'video/h264'];

function orderVideoCodecs(pref) {
  const caps = RTCRtpSender.getCapabilities('video');
  if (!caps || !caps.codecs.length) return null;
  const rank = (mime) => {
    const index = pref.indexOf(String(mime).toLowerCase());
    return index === -1 ? pref.length : index;
  };
  return [...caps.codecs].sort((a, b) => rank(a.mimeType) - rank(b.mimeType));
}

function preferVideoCodecs(pc) {
  if (!pc || typeof RTCRtpSender.getCapabilities !== 'function') return;
  const screenOrdered = orderVideoCodecs(SCREEN_CODEC_PREF);
  const cameraOrdered = orderVideoCodecs(CAMERA_CODEC_PREF);
  if (!screenOrdered) return;
  const peer = peerByPc(pc);
  for (const transceiver of pc.getTransceivers()) {
    if (transceiver.mid) continue;
    const kind = transceiver.receiver.track.kind || transceiver.sender.track?.kind;
    if (kind !== 'video') continue;
    const camera = peer && transceiver.sender === peer.cameraSender;
    try {
      transceiver.setCodecPreferences(camera ? cameraOrdered : screenOrdered);
    } catch (err) {
      console.warn('Could not set video codec preferences', err);
    }
  }
}

async function applyVideoQuality(pc) {
  preferVideoCodecs(pc);
  const preset = currentQuality();
  const peer = peerByPc(pc);
  for (const sender of pc.getSenders()) {
    if (!sender.track || sender.track.kind !== 'video') continue;
    if (peer && sender === peer.cameraSender) continue;
    try {
      const params = sender.getParameters();
      params.degradationPreference = 'maintain-framerate';
      params.encodings = [
        {
          ...(params.encodings && params.encodings[0] ? params.encodings[0] : {}),
          maxBitrate: preset.maxBitrate,
          maxFramerate: preset.fps,
          scaleResolutionDownBy: 1,
        },
      ];
      await sender.setParameters(params);
    } catch (err) {
      console.warn('Could not apply video quality', err);
    }
  }
}

async function applyCameraQuality(peer) {
  const sender = peer && peer.cameraSender;
  if (!sender || !sender.track) return;
  try {
    const params = sender.getParameters();
    params.degradationPreference = 'maintain-framerate';
    params.encodings = [
      {
        ...(params.encodings && params.encodings[0] ? params.encodings[0] : {}),
        maxBitrate: 1_500_000,
        maxFramerate: 30,
        scaleResolutionDownBy: 1,
      },
    ];
    await sender.setParameters(params);
  } catch (err) {
    console.warn('Could not apply camera quality', err);
  }
}

function micAudioConstraints(deviceId) {
  const audio = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  };
  if (deviceId) audio.deviceId = { exact: deviceId };
  return { audio, video: false };
}

function micTrack() {
  return micProcessedStream
    ? micProcessedStream.getAudioTracks().find((track) => track.readyState === 'live') || null
    : null;
}

function micRms() {
  if (!micAnalyser) return 0;
  const buf = new Float32Array(micAnalyser.fftSize);
  micAnalyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (const sample of buf) sum += sample * sample;
  return Math.sqrt(sum / buf.length);
}

function updateVadMeter(level) {
  if (!micLevel) return;
  micLevel.style.width = `${Math.min(100, Math.round(level * 400))}%`;
}

function applyMicGate() {
  if (!micGate) return;
  const now = performance.now();
  const open = micUnmuted && now < micHangUntil;
  micGate.gain.value = open ? 1 : 0;
  if (micSpeaking !== open) {
    micSpeaking = open;
    refreshPeopleVoice();
  }
}

function tickMicVad() {
  micVadRaf = requestAnimationFrame(tickMicVad);
  if (!micAnalyser) return;
  const level = micRms();
  updateVadMeter(level);
  if (micUnmuted && level >= micSettings.threshold) micHangUntil = performance.now() + VAD_HANG_MS;
  applyMicGate();
}

function keepMicSinkAlive() {
  if (!micProcessedStream) return;
  if (!micSink) {
    micSink = new Audio();
    micSink.muted = true;
    micSink.autoplay = true;
    micSink.playsInline = true;
  }
  if (micSink.srcObject !== micProcessedStream) micSink.srcObject = micProcessedStream;
  micSink.play().catch(() => {});
}

function ensureMicGraph() {
  if (micCtx) return;
  micCtx = new AudioContext({ latencyHint: 'interactive' });
  micInputGain = micCtx.createGain();
  micInputGain.gain.value = micSettings.gain;
  micAnalyser = micCtx.createAnalyser();
  micAnalyser.fftSize = 1024;
  micAnalyser.smoothingTimeConstant = 0.3;
  micGate = micCtx.createGain();
  micGate.gain.value = 0;
  micDest = micCtx.createMediaStreamDestination();
  micInputGain.connect(micAnalyser);
  micAnalyser.connect(micGate);
  micGate.connect(micDest);
  micProcessedStream = micDest.stream;
  const sent = micTrack();
  if (sent && 'contentHint' in sent) sent.contentHint = 'speech';
  keepMicSinkAlive();
  if (!micVadRaf) micVadRaf = requestAnimationFrame(tickMicVad);
}

function connectMicSource(stream) {
  if (micSource) {
    try { micSource.disconnect(); } catch { /* already gone */ }
    micSource = null;
  }
  if (micRawStream && micRawStream !== stream) {
    for (const track of micRawStream.getTracks()) track.stop();
  }
  micRawStream = stream;
  const raw = stream.getAudioTracks()[0];
  if (raw && 'contentHint' in raw) raw.contentHint = 'speech';
  micSource = micCtx.createMediaStreamSource(stream);
  micSource.connect(micInputGain);
}

function preferMicCodecs(pc) {
  if (!pc || typeof RTCRtpSender.getCapabilities !== 'function') return;
  const caps = RTCRtpSender.getCapabilities('audio');
  if (!caps || !caps.codecs.length) return;
  const opus = [];
  const rest = [];
  for (const codec of caps.codecs) {
    if (String(codec.mimeType).toLowerCase() === 'audio/opus') opus.push(codec);
    else rest.push(codec);
  }
  const ordered = [...opus, ...rest];
  const peer = peerByPc(pc);
  for (const transceiver of pc.getTransceivers()) {
    if (!peer || transceiver.sender !== peer.micSender) continue;
    try {
      transceiver.setCodecPreferences(ordered);
    } catch (err) {
      console.warn('Could not set mic codec preferences', err);
    }
  }
}

async function applyMicQuality(peer) {
  const sender = peer && peer.micSender;
  if (!sender || !sender.track) return;
  try {
    const params = sender.getParameters();
    if (!params.encodings || !params.encodings.length) return;
    params.encodings[0].maxBitrate = MIC_BITRATE;
    await sender.setParameters(params);
  } catch (err) {
    console.warn('Could not apply mic quality', err);
  }
}

function signalMicToPeer(peer, on) {
  const sender = peer.micSender;
  if (!sender) return;
  const transceiver = peer.pc.getTransceivers().find((item) => item.sender === sender);
  if (!transceiver || transceiver.mid == null) return;
  sendSignal(peer.id, { type: 'source', role: 'mic', mid: String(transceiver.mid), on });
}

async function publishMicToPeer(peer) {
  const track = micTrack();
  if (!track) return;
  if (peer.micSender && peer.pc.getSenders().includes(peer.micSender)) {
    await peer.micSender.replaceTrack(track);
  } else {
    peer.micSender = peer.pc.addTrack(track, micProcessedStream);
  }
  preferMicCodecs(peer.pc);
  await applyMicQuality(peer);
  signalMicToPeer(peer, true);
}

async function fillMicDevices() {
  if (!micDevice) return;
  let devices = [];
  try {
    devices = (await navigator.mediaDevices.enumerateDevices()).filter((item) => item.kind === 'audioinput');
  } catch {
    devices = [];
  }
  const current = micSettings.deviceId;
  micDevice.replaceChildren(
    ...devices.map((item, index) => {
      const option = document.createElement('option');
      option.value = item.deviceId;
      option.textContent = item.label || `Microphone ${index + 1}`;
      return option;
    })
  );
  if (current && [...micDevice.options].some((option) => option.value === current)) {
    micDevice.value = current;
  } else if (micDevice.options.length) {
    micDevice.selectedIndex = 0;
  }
}

async function openMicDevice(deviceId) {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(micAudioConstraints(deviceId));
  } catch (err) {
    if (deviceId) {
      micSettings.deviceId = '';
      saveMicSettings();
      stream = await navigator.mediaDevices.getUserMedia(micAudioConstraints(''));
    } else {
      throw err;
    }
  }
  ensureMicGraph();
  await micCtx.resume().catch(() => {});
  connectMicSource(stream);
  keepMicSinkAlive();
  const used = stream.getAudioTracks()[0]?.getSettings?.().deviceId;
  if (used) {
    micSettings.deviceId = used;
    saveMicSettings();
  }
  await fillMicDevices();
  await Promise.all([...peers.values()].map((peer) => publishMicToPeer(peer)));
}

async function startMicCapture() {
  if (micStarting || micRawStream || micDenied) return;
  micStarting = true;
  loadMicSettings();
  syncMicControls();
  micUnmuted = false;
  micSpeaking = false;
  micHangUntil = 0;
  setMicLive(false);
  micBtn.disabled = false;
  try {
    await openMicDevice(micSettings.deviceId);
  } catch (err) {
    console.error(err);
    if (err && err.name === 'NotAllowedError') {
      micDenied = true;
      micBtn.disabled = true;
      showRoomError('Microphone was blocked.');
    } else {
      micBtn.disabled = false;
      showRoomError('Could not start the microphone.');
    }
  } finally {
    micStarting = false;
  }
}

function stopMicCapture() {
  if (micVadRaf) {
    cancelAnimationFrame(micVadRaf);
    micVadRaf = 0;
  }
  if (micSource) {
    try { micSource.disconnect(); } catch { /* already gone */ }
    micSource = null;
  }
  if (micRawStream) {
    for (const track of micRawStream.getTracks()) track.stop();
    micRawStream = null;
  }
  for (const peer of peers.values()) {
    signalMicToPeer(peer, false);
    if (peer.micSender) peer.micSender.replaceTrack(null).catch(() => {});
  }
  if (micSink) {
    micSink.pause();
    micSink.srcObject = null;
    micSink = null;
  }
  if (micCtx) {
    micCtx.close().catch(() => {});
    micCtx = null;
    micInputGain = null;
    micAnalyser = null;
    micGate = null;
    micDest = null;
  }
  micProcessedStream = null;
  micUnmuted = false;
  micSpeaking = false;
  micDenied = false;
  micStarting = false;
  setMicLive(false);
  setMicOpen(false);
  if (micLevel) micLevel.style.width = '0';
  syncMicControls();
}

function setMicUnmuted(on) {
  micUnmuted = Boolean(on);
  if (micCtx) micCtx.resume().catch(() => {});
  keepMicSinkAlive();
  if (!micUnmuted) {
    micHangUntil = 0;
    micSpeaking = false;
  } else {
    micHangUntil = performance.now() + 400;
  }
  setMicLive(micUnmuted);
  syncMicControls();
  applyMicGate();
  refreshPeopleVoice();
}

function ensureVoiceCtx() {
  if (voiceCtx) return voiceCtx;
  voiceCtx = new AudioContext({ latencyHint: 'interactive' });
  return voiceCtx;
}

function applyVoiceGain(peer) {
  if (!peer) return;
  const vol = peer.voiceMuted ? 0 : (Number.isFinite(peer.voiceVolume) ? peer.voiceVolume : 1);
  if (peer.voiceEl) {
    peer.voiceEl.muted = vol === 0;
    peer.voiceEl.volume = Math.min(1, vol || 0);
  }
  if (peer.voiceGraph) {
    const extra = vol > 1 ? vol : 0;
    peer.voiceGraph.gain.gain.value = extra;
  }
}

function remoteMicRms(peer) {
  const analyser = peer.voiceGraph && peer.voiceGraph.analyser;
  if (!analyser) return 0;
  const buf = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (const sample of buf) sum += sample * sample;
  return Math.sqrt(sum / buf.length);
}

function tickRemoteVoice(peer) {
  if (!peer.voiceGraph) return;
  peer.voiceRaf = requestAnimationFrame(() => tickRemoteVoice(peer));
  const speaking = !peer.voiceMuted && remoteMicRms(peer) >= 0.04;
  if (peer.voiceSpeaking !== speaking) {
    peer.voiceSpeaking = speaking;
    refreshPeopleVoice();
  }
}

function detachRemoteMic(peer) {
  if (!peer) return;
  if (peer.voiceRaf) {
    cancelAnimationFrame(peer.voiceRaf);
    peer.voiceRaf = 0;
  }
  if (peer.voiceGraph) {
    try { peer.voiceGraph.source.disconnect(); } catch { /* already gone */ }
    try { peer.voiceGraph.analyser.disconnect(); } catch { /* already gone */ }
    try { peer.voiceGraph.gain.disconnect(); } catch { /* already gone */ }
    peer.voiceGraph = null;
  }
  if (peer.voiceEl) {
    peer.voiceEl.pause();
    peer.voiceEl.srcObject = null;
  }
  peer.voiceSpeaking = false;
}

function attachRemoteMic(peer, mid, track) {
  detachRemoteMic(peer);
  if (!track || track.kind !== 'audio') return;
  track.enabled = true;
  const stream = new MediaStream([track]);
  const el = peer.voiceEl || new Audio();
  peer.voiceEl = el;
  el.autoplay = true;
  el.playsInline = true;
  el.srcObject = stream;
  const ctx = ensureVoiceCtx();
  ctx.resume().catch(() => {});
  try {
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.3;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(analyser);
    analyser.connect(gain);
    gain.connect(ctx.destination);
    peer.voiceGraph = { source, analyser, gain };
  } catch (err) {
    console.warn('Voice analyser failed', err);
  }
  peer.voiceMid = mid;
  applyVoiceGain(peer);
  el.play().catch(() => {});
  tickRemoteVoice(peer);
}

function shouldTreatAsMic(peer, mid, track) {
  return Boolean(track && track.kind === 'audio' && mid && peer.micMids.has(mid));
}

function handleMicSource(peer, data) {
  const mid = data.mid != null ? String(data.mid) : '';
  if (!mid) return;
  if (data.on) peer.micMids.add(mid);
  else peer.micMids.delete(mid);
  if (!data.on) {
    detachRemoteMic(peer);
    refreshPeopleVoice();
    return;
  }
  let track = null;
  for (const [item, mapped] of peer.trackMids) {
    if (mapped === mid && item.kind === 'audio') track = item;
  }
  if (!track) return;
  if (peer.stream && peer.stream.getAudioTracks().includes(track)) {
    peer.stream.removeTrack(track);
    bindRemoteVideo(peer, true);
  }
  attachRemoteMic(peer, mid, track);
}

function closeVoiceCtx() {
  for (const peer of peers.values()) detachRemoteMic(peer);
  if (voiceCtx) {
    voiceCtx.close().catch(() => {});
    voiceCtx = null;
  }
}

function renderQualityRow() {
  qualityRow.replaceChildren();
  for (const preset of Object.values(QUALITY_PRESETS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quality-btn';
    button.textContent = preset.label;
    button.setAttribute('aria-pressed', preset.id === shareQuality ? 'true' : 'false');
    button.addEventListener('click', () => {
      shareQuality = preset.id;
      renderQualityRow();
    });
    qualityRow.append(button);
  }
}

function attachDisplayAudio(track) {
  track.enabled = true;
  if ('contentHint' in track) track.contentHint = 'music';
}

function publishLocalTrack(pc, track, stream) {
  const peer = peerByPc(pc);
  if (peer) {
    const stored = peer.screenSenders[track.kind];
    if (stored && pc.getSenders().includes(stored)) {
      return stored.replaceTrack(track);
    }
    const reusable = pc.getSenders().find((sender) => {
      if (sender === peer.cameraSender || sender === peer.micSender) return false;
      if (sender === peer.screenSenders.video || sender === peer.screenSenders.audio) return false;
      return sender.track?.kind === track.kind;
    });
    if (reusable) {
      peer.screenSenders[track.kind] = reusable;
      return reusable.replaceTrack(track);
    }
  }
  const sender = pc.addTrack(track, stream);
  if (peer) peer.screenSenders[track.kind] = sender;
  return Promise.resolve();
}

function liveShareVideo(stream) {
  return stream.getVideoTracks().find((track) => track.readyState === 'live') || null;
}

async function recaptureLastDesktop() {
  if (!desktop || !lastDesktopSource || replacingShare) {
    stopShare();
    return;
  }
  replacingShare = true;
  try {
    const source = lastDesktopSource;
    const videoStream = await captureDesktopVideo(source.id);
    stopDesktopAudio();
    const audioTrack = await startDesktopAudio(
      source.kind === 'screen' ? { system: true } : { hwnd: source.hwnd }
    );
    const tracks = [...videoStream.getVideoTracks()];
    if (audioTrack) tracks.push(audioTrack);
    await switchLocalShare(new MediaStream(tracks));
    lastDesktopCaptureAt = Date.now();
  } catch (err) {
    console.error(err);
    stopShare();
  } finally {
    replacingShare = false;
  }
}

function onShareVideoEnded(stream) {
  if (localStream !== stream || replacingShare) return;
  if (shareEndTimer) clearTimeout(shareEndTimer);
  shareEndTimer = setTimeout(() => {
    shareEndTimer = null;
    if (localStream !== stream) return;
    if (liveShareVideo(stream)) {
      publishShareStream(stream).catch((err) => console.error(err));
      return;
    }
    if (desktop && lastDesktopSource) {
      if (Date.now() - lastDesktopCaptureAt < 800) {
        stopShare();
        return;
      }
      recaptureLastDesktop();
      return;
    }
    stopShare();
  }, 300);
}

function watchShareStream(stream) {
  stream.addEventListener('addtrack', (event) => {
    const track = event.track;
    if (localStream !== stream || !track || track.readyState !== 'live') return;
    if (shareEndTimer) {
      clearTimeout(shareEndTimer);
      shareEndTimer = null;
    }
    if (track.kind === 'audio') attachDisplayAudio(track);
    if (track.kind === 'video') applyCaptureHint(track);
    for (const peer of peers.values()) {
      publishLocalTrack(peer.pc, track, stream);
      if (track.kind === 'video') applyVideoQuality(peer.pc);
    }
    localVideo.srcObject = stream;
    track.addEventListener('ended', () => {
      if (track.kind === 'audio') {
        if (localStream === stream && !replacingShare) {
          showRoomError('Share audio stopped. Start again and enable audio in the picker.');
        }
        return;
      }
      onShareVideoEnded(stream);
    });
  });
}

async function publishShareStream(stream) {
  const videoPcs = [];
  const publishJobs = [];
  for (const track of stream.getTracks()) {
    if (track.readyState !== 'live') continue;
    for (const peer of peers.values()) {
      publishJobs.push(publishLocalTrack(peer.pc, track, stream));
      if (track.kind === 'video') videoPcs.push(peer.pc);
    }
  }
  await Promise.all(publishJobs);
  await Promise.all([...new Set(videoPcs)].map((pc) => applyVideoQuality(pc)));
  localVideo.srcObject = stream;
}

async function attachLocalStream(stream) {
  localStream = stream;
  localVideo.srcObject = stream;
  setLocalSharing(true);
  for (const track of stream.getAudioTracks()) attachDisplayAudio(track);
  for (const track of stream.getVideoTracks()) applyCaptureHint(track);
  watchShareStream(stream);
  for (const track of stream.getTracks()) {
    track.addEventListener('ended', () => {
      if (localStream !== stream) return;
      if (track.kind === 'audio') {
        if (!replacingShare) {
          showRoomError('Share audio stopped. Start again and enable audio in the picker.');
        }
        return;
      }
      onShareVideoEnded(stream);
    });
  }
  await publishShareStream(stream);
  signalScreenToPeers(true);
  if (!stream.getAudioTracks().length) {
    showRoomError(
      desktop
        ? 'No audio on this share. The selected app may be silent, or the loopback helper is missing.'
        : 'No audio on this share. Pick a browser tab or the whole screen, and enable audio in the picker. Sharing a window is video only.'
    );
  }
}

async function captureDisplay() {
  const audio = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  };
  const attempts = [
    {
      video: videoCaptureConstraints(),
      audio,
      systemAudio: 'include',
      surfaceSwitching: 'include',
    },
    {
      video: true,
      audio: true,
      systemAudio: 'include',
      surfaceSwitching: 'include',
    },
    { video: true, audio: true, systemAudio: 'include' },
  ];
  let lastErr;
  for (const options of attempts) {
    try {
      return await navigator.mediaDevices.getDisplayMedia(options);
    } catch (err) {
      lastErr = err;
      if (err && (err.name === 'NotAllowedError' || err.name === 'AbortError')) throw err;
      if (err && (err.name === 'OverconstrainedError' || err.name === 'TypeError')) continue;
      throw err;
    }
  }
  throw lastErr;
}

function hidePicker() {
  picker.hidden = true;
  pickerGrid.replaceChildren();
  pickerGrid.hidden = false;
  pickerContinue.hidden = true;
  pickerContinue.textContent = 'Continue';
  qualityRow.hidden = false;
  if (pickerTabs) pickerTabs.hidden = true;
  if (pickerEmpty) pickerEmpty.hidden = true;
  if (pickerTitle) pickerTitle.textContent = 'Share';
  if (cameraPreviewStream && cameraPreviewStream !== cameraStream) {
    for (const track of cameraPreviewStream.getTracks()) track.stop();
    cameraPreviewStream = null;
  }
  if (cameraPreview) {
    cameraPreview.srcObject = null;
    cameraPreview.hidden = true;
  }
}

function openPicker() {
  picker.hidden = false;
  renderQualityRow();
  if (pickerTabs) pickerTabs.hidden = true;
  if (pickerEmpty) pickerEmpty.hidden = true;
}

function pickShareQuality() {
  return new Promise((resolve) => {
    openPicker();
    pickerGrid.replaceChildren();
    pickerGrid.hidden = true;
    pickerContinue.hidden = false;
    pickerCancel.onclick = () => {
      hidePicker();
      resolve(false);
    };
    pickerContinue.onclick = () => {
      hidePicker();
      resolve(true);
    };
  });
}

function sourceGroup(source) {
  if (source.group === 'browser' || source.group === 'window') return source.group;
  return source.kind === 'screen' ? 'window' : 'window';
}

function pickerItem(source, onChoose) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'picker-item';
  const thumb = document.createElement('span');
  thumb.className = 'picker-thumb';
  const shot = document.createElement('img');
  shot.className = 'picker-shot';
  shot.alt = '';
  shot.src = source.thumbnail || '';
  thumb.append(shot);
  if (source.icon) {
    const icon = document.createElement('img');
    icon.className = 'picker-app';
    icon.alt = source.app || '';
    icon.src = source.icon;
    thumb.append(icon);
  }
  const label = document.createElement('span');
  if (source.kind === 'screen') label.textContent = `Screen · ${source.name}`;
  else if (source.app) label.textContent = `${source.app} · ${source.name}`;
  else label.textContent = source.name;
  button.append(thumb, label);
  button.addEventListener('click', () => onChoose(source));
  return button;
}

function renderDesktopSources(sources, group, onChoose) {
  const items = sources.filter((source) => sourceGroup(source) === group);
  pickerGrid.replaceChildren();
  if (!items.length) {
    pickerGrid.hidden = true;
    if (pickerEmpty) {
      pickerEmpty.hidden = false;
      pickerEmpty.textContent = group === 'browser'
        ? 'No Chrome, Edge, Firefox, or Brave windows are open.'
        : 'No windows or screens found.';
    }
    return;
  }
  if (pickerEmpty) pickerEmpty.hidden = true;
  pickerGrid.hidden = false;
  const ordered = group === 'window'
    ? [...items.filter((item) => item.kind === 'screen'), ...items.filter((item) => item.kind !== 'screen')]
    : items;
  for (const source of ordered) pickerGrid.append(pickerItem(source, onChoose));
}

function pickDesktopSource() {
  return new Promise(async (resolve) => {
    openPicker();
    pickerGrid.replaceChildren();
    pickerGrid.hidden = false;
    pickerContinue.hidden = true;
    if (pickerTabs) pickerTabs.hidden = false;
    const finish = (value) => {
      hidePicker();
      resolve(value);
    };
    pickerCancel.onclick = () => finish(null);
    let sources = [];
    try {
      sources = await desktop.listSources();
    } catch (err) {
      console.error(err);
      showRoomError('Could not list windows.');
      finish(null);
      return;
    }
    if (!sources.length) {
      showRoomError('No windows or screens found.');
      finish(null);
      return;
    }
    let group = sources.some((source) => sourceGroup(source) === 'window') ? 'window' : 'browser';
    const setGroup = (next) => {
      group = next;
      if (pickerTabWindows) pickerTabWindows.setAttribute('aria-selected', next === 'window' ? 'true' : 'false');
      if (pickerTabBrowsers) pickerTabBrowsers.setAttribute('aria-selected', next === 'browser' ? 'true' : 'false');
      renderDesktopSources(sources, group, finish);
    };
    if (pickerTabWindows) pickerTabWindows.onclick = () => setGroup('window');
    if (pickerTabBrowsers) pickerTabBrowsers.onclick = () => setGroup('browser');
    setGroup(group);
  });
}

async function captureDesktopVideo(sourceId) {
  await desktop.selectSource(sourceId);
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: videoCaptureConstraints(),
      audio: false,
    });
  } catch (err) {
    if (err && (err.name === 'OverconstrainedError' || err.name === 'TypeError')) {
      return navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    }
    throw err;
  }
}

const SILENCE_MSG = 'No audio captured. Play sound in the selected window, or share the whole screen.';

function stopDesktopEnergyWatch() {
  if (desktopAudio.energyTimer) {
    clearTimeout(desktopAudio.energyTimer);
    clearInterval(desktopAudio.energyTimer);
    desktopAudio.energyTimer = null;
  }
}

function startDesktopEnergyWatch() {
  stopDesktopEnergyWatch();
  let samples = 0;
  let sumSq = 0;
  let gotPcm = false;
  let ticks = 0;

  const rmsNow = () => (samples ? Math.sqrt(sumSq / samples) : 0);
  const heardAudio = () => rmsNow() >= 0.0005;
  const clearSilence = () => {
    if (roomError.textContent === SILENCE_MSG) showRoomError('');
  };

  desktopAudio.energyTimer = setInterval(() => {
    ticks += 1;
    if (heardAudio()) {
      clearSilence();
      stopDesktopEnergyWatch();
      return;
    }
    samples = 0;
    sumSq = 0;
    if (gotPcm || ticks >= 2) showRoomError(SILENCE_MSG);
  }, 2000);

  return (floats) => {
    gotPcm = true;
    for (let i = 0; i < floats.length; i++) sumSq += floats[i] * floats[i];
    samples += floats.length;
    if (heardAudio()) {
      clearSilence();
      stopDesktopEnergyWatch();
    }
  };
}

async function startDesktopAudio(target) {
  const started = await desktop.startLoopback(target);
  if (!started || !started.ok) {
    showRoomError(started && started.error ? started.error : 'Could not start native audio.');
    return null;
  }
  const ctx = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
  await ctx.audioWorklet.addModule('/pcm-worklet.js');
  if (ctx.state === 'suspended') await ctx.resume();
  const node = new AudioWorkletNode(ctx, 'pcm-source', {
    numberOfOutputs: 1,
    outputChannelCount: [2],
  });
  const dest = ctx.createMediaStreamDestination();
  const mute = ctx.createGain();
  mute.gain.value = 0;
  node.connect(dest);
  node.connect(mute);
  mute.connect(ctx.destination);
  const noteEnergy = startDesktopEnergyWatch();
  const unsub = desktop.onPcm((buffer) => {
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer);
    if (bytes.byteLength >= 4) {
      const aligned = bytes.byteLength - (bytes.byteLength % 4);
      const copy = bytes.slice(0, aligned);
      noteEnergy(new Float32Array(copy.buffer, copy.byteOffset, copy.byteLength / 4));
    }
    node.port.postMessage(buffer, buffer instanceof ArrayBuffer ? [buffer] : []);
  });
  desktopAudio = { ctx, node, mute, unsub, energyTimer: desktopAudio.energyTimer };
  const track = dest.stream.getAudioTracks()[0];
  if (track) attachDisplayAudio(track);
  return track;
}

function stopDesktopAudio() {
  stopDesktopEnergyWatch();
  if (desktopAudio.unsub) desktopAudio.unsub();
  if (desktop) desktop.stopLoopback();
  if (desktopAudio.node) desktopAudio.node.disconnect();
  if (desktopAudio.mute) desktopAudio.mute.disconnect();
  if (desktopAudio.ctx) desktopAudio.ctx.close();
  desktopAudio = { ctx: null, node: null, mute: null, unsub: null, energyTimer: null };
}

async function captureDesktopShare() {
  const source = await pickDesktopSource();
  if (!source) return null;
  lastDesktopSource = source;
  lastDesktopCaptureAt = Date.now();
  const videoStream = await captureDesktopVideo(source.id);
  stopDesktopAudio();
  const audioTrack = await startDesktopAudio(
    source.kind === 'screen' ? { system: true } : { hwnd: source.hwnd }
  );
  const tracks = [...videoStream.getVideoTracks()];
  if (audioTrack) tracks.push(audioTrack);
  return new MediaStream(tracks);
}

async function startDesktopShare() {
  const stream = await captureDesktopShare();
  if (!stream) return;
  await attachLocalStream(stream);
}

async function switchLocalShare(stream) {
  const previous = localStream;
  await attachLocalStream(stream);
  if (previous && previous !== stream) {
    for (const track of previous.getTracks()) track.stop();
  }
}

async function changeScreen() {
  if (!localStream || !picker.hidden) return;
  showRoomError('');
  changeBtn.disabled = true;
  replacingShare = true;
  try {
    if (desktop) {
      const stream = await captureDesktopShare();
      if (!stream) return;
      await switchLocalShare(stream);
      return;
    }
    const chosen = await pickShareQuality();
    if (!chosen) return;
    const stream = await captureDisplay();
    await switchLocalShare(stream);
  } catch (err) {
    if (err && err.name === 'NotAllowedError') {
      showRoomError('Screen share was blocked.');
      return;
    }
    showRoomError('Could not change screen.');
  } finally {
    replacingShare = false;
    changeBtn.disabled = false;
  }
}

async function startShare() {
  if (!picker.hidden) return;
  showRoomError('');
  try {
    if (desktop) {
      await startDesktopShare();
      return;
    }
    const chosen = await pickShareQuality();
    if (!chosen) return;
    const stream = await captureDisplay();
    await attachLocalStream(stream);
  } catch (err) {
    stopDesktopAudio();
    if (err && err.name === 'NotAllowedError') {
      showRoomError('Screen share was blocked.');
      return;
    }
    showRoomError('Could not start screen share.');
  }
}

function signalScreenToPeer(peer, on) {
  sendSignal(peer.id, { type: 'source', role: 'screen', on: Boolean(on) });
}

function signalScreenToPeers(on) {
  for (const peer of peers.values()) signalScreenToPeer(peer, on);
}

function stopShare() {
  if (shareEndTimer) {
    clearTimeout(shareEndTimer);
    shareEndTimer = null;
  }
  lastDesktopSource = null;
  stopDesktopAudio();
  hidePicker();
  const stream = localStream;
  localStream = null;
  if (stream) {
    for (const track of stream.getTracks()) track.stop();
  }
  localVideo.srcObject = null;
  localVideo.load();
  setLocalSharing(false);
  signalScreenToPeers(false);
  for (const peer of peers.values()) {
    for (const kind of ['video', 'audio']) {
      const sender = peer.screenSenders[kind];
      if (sender && sender.track) sender.replaceTrack(null).catch(() => {});
    }
  }
  if (featuredView.kind === 'camera') {
    renderCamFeature();
    renderCamStack();
  }
}

function setCameraLive(live) {
  cameraBtn.dataset.live = live ? 'true' : 'false';
  cameraBtn.setAttribute('aria-pressed', live ? 'true' : 'false');
}

function cameraTrack() {
  return cameraStream ? cameraStream.getVideoTracks().find((track) => track.readyState === 'live') || null : null;
}

function signalCameraToPeer(peer, on) {
  const sender = peer.cameraSender;
  if (!sender) return;
  const transceiver = peer.pc.getTransceivers().find((item) => item.sender === sender);
  if (!transceiver || transceiver.mid == null) return;
  sendSignal(peer.id, { type: 'source', role: 'camera', mid: String(transceiver.mid), on });
}

async function publishCameraToPeer(peer) {
  const track = cameraTrack();
  if (!track) return;
  if (peer.cameraSender && peer.pc.getSenders().includes(peer.cameraSender)) {
    await peer.cameraSender.replaceTrack(track);
  } else {
    peer.cameraSender = peer.pc.addTrack(track, cameraStream);
  }
  preferVideoCodecs(peer.pc);
  await applyCameraQuality(peer);
  signalCameraToPeer(peer, true);
}

async function attachCameraStream(stream) {
  cameraStream = stream;
  setCameraLive(true);
  const video = stream.getVideoTracks()[0];
  if (video) {
    video.addEventListener('ended', () => {
      if (cameraStream === stream) stopCamera();
    });
  }
  await Promise.all([...peers.values()].map((peer) => publishCameraToPeer(peer)));
}

function previewAndConfirmCamera() {
  return new Promise(async (resolve, reject) => {
    openPicker();
    if (pickerTitle) pickerTitle.textContent = 'Camera';
    qualityRow.hidden = true;
    pickerGrid.replaceChildren();
    pickerGrid.hidden = true;
    pickerContinue.hidden = false;
    pickerContinue.textContent = 'Confirm';
    try {
      cameraPreviewStream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
    } catch (err) {
      hidePicker();
      reject(err);
      return;
    }
    cameraPreview.srcObject = cameraPreviewStream;
    cameraPreview.hidden = false;
    cameraPreview.play().catch(() => {});
    pickerCancel.onclick = () => {
      hidePicker();
      resolve(null);
    };
    pickerContinue.onclick = () => {
      const stream = cameraPreviewStream;
      cameraPreviewStream = null;
      hidePicker();
      resolve(stream);
    };
  });
}

async function startCamera() {
  if (!picker.hidden) return;
  showRoomError('');
  try {
    const stream = await previewAndConfirmCamera();
    if (!stream) return;
    await attachCameraStream(stream);
  } catch (err) {
    if (cameraPreviewStream && cameraPreviewStream !== cameraStream) {
      for (const track of cameraPreviewStream.getTracks()) track.stop();
      cameraPreviewStream = null;
    }
    if (err && err.name === 'NotAllowedError') {
      showRoomError('Camera was blocked.');
      return;
    }
    showRoomError('Could not start camera.');
  }
}

function stopCamera() {
  if (cameraStream) {
    for (const track of cameraStream.getTracks()) track.stop();
    cameraStream = null;
  }
  setCameraLive(false);
  for (const peer of peers.values()) {
    signalCameraToPeer(peer, false);
    if (peer.cameraSender) peer.cameraSender.replaceTrack(null).catch(() => {});
  }
}

function remoteHasAudio(peer) {
  return liveRemoteTracks(peer).some((track) => track.kind === 'audio');
}

function liveRemoteTracks(peer) {
  return peer.stream
    ? peer.stream.getTracks().filter((track) => track.readyState === 'live')
    : [];
}

function livePaneTracks(peer) {
  return liveRemoteTracks(peer).filter((track) => track.kind === 'video');
}

function clearPaneVideo(video) {
  if (!video) return;
  video.srcObject = null;
  try {
    video.load();
  } catch {
    // ignore
  }
}

function shouldTreatAsCamera(peer, mid, track) {
  if (!track || track.kind !== 'video') return false;
  return Boolean(mid && peer.cameraMids.has(mid));
}

function findCameraTrack(peer, mid) {
  if (peer.pendingVideos.has(mid)) {
    const pending = peer.pendingVideos.get(mid);
    peer.pendingVideos.delete(mid);
    return pending;
  }
  for (const [track, trackMid] of peer.trackMids) {
    if (trackMid === mid && track.kind === 'video' && track.readyState === 'live') return track;
  }
  if (peer.pendingVideos.size === 1) {
    const [key, track] = peer.pendingVideos.entries().next().value;
    const trackMid = peer.trackMids.get(track);
    if (track && track.kind === 'video' && (!trackMid || trackMid === mid)) {
      peer.pendingVideos.delete(key);
      return track;
    }
  }
  return null;
}

function restoreOrphanScreen(peer, skipTrack) {
  for (const [track, mid] of peer.trackMids) {
    if (track === skipTrack) continue;
    if (track.kind !== 'video' || track.readyState !== 'live') continue;
    if (!mid || peer.cameraMids.has(mid)) continue;
    if ([...peer.cameraTracks.values()].includes(track)) continue;
    if (peer.stream && peer.stream.getVideoTracks().includes(track)) continue;
    replaceRemoteTrack(peer, track);
    watchRemoteTrack(peer, track);
    setPaneLive(peer.pane, true, 'Live');
    playRemote(peer);
  }
}

function featuredScreenTrack() {
  if (featured === 'you') {
    return localStream ? localStream.getVideoTracks().find((track) => track.readyState === 'live') || null : null;
  }
  const peer = peers.get(featured);
  if (!peer || !peer.stream) return null;
  return peer.stream.getVideoTracks().find((track) => track.readyState === 'live') || null;
}

function collectRemoteCameras() {
  const cams = [];
  for (const peer of peers.values()) {
    for (const [mid, track] of peer.cameraTracks) {
      if (track.readyState !== 'live') continue;
      cams.push({ peerId: peer.id, mid, track });
    }
  }
  return cams;
}

function collectStackItems() {
  const items = [];
  for (const cam of collectRemoteCameras()) {
    if (featuredView.kind === 'camera' && featuredView.peerId === cam.peerId && featuredView.mid === cam.mid) {
      continue;
    }
    items.push({ kind: 'camera', ...cam });
  }
  if (featuredView.kind === 'camera') {
    items.push({ kind: 'screen', peerId: featured, track: featuredScreenTrack() });
  }
  return items;
}

function unfeatureCamera() {
  featuredView = { kind: 'pane' };
  renderCamFeature();
  renderCamStack();
  placeCamChrome();
}

function placeCamChrome() {
  const fs = fullscreenElement();
  const pane = fs && fs.classList && fs.classList.contains('pane') ? fs : getFeaturedPane();
  if (pane) pane.append(camFeature);
  if (fs && fs.classList && fs.classList.contains('pane')) fs.append(camStack);
  else stage.append(camStack);
}

function renderCamFeature() {
  if (featuredView.kind !== 'camera') {
    camFeature.hidden = true;
    camFeature.srcObject = null;
    return;
  }
  const peer = peers.get(featuredView.peerId);
  const track = peer && peer.cameraTracks.get(featuredView.mid);
  if (!track || track.readyState !== 'live') {
    featuredView = { kind: 'pane' };
    camFeature.hidden = true;
    camFeature.srcObject = null;
    return;
  }
  camFeature.hidden = false;
  camFeature.srcObject = new MediaStream([track]);
  camFeature.play().catch(() => {});
}

function renderCamStack() {
  const items = collectStackItems();
  camStack.replaceChildren();
  const extra = Math.max(0, items.length - 1) * 12;
  camStack.style.width = `calc(8rem + ${extra}px)`;
  camStack.style.height = `calc(6rem + ${extra}px)`;
  items.forEach((item, index, arr) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cam-tile';
    button.style.zIndex = String(index);
    button.style.right = `${(arr.length - 1 - index) * 12}px`;
    button.style.bottom = `${(arr.length - 1 - index) * 12}px`;
    if (item.track) {
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = new MediaStream([item.track]);
      button.append(video);
    } else {
      button.classList.add('cam-tile-idle');
      button.title = 'Show room';
    }
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (item.kind === 'screen') {
        unfeatureCamera();
        return;
      }
      featuredView = { kind: 'camera', peerId: item.peerId, mid: item.mid };
      renderCamFeature();
      renderCamStack();
      placeCamChrome();
    });
    camStack.append(button);
  });
  syncFloatWindow();
}

function refreshRemoteMedia() {
  renderCamFeature();
  renderCamStack();
}

function addRemoteCamera(peer, mid, track) {
  if (peer.stream && peer.stream.getTracks().includes(track)) {
    peer.stream.removeTrack(track);
  }
  peer.cameraTracks.set(mid || track.id, track);
  watchCameraTrack(peer, mid || track.id, track);
  const live = livePaneTracks(peer);
  setPaneLive(peer.pane, live.length > 0, live.length ? 'Live' : 'Idle');
  if (live.length) bindRemoteVideo(peer);
  else {
    clearPaneVideo(peer.video);
    peer.unmute.hidden = true;
  }
  restoreOrphanScreen(peer);
  refreshRemoteMedia();
}

function watchCameraTrack(peer, mid, track) {
  const refresh = () => {
    if (track.readyState !== 'ended') return;
    peer.cameraTracks.delete(mid);
    if (featuredView.kind === 'camera' && featuredView.peerId === peer.id && featuredView.mid === mid) {
      featuredView = { kind: 'pane' };
    }
    refreshRemoteMedia();
  };
  track.addEventListener('ended', refresh);
}

function promotePendingScreen(peer) {
  for (const [key, track] of [...peer.pendingVideos]) {
    if (peer.cameraMids.has(key)) continue;
    peer.pendingVideos.delete(key);
    if (!track || track.kind !== 'video' || track.readyState !== 'live') continue;
    const paneVideo = peer.stream
      ? peer.stream.getVideoTracks().find((item) => item.readyState === 'live')
      : null;
    if (paneVideo) continue;
    replaceRemoteTrack(peer, track);
    watchRemoteTrack(peer, track);
    setPaneLive(peer.pane, true, 'Live');
    playRemote(peer);
  }
}

function clearRemoteScreen(peer) {
  if (peer.stream) {
    for (const track of [...peer.stream.getTracks()]) peer.stream.removeTrack(track);
  }
  peer.boundTrackIds = '';
  setPaneLive(peer.pane, false, 'Idle');
  clearPaneVideo(peer.video);
  peer.unmute.hidden = true;
  if (featuredView.kind === 'camera') refreshRemoteMedia();
}

function handleSourceSignal(peer, data) {
  if (data.role === 'screen') {
    if (!data.on) clearRemoteScreen(peer);
    return;
  }
  if (data.role === 'mic') {
    handleMicSource(peer, data);
    return;
  }
  const mid = data.mid != null ? String(data.mid) : '';
  if (!mid) return;
  if (data.on) peer.cameraMids.add(mid);
  else peer.cameraMids.delete(mid);

  if (!data.on) {
    const stopped = peer.cameraTracks.get(mid);
    peer.cameraTracks.delete(mid);
    if (featuredView.kind === 'camera' && featuredView.peerId === peer.id && featuredView.mid === mid) {
      featuredView = { kind: 'pane' };
    }
    restoreOrphanScreen(peer, stopped);
    refreshRemoteMedia();
    return;
  }

  const found = findCameraTrack(peer, mid);
  if (found) addRemoteCamera(peer, mid, found);
  promotePendingScreen(peer);
  restoreOrphanScreen(peer);
}

function setFloatOpen(open) {
  floatBtn.dataset.open = open ? 'true' : 'false';
}

function floatDoc() {
  try {
    if (!floatWin || floatWin.closed) return null;
    return floatWin.document;
  } catch {
    return null;
  }
}

function floatCamKey(cam) {
  return `${cam.peerId}:${cam.mid}`;
}

function syncFloatWindow() {
  const doc = floatDoc();
  if (!doc) return false;
  const strip = doc.getElementById('cams');
  const empty = doc.getElementById('empty');
  if (!strip || !empty) return false;
  const cams = collectRemoteCameras();
  empty.hidden = cams.length > 0;
  const existing = new Map();
  for (const video of strip.querySelectorAll('video')) {
    existing.set(video.dataset.camKey, video);
  }
  const keep = new Set();
  for (const cam of cams) {
    const key = floatCamKey(cam);
    keep.add(key);
    let video = existing.get(key);
    const current = video && video.srcObject ? video.srcObject.getVideoTracks()[0] : null;
    if (video && current === cam.track) continue;
    if (!video) {
      video = doc.createElement('video');
      video.dataset.camKey = key;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      strip.append(video);
    }
    video.srcObject = new MediaStream([cam.track]);
    video.play().catch(() => {});
  }
  for (const [key, video] of existing) {
    if (!keep.has(key)) video.remove();
  }
  return true;
}

function closeFloatWindow() {
  if (floatWin && !floatWin.closed) floatWin.close();
  floatWin = null;
  if (floatPoll) {
    clearInterval(floatPoll);
    floatPoll = null;
  }
  setFloatOpen(false);
}

function openFloatWindow() {
  if (floatWin && !floatWin.closed) return;
  floatWin = window.open('/float.html', 'cams', 'width=800,height=280');
  if (!floatWin) {
    showRoomError('Could not open the camera window.');
    return;
  }
  let ready = false;
  const onReady = () => {
    ready = syncFloatWindow();
  };
  try {
    floatWin.addEventListener('load', onReady);
  } catch {
    // Electron may replace this window after setWindowOpenHandler.
  }
  onReady();
  if (floatPoll) clearInterval(floatPoll);
  floatPoll = setInterval(() => {
    if (!floatWin || floatWin.closed) {
      clearInterval(floatPoll);
      floatPoll = null;
      floatWin = null;
      setFloatOpen(false);
      return;
    }
    if (!ready) ready = syncFloatWindow();
  }, 400);
  setFloatOpen(true);
}

function replaceRemoteTrack(peer, track) {
  if (!peer.stream) peer.stream = new MediaStream();
  for (const existing of peer.stream.getTracks()) {
    if (existing.kind === track.kind || existing.readyState === 'ended') {
      peer.stream.removeTrack(existing);
    }
  }
  peer.stream.addTrack(track);
}

function applyPeerVolume(peer) {
  const vol = Number.isFinite(peer.volume) ? peer.volume : 1;
  peer.volume = vol;
  peer.video.volume = vol;
  if (peer.volumeSlider) peer.volumeSlider.value = String(vol);
}

function bindRemoteVideo(peer, force) {
  const live = liveRemoteTracks(peer);
  peer.video.autoplay = true;
  peer.video.playsInline = true;
  applyPeerVolume(peer);
  if (!live.length) {
    peer.boundTrackIds = '';
    clearPaneVideo(peer.video);
    return;
  }
  const ids = live.map((track) => track.id).sort().join(',');
  if (!force && peer.boundTrackIds === ids && peer.video.srcObject) return;
  peer.boundTrackIds = ids;
  peer.video.srcObject = new MediaStream(live);
}

function reloadRemotePane(peer) {
  bindRemoteVideo(peer, true);
  unlockRemoteAudio(peer);
}

function watchPlaybackHealth(peer) {
  if (peer.playWatch) return;
  peer.playWatch = setInterval(() => {
    const video = peer.video;
    if (!video || !isLive(peer.pane) || !video.srcObject) return;
    if (video.paused) video.play().catch(() => {});
  }, 1000);
}

async function playRemote(peer) {
  bindRemoteVideo(peer);
  peer.video.muted = true;
  try {
    await peer.video.play();
  } catch {
    // Video can still paint; audio button is a fallback.
  }
  if (!remoteHasAudio(peer)) {
    peer.video.muted = false;
    peer.unmute.hidden = true;
    return true;
  }
  if (!mediaUnlocked) {
    peer.unmute.hidden = false;
    return false;
  }
  peer.video.muted = false;
  try {
    await peer.video.play();
    peer.unmute.hidden = true;
    return true;
  } catch {
    peer.video.muted = true;
    await peer.video.play().catch(() => {});
    peer.unmute.hidden = false;
    return false;
  }
}

async function unlockRemoteAudio(peer) {
  mediaUnlocked = true;
  return playRemote(peer);
}

async function unlockMedia() {
  mediaUnlocked = true;
  ensureVoiceCtx();
  if (micCtx) micCtx.resume().catch(() => {});
  if (voiceCtx) voiceCtx.resume().catch(() => {});
  keepMicSinkAlive();
  for (const peer of peers.values()) {
    if (peer.voiceEl) peer.voiceEl.play().catch(() => {});
    if (peer.stream) playRemote(peer);
  }
  if (!leavingRoom && !roomView.hidden && !micRawStream && !micDenied && !micStarting) startMicCapture();
}

function watchRemoteTrack(peer, track) {
  const refresh = () => {
    if (peer.stream && track.readyState === 'ended') peer.stream.removeTrack(track);
    const live = livePaneTracks(peer);
    setPaneLive(peer.pane, live.length > 0, live.length ? 'Live' : 'Idle');
    if (!live.length) {
      clearPaneVideo(peer.video);
      peer.unmute.hidden = true;
      if (featuredView.kind === 'camera') refreshRemoteMedia();
      return;
    }
    bindRemoteVideo(peer);
    if (featuredView.kind === 'camera') refreshRemoteMedia();
  };
  track.addEventListener('ended', refresh);
  track.addEventListener('mute', () => {
    if (track.kind === 'video' && peer.video && peer.video.paused) {
      peer.video.play().catch(() => {});
    }
  });
  track.addEventListener('unmute', () => {
    track.enabled = true;
    refresh();
    if (isLive(peer.pane)) playRemote(peer);
  });
}

function createRemotePane(id) {
  const pane = document.createElement('section');
  pane.className = 'pane';
  pane.dataset.live = 'false';
  pane.dataset.slot = 'pip';
  pane.dataset.peer = id;
  pane.innerHTML = `
    <header class="pane-meta">
      <span class="pane-name"></span>
      <span class="tally" aria-hidden="true"></span>
      <span class="pane-state">Idle</span>
    </header>
    <video autoplay playsinline muted></video>
    <div class="pane-empty">
      <img src="/bearzzz.png" alt="" />
      <span>Not sharing</span>
    </div>
    <button class="unmute" hidden type="button">Click to hear them</button>
    <div class="pane-controls">
      <button class="pane-reload" type="button" aria-label="Reload stream">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5.5A6.5 6.5 0 1 1 5.7 8.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M5 4.5v4.2h4.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <input class="pane-volume" type="range" min="0" max="1" step="0.01" value="1" aria-label="Volume" />
    </div>
  `;
  const video = pane.querySelector('video');
  const unmute = pane.querySelector('.unmute');
  const reloadBtn = pane.querySelector('.pane-reload');
  const volumeSlider = pane.querySelector('.pane-volume');
  reloadBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const peer = peers.get(id);
    if (peer) reloadRemotePane(peer);
  });
  volumeSlider.addEventListener('pointerdown', (event) => event.stopPropagation());
  volumeSlider.addEventListener('click', (event) => event.stopPropagation());
  volumeSlider.addEventListener('input', () => {
    const peer = peers.get(id);
    if (!peer) return;
    peer.volume = Number(volumeSlider.value);
    applyPeerVolume(peer);
    unlockRemoteAudio(peer);
  });
  pane.querySelector('.pane-name').textContent = peerLabel(id);
  pane.addEventListener('click', (event) => onPaneClick(event, pane));
  pipRail.append(pane);
  return { pane, video, unmute, volumeSlider };
}

function setPeerName(id, name) {
  const peer = peers.get(id);
  if (!peer || !name) return peer;
  peer.name = name;
  const label = peer.pane.querySelector('.pane-name');
  if (label) label.textContent = name;
  renderPeopleList();
  return peer;
}

function resetPeer(id, name) {
  const existing = peers.get(id);
  const keepName = name || (existing && existing.name) || '';
  removePeer(id);
  return ensurePeer(id, keepName);
}

async function flushIce(peer) {
  peer.remoteReady = true;
  const queued = peer.iceQueue || [];
  peer.iceQueue = [];
  for (const candidate of queued) {
    try {
      await peer.pc.addIceCandidate(candidate);
    } catch (err) {
      if (!peer.ignoreOffer) console.error(err);
    }
  }
}

function recoverPeer(peer, forceReset) {
  if (!peer || !peer.pc || peer.pc.signalingState === 'closed') return;
  const now = Date.now();
  if (peer.recoverAt && now < peer.recoverAt) return;
  peer.recoverAt = now + 4000;
  if (!forceReset && peer.pc.remoteDescription) {
    try {
      peer.pc.restartIce();
      return;
    } catch {
      // rebuild below
    }
  }
  sendSignal(peer.id, { type: 'restart' });
  resetPeer(peer.id);
}

function ensurePeer(id, name) {
  if (peers.has(id)) {
    if (name) setPeerName(id, name);
    return peers.get(id);
  }
  const polite = peerPolite(id);
  const { pane, video, unmute, volumeSlider } = createRemotePane(id);
  const state = {
    id,
    name: name || '',
    polite,
    pane,
    video,
    unmute,
    volumeSlider,
    volume: 1,
    boundTrackIds: '',
    playWatch: null,
    pc: null,
    stream: null,
    iceQueue: [],
    remoteReady: false,
    iceTimer: null,
    recoverAt: 0,
    makingOffer: false,
    ignoreOffer: false,
    isSettingRemoteAnswerPending: false,
    screenSenders: { video: null, audio: null },
    cameraSender: null,
    micSender: null,
    cameraMids: new Set(),
    micMids: new Set(),
    cameraTracks: new Map(),
    pendingVideos: new Map(),
    trackMids: new Map(),
    voiceVolume: 1,
    voiceMuted: false,
    voiceSpeaking: false,
    voiceGraph: null,
    voiceRaf: 0,
    voiceMid: '',
  };
  const pc = new RTCPeerConnection({ iceServers });
  state.pc = pc;

  pc.onicecandidate = ({ candidate }) => {
    sendSignal(id, { type: 'ice', candidate });
  };

  const onIce = () => {
    const ice = pc.iceConnectionState;
    const conn = pc.connectionState;
    if (ice === 'connected' || ice === 'completed' || conn === 'connected') {
      if (state.iceTimer) {
        clearTimeout(state.iceTimer);
        state.iceTimer = null;
      }
      if (state.stream) playRemote(state);
      return;
    }
    if (ice === 'failed' || conn === 'failed') {
      recoverPeer(state);
      return;
    }
    if (ice === 'disconnected') {
      if (state.iceTimer) clearTimeout(state.iceTimer);
      state.iceTimer = setTimeout(() => {
        state.iceTimer = null;
        if (pc.signalingState === 'closed') return;
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          recoverPeer(state);
        }
      }, 2500);
    }
  };
  pc.oniceconnectionstatechange = onIce;
  pc.onconnectionstatechange = onIce;

  pc.ontrack = ({ track, transceiver }) => {
    track.enabled = true;
    const mid = transceiver && transceiver.mid != null ? String(transceiver.mid) : '';
    if (mid) state.trackMids.set(track, mid);
    if (track.kind === 'audio') {
      if (shouldTreatAsMic(state, mid, track) || !isLive(state.pane)) {
        if (mid) state.micMids.add(mid);
        attachRemoteMic(state, mid, track);
        return;
      }
      attachDisplayAudio(track);
    }
    if (shouldTreatAsCamera(state, mid, track)) {
      addRemoteCamera(state, mid, track);
      return;
    }
    if (track.kind === 'video') {
      const paneVideo = state.stream
        ? state.stream.getVideoTracks().find((item) => item.readyState === 'live' && item !== track)
        : null;
      if (paneVideo) {
        state.pendingVideos.set(mid || track.id, track);
        return;
      }
    }
    replaceRemoteTrack(state, track);
    watchRemoteTrack(state, track);
    const live = livePaneTracks(state);
    if (live.length && featured === 'you' && !isLive(paneYou)) featured = id;
    setPaneLive(pane, live.length > 0, live.length ? 'Live' : 'Idle');
    if (live.length || track.kind === 'audio') playRemote(state);
  };

  pc.onnegotiationneeded = async () => {
    try {
      state.makingOffer = true;
      preferVideoCodecs(pc);
      preferMicCodecs(pc);
      await pc.setLocalDescription();
      sendSignal(id, { type: 'sdp', description: pc.localDescription });
      if (cameraTrack()) signalCameraToPeer(state, true);
      if (micTrack()) {
        signalMicToPeer(state, true);
        applyMicQuality(state);
      }
    } catch (err) {
      console.error(err);
      showRoomError('Could not negotiate the connection.');
    } finally {
      state.makingOffer = false;
    }
  };

  unmute.addEventListener('click', async (event) => {
    event.stopPropagation();
    const ok = await unlockRemoteAudio(state);
    if (!ok && remoteHasAudio(state)) {
      showRoomError('Browser blocked audio. Click the page and try again.');
    }
  });

  peers.set(id, state);
  watchPlaybackHealth(state);

  if (localStream) {
    let hasVideo = false;
    for (const track of localStream.getTracks()) {
      publishLocalTrack(pc, track, localStream);
      if (track.kind === 'video') hasVideo = true;
    }
    preferVideoCodecs(pc);
    if (hasVideo) applyVideoQuality(pc);
    signalScreenToPeer(state, true);
  }
  if (cameraTrack()) publishCameraToPeer(state);
  if (micTrack()) publishMicToPeer(state);
  if (name) {
    const label = pane.querySelector('.pane-name');
    if (label) label.textContent = name;
  }
  setPeerStatus();
  applyLayout();
  return state;
}

function removePeer(id) {
  const peer = peers.get(id);
  if (!peer) return;
  detachRemoteMic(peer);
  if (voicePeerId === id) voicePeerId = null;
  if (peer.playWatch) {
    clearInterval(peer.playWatch);
    peer.playWatch = null;
  }
  if (peer.iceTimer) {
    clearTimeout(peer.iceTimer);
    peer.iceTimer = null;
  }
  peer.pc.onicecandidate = null;
  peer.pc.ontrack = null;
  peer.pc.onnegotiationneeded = null;
  peer.pc.oniceconnectionstatechange = null;
  peer.pc.onconnectionstatechange = null;
  peer.pc.close();
  peer.pane.remove();
  peers.delete(id);
  if (featured === id) featured = 'you';
  if (featuredView.kind === 'camera' && featuredView.peerId === id) {
    featuredView = { kind: 'pane' };
  }
  setPeerStatus();
  applyLayout();
  refreshRemoteMedia();
}

function closeAllPeers() {
  for (const id of [...peers.keys()]) removePeer(id);
}

async function handleSignal(from, data) {
  if (data.type === 'restart') {
    resetPeer(from);
    return;
  }
  const peer = ensurePeer(from);
  const { pc } = peer;
  if (data.type === 'source') {
    handleSourceSignal(peer, data);
    return;
  }
  if (data.type === 'ice') {
    if (!peer.remoteReady) {
      peer.iceQueue.push(data.candidate);
      return;
    }
    try {
      await pc.addIceCandidate(data.candidate);
    } catch (err) {
      if (!peer.ignoreOffer) console.error(err);
    }
    return;
  }
  if (!data.description) return;

  const description = data.description;
  if (pc.signalingState === 'closed') return;
  if (description.type === 'answer' && pc.signalingState !== 'have-local-offer') return;

  const readyForOffer =
    !peer.makingOffer && (pc.signalingState === 'stable' || peer.isSettingRemoteAnswerPending);
  const offerCollision = description.type === 'offer' && !readyForOffer;
  peer.ignoreOffer = !peer.polite && offerCollision;
  if (peer.ignoreOffer) return;

  peer.isSettingRemoteAnswerPending = description.type === 'answer';
  try {
    await pc.setRemoteDescription(description);
  } catch (err) {
    peer.isSettingRemoteAnswerPending = false;
    if (err && err.name === 'InvalidStateError') return;
    console.error(err);
    recoverPeer(peer, true);
    return;
  }
  peer.isSettingRemoteAnswerPending = false;
  await flushIce(peer);
  preferVideoCodecs(pc);
  preferMicCodecs(pc);

  if (description.type === 'offer') {
    await pc.setLocalDescription();
    sendSignal(from, { type: 'sdp', description: pc.localDescription });
    if (cameraTrack()) signalCameraToPeer(peer, true);
    if (micTrack()) {
      signalMicToPeer(peer, true);
      applyMicQuality(peer);
    }
  } else {
    if (cameraTrack()) signalCameraToPeer(peer, true);
    if (micTrack()) {
      signalMicToPeer(peer, true);
      applyMicQuality(peer);
    }
  }
}

function peerEntry(item) {
  if (!item) return null;
  if (typeof item === 'string') return { id: item, name: '' };
  return { id: item.id, name: item.name || '' };
}

async function handleRoomMessage(msg) {
  if (msg.type === 'hello') {
    myId = msg.id;
    if (msg.name) setYouName(msg.name);
    const listed = (msg.peers || []).map(peerEntry).filter((peer) => peer && peer.id);
    const listedIds = new Set(listed.map((peer) => peer.id));
    for (const id of [...peers.keys()]) {
      if (!listedIds.has(id)) removePeer(id);
    }
    for (const peer of listed) {
      const existing = peers.get(peer.id);
      if (!existing) {
        ensurePeer(peer.id, peer.name);
        sendSignal(peer.id, { type: 'restart' });
        continue;
      }
      setPeerName(peer.id, peer.name);
      const ice = existing.pc.iceConnectionState;
      const conn = existing.pc.connectionState;
      if (ice === 'failed' || conn === 'failed') recoverPeer(existing);
    }
    setPeerStatus();
    refreshRemoteMedia();
    return;
  }

  if (msg.type === 'peer-joined') {
    if (msg.id && msg.id !== myId) resetPeer(msg.id, msg.name);
    showRoomError('');
    return;
  }

  if (msg.type === 'peer-left') {
    removePeer(msg.id);
    return;
  }

  if (msg.type === 'signal') {
    try {
      await handleSignal(msg.from, msg.data);
    } catch (err) {
      console.error(err);
      showRoomError('Signaling failed. Refresh and try again.');
    }
  }
}

function connectSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const gen = ++socketGen;
  if (events) events.close();
  events = new EventSource('/api/stream');
  let opened = false;

  events.addEventListener('open', () => {
    opened = true;
    showRoomError('');
  });

  events.addEventListener('message', (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    roomQueue = roomQueue.then(() => handleRoomMessage(msg)).catch((err) => {
      console.error(err);
      showRoomError('Signaling failed. Refresh and try again.');
    });
  });

  events.addEventListener('error', () => {
    if (gen !== socketGen || leavingRoom) return;
    if (events && events.readyState === EventSource.CONNECTING) {
      if (opened) showRoomError('Reconnecting to the room…');
      return;
    }
    if (events && events.readyState === EventSource.CLOSED) {
      showRoomError('Disconnected from the room. Reconnecting…');
      reconnectTimer = setTimeout(() => connectSocket(), 1000);
    }
  });
}

async function enterRoom(info) {
  leavingRoom = false;
  if (info && info.username) setYouName(info.username);
  const configRes = await fetch('/api/config', { credentials: 'same-origin' });
  if (configRes.ok) {
    const config = await configRes.json();
    if (Array.isArray(config.iceServers) && config.iceServers.length) {
      iceServers = config.iceServers;
    }
  }
  showView('room');
  floatBtn.hidden = !desktop;
  setLocalSharing(Boolean(localStream));
  setCameraLive(Boolean(cameraTrack()));
  setMicLive(micUnmuted);
  setPeerStatus();
  applyLayout();
  refreshRemoteMedia();
  await connectSocket();
  await startMicCapture();
}

function disconnectSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socketGen += 1;
  if (events) {
    events.close();
    events = null;
  }
}

async function leaveRoom() {
  if (leavingRoom) return;
  leavingRoom = true;
  setPeopleOpen(false);
  setMicOpen(false);
  stopShare();
  stopCamera();
  stopMicCapture();
  closeVoiceCtx();
  disconnectSocket();
  closeAllPeers();
  setYouName('');
  myId = null;
  try {
    await fetch('/api/leave', { method: 'POST', credentials: 'same-origin' });
  } catch {
    // Still return home if the network blips.
  }
  showView('login');
  setHomeMode('join');
  prefillJoinForm();
  usernameInput.value = '';
  usernameInput.focus();
}

async function readError(res, fallback) {
  try {
    const body = await res.json();
    if (body && body.error) return body.error;
  } catch {
    // ignore
  }
  return fallback;
}

modeJoin.addEventListener('click', () => {
  setHomeMode('join');
  roomNameInput.focus();
});

modeCreate.addEventListener('click', () => {
  setHomeMode('create');
  roomNameInput.focus();
});

peerStatus.addEventListener('click', (event) => {
  event.stopPropagation();
  setPeopleOpen(peoplePanel.hidden);
});

micBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  if (micBtn.disabled) return;
  setMicOpen(micPanel.hidden);
});

micToggle.addEventListener('click', (event) => {
  event.stopPropagation();
  setMicUnmuted(!micUnmuted);
});

micDevice.addEventListener('change', async () => {
  const id = micDevice.value;
  micSettings.deviceId = id;
  saveMicSettings();
  try {
    await openMicDevice(id);
  } catch (err) {
    console.error(err);
    showRoomError('Could not switch microphone.');
  }
});

micGainSlider.addEventListener('input', () => {
  micSettings.gain = Number(micGainSlider.value) / 100;
  if (micInputGain) micInputGain.gain.value = micSettings.gain;
  saveMicSettings();
});

micVadSlider.addEventListener('input', () => {
  micSettings.threshold = Number(micVadSlider.value) / 100;
  saveMicSettings();
});

micPanel.addEventListener('click', (event) => event.stopPropagation());

document.addEventListener('click', (event) => {
  const inPeople = event.target.closest('.people-wrap');
  const inMic = event.target.closest('.mic-wrap');
  if (!peoplePanel.hidden && !inPeople) setPeopleOpen(false);
  if (!micPanel.hidden && !inMic) setMicOpen(false);
  if (voicePeerId && !inPeople) {
    voicePeerId = null;
    refreshPeopleVoice();
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  unlockMedia();
  loginError.hidden = true;
  loginError.textContent = '';
  loginBtn.disabled = true;
  const payload = {
    name: roomNameInput.value,
    password: passwordInput.value,
    username: usernameInput.value,
  };
  try {
    const path = homeMode === 'create' ? '/api/rooms' : '/api/rooms/join';
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      loginError.textContent = await readError(res, 'Could not enter the room.');
      loginError.hidden = false;
      return;
    }
    const info = await res.json();
    if (info.permanent) cachePermanentRoom(payload.name.trim(), payload.password);
    usernameInput.value = '';
    await enterRoom(info);
  } catch {
    loginError.textContent = 'Could not reach the server.';
    loginError.hidden = false;
  } finally {
    loginBtn.disabled = false;
  }
});

document.addEventListener('click', () => {
  if (!mediaUnlocked) unlockMedia();
}, true);

paneYou.addEventListener('click', (event) => onPaneClick(event, paneYou));

shareBtn.addEventListener('click', () => {
  if (localStream) stopShare();
  else startShare();
});

changeBtn.addEventListener('click', () => {
  changeScreen();
});

cameraBtn.addEventListener('click', () => {
  if (cameraStream) stopCamera();
  else startCamera();
});

floatBtn.addEventListener('click', () => {
  if (floatWin && !floatWin.closed) closeFloatWindow();
  else openFloatWindow();
});

leaveBtn.addEventListener('click', () => {
  leaveRoom();
});

camFeature.addEventListener('click', (event) => {
  event.stopPropagation();
  const pane = getFeaturedPane();
  if (!pane || !isLive(pane)) {
    unfeatureCamera();
    return;
  }
  toggleFullscreen(pane);
});

window.addEventListener('message', (event) => {
  if (event.origin !== location.origin) return;
  if (event.data && event.data.type === 'float-ready') syncFloatWindow();
});

document.addEventListener('fullscreenchange', () => {
  placeCamChrome();
});
document.addEventListener('webkitfullscreenchange', () => {
  placeCamChrome();
});

if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
  navigator.mediaDevices.addEventListener('devicechange', () => {
    fillMicDevices().catch(() => {});
  });
}

async function boot() {
  setHomeMode('join');
  prefillJoinForm();
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (res.ok) {
      const info = await res.json();
      await enterRoom(info);
      return;
    }
  } catch {
    // Stay on home.
  }
  showView('login');
}

boot();
