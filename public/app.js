const loginView = document.getElementById('login');
const roomView = document.getElementById('room');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const stage = document.querySelector('.stage');
const pipRail = document.getElementById('pip-rail');
const localVideo = document.getElementById('local-video');
const paneYou = document.getElementById('pane-you');
const shareBtn = document.getElementById('share-btn');
const changeBtn = document.getElementById('change-btn');
const cameraBtn = document.getElementById('camera-btn');
const floatBtn = document.getElementById('float-btn');
const peerStatus = document.getElementById('peer-status');
const roomError = document.getElementById('room-error');
const picker = document.getElementById('picker');
const pickerTitle = document.getElementById('picker-title');
const pickerGrid = document.getElementById('picker-grid');
const pickerCancel = document.getElementById('picker-cancel');
const qualityRow = document.getElementById('quality-row');
const pickerContinue = document.getElementById('picker-continue');
const cameraPreview = document.getElementById('camera-preview');
const camFeature = document.getElementById('cam-feature');
const camStack = document.getElementById('cam-stack');
const desktop = window.screenshareDesktop;

const QUALITY_PRESETS = {
  '720p30': { id: '720p30', label: '720p 30', width: 1280, height: 720, fps: 30, maxBitrate: 6_000_000 },
  '1080p30': { id: '1080p30', label: '1080p 30', width: 1920, height: 1080, fps: 30, maxBitrate: 6_000_000 },
  '720p60': { id: '720p60', label: '720p 60', width: 1280, height: 720, fps: 60, maxBitrate: 6_000_000 },
};

let shareQuality = '1080p30';
let replacingShare = false;

const DEFAULT_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

let iceServers = DEFAULT_ICE;
let events = null;
let myId = null;
let featured = 'you';
let featuredView = { kind: 'pane' };
let localStream = null;
let cameraStream = null;
let cameraPreviewStream = null;
let floatWin = null;
let floatPoll = null;
let mediaUnlocked = false;
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
  return `Peer ${String(id).slice(0, 4)}`;
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
  if (featured !== 'you' && peers.has(featured) && !isLive(peers.get(featured).pane) && isLive(paneYou)) {
    featured = 'you';
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
  const count = peers.size;
  if (!count) {
    peerStatus.textContent = 'Waiting';
    peerStatus.dataset.state = 'waiting';
    return;
  }
  peerStatus.textContent = count === 1 ? '1 connected' : `${count} connected`;
  peerStatus.dataset.state = 'connected';
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
  if (event.target.closest('button')) return;
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

function sendSignal(to, data) {
  fetch('/api/signal', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'signal', to, data }),
  }).catch(() => {
    showRoomError('Could not send signaling data.');
  });
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

const VIDEO_CODEC_PREF = ['video/av1', 'video/vp9', 'video/h264'];

function preferVideoCodecs(pc) {
  if (!pc || typeof RTCRtpSender.getCapabilities !== 'function') return;
  const caps = RTCRtpSender.getCapabilities('video');
  if (!caps || !caps.codecs.length) return;
  const rank = (mime) => {
    const index = VIDEO_CODEC_PREF.indexOf(String(mime).toLowerCase());
    return index === -1 ? VIDEO_CODEC_PREF.length : index;
  };
  const ordered = [...caps.codecs].sort((a, b) => rank(a.mimeType) - rank(b.mimeType));
  for (const transceiver of pc.getTransceivers()) {
    const kind = transceiver.receiver.track.kind || transceiver.sender.track?.kind;
    if (kind !== 'video') continue;
    try {
      transceiver.setCodecPreferences(ordered);
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
      params.degradationPreference = 'maintain-resolution';
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
      if (sender === peer.cameraSender) return false;
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

async function attachLocalStream(stream) {
  localStream = stream;
  localVideo.srcObject = stream;
  setLocalSharing(true);
  for (const track of stream.getAudioTracks()) attachDisplayAudio(track);
  for (const track of stream.getVideoTracks()) applyCaptureHint(track);
  const videoPcs = [];
  const publishJobs = [];
  for (const track of stream.getTracks()) {
    track.addEventListener('ended', () => {
      if (localStream === stream) {
        if (track.kind === 'audio') {
          if (!replacingShare) {
            showRoomError('Share audio stopped. Start again and enable audio in the picker.');
          }
          return;
        }
        stopShare();
      }
    });
    for (const peer of peers.values()) {
      publishJobs.push(publishLocalTrack(peer.pc, track, stream));
      if (track.kind === 'video') videoPcs.push(peer.pc);
    }
  }
  await Promise.all(publishJobs);
  await Promise.all([...new Set(videoPcs)].map((pc) => applyVideoQuality(pc)));
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
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: videoCaptureConstraints(),
      audio,
      systemAudio: 'include',
    });
  } catch (err) {
    if (err && (err.name === 'OverconstrainedError' || err.name === 'TypeError')) {
      return navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        systemAudio: 'include',
      });
    }
    throw err;
  }
}

function hidePicker() {
  picker.hidden = true;
  pickerGrid.replaceChildren();
  pickerGrid.hidden = false;
  pickerContinue.hidden = true;
  pickerContinue.textContent = 'Continue';
  qualityRow.hidden = false;
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

function pickDesktopSource() {
  return new Promise(async (resolve) => {
    openPicker();
    pickerGrid.replaceChildren();
    pickerGrid.hidden = false;
    pickerContinue.hidden = true;
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
    for (const source of sources) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'picker-item';
      const img = document.createElement('img');
      img.alt = '';
      img.src = source.thumbnail;
      const label = document.createElement('span');
      label.textContent = source.kind === 'screen' ? `Screen · ${source.name}` : source.name;
      button.append(img, label);
      button.addEventListener('click', () => finish(source));
      pickerGrid.append(button);
    }
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

function stopDesktopEnergyWatch() {
  if (desktopAudio.energyTimer) {
    clearTimeout(desktopAudio.energyTimer);
    desktopAudio.energyTimer = null;
  }
}

function startDesktopEnergyWatch() {
  stopDesktopEnergyWatch();
  let samples = 0;
  let sumSq = 0;
  desktopAudio.energyTimer = setTimeout(() => {
    desktopAudio.energyTimer = null;
    const rms = samples ? Math.sqrt(sumSq / samples) : 0;
    if (rms < 0.0005) {
      showRoomError('No audio captured. Play sound in the selected window, or share the whole screen.');
    }
  }, 1000);
  return (floats) => {
    for (let i = 0; i < floats.length; i++) sumSq += floats[i] * floats[i];
    samples += floats.length;
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

function stopShare() {
  stopDesktopAudio();
  hidePicker();
  if (localStream) {
    for (const track of localStream.getTracks()) track.stop();
    localStream = null;
  }
  localVideo.srcObject = null;
  setLocalSharing(false);
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
  return peer.stream ? peer.stream.getTracks().filter((track) => track.readyState === 'live') : [];
}

function livePaneTracks(peer) {
  return liveRemoteTracks(peer);
}

function shouldTreatAsCamera(peer, mid, track) {
  if (!track || track.kind !== 'video') return false;
  if (mid && peer.cameraMids.has(mid)) return true;
  const paneVideos = peer.stream
    ? peer.stream.getVideoTracks().filter((item) => item.readyState === 'live' && item !== track)
    : [];
  const camLive = [...peer.cameraTracks.values()].filter((item) => item.readyState === 'live').length;
  return peer.cameraMids.size > 0 && paneVideos.length + camLive === 0;
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
    peer.video.srcObject = null;
    peer.unmute.hidden = true;
  }
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

function handleSourceSignal(peer, data) {
  const mid = data.mid != null ? String(data.mid) : '';
  if (!mid) return;
  if (data.on) peer.cameraMids.add(mid);
  else peer.cameraMids.delete(mid);

  if (!data.on) {
    peer.cameraTracks.delete(mid);
    if (featuredView.kind === 'camera' && featuredView.peerId === peer.id && featuredView.mid === mid) {
      featuredView = { kind: 'pane' };
    }
    refreshRemoteMedia();
    return;
  }

  let found = peer.pendingVideos.get(mid) || null;
  if (found) peer.pendingVideos.delete(mid);
  if (!found) {
    for (const [track, trackMid] of peer.trackMids) {
      if (trackMid === mid && track.kind === 'video' && track.readyState === 'live') {
        found = track;
        break;
      }
    }
  }
  if (!found && peer.stream) {
    const only = peer.stream.getVideoTracks().filter((track) => track.readyState === 'live');
    if (only.length === 1) found = only[0];
  }
  if (found) addRemoteCamera(peer, mid, found);
  promotePendingScreen(peer);
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

function syncFloatWindow() {
  const doc = floatDoc();
  if (!doc) return false;
  const strip = doc.getElementById('cams');
  const empty = doc.getElementById('empty');
  if (!strip || !empty) return false;
  const cams = collectRemoteCameras();
  strip.replaceChildren();
  empty.hidden = cams.length > 0;
  for (const cam of cams) {
    const video = doc.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = new MediaStream([cam.track]);
    video.play().catch(() => {});
    strip.append(video);
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
  const onReady = () => syncFloatWindow();
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
    syncFloatWindow();
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

function bindRemoteVideo(peer) {
  const live = liveRemoteTracks(peer);
  peer.video.autoplay = true;
  peer.video.playsInline = true;
  peer.video.volume = 1;
  peer.video.srcObject = live.length ? new MediaStream(live) : null;
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
  for (const peer of peers.values()) {
    if (peer.stream) playRemote(peer);
  }
}

function watchRemoteTrack(peer, track) {
  const refresh = () => {
    if (peer.stream && track.readyState === 'ended') peer.stream.removeTrack(track);
    const live = livePaneTracks(peer);
    setPaneLive(peer.pane, live.length > 0, live.length ? 'Live' : 'Idle');
    if (!live.length) {
      peer.video.srcObject = null;
      peer.unmute.hidden = true;
      if (featuredView.kind === 'camera') refreshRemoteMedia();
      return;
    }
    bindRemoteVideo(peer);
    if (featuredView.kind === 'camera') refreshRemoteMedia();
  };
  track.addEventListener('ended', refresh);
  track.addEventListener('unmute', () => {
    track.enabled = true;
    bindRemoteVideo(peer);
    setPaneLive(peer.pane, true, 'Live');
    playRemote(peer);
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
      <span class="pane-name">${peerLabel(id)}</span>
      <span class="tally" aria-hidden="true"></span>
      <span class="pane-state">Idle</span>
    </header>
    <video autoplay playsinline muted></video>
    <p class="pane-empty">Not sharing</p>
    <button class="unmute" hidden type="button">Click to hear them</button>
  `;
  const video = pane.querySelector('video');
  const unmute = pane.querySelector('.unmute');
  pane.addEventListener('click', (event) => onPaneClick(event, pane));
  pipRail.append(pane);
  return { pane, video, unmute };
}

function resetPeer(id, polite) {
  removePeer(id);
  return ensurePeer(id, polite);
}

function ensurePeer(id, polite) {
  if (peers.has(id)) return peers.get(id);
  const { pane, video, unmute } = createRemotePane(id);
  const state = {
    id,
    polite,
    pane,
    video,
    unmute,
    pc: null,
    stream: null,
    makingOffer: false,
    ignoreOffer: false,
    isSettingRemoteAnswerPending: false,
    screenSenders: { video: null, audio: null },
    cameraSender: null,
    cameraMids: new Set(),
    cameraTracks: new Map(),
    pendingVideos: new Map(),
    trackMids: new Map(),
  };
  const pc = new RTCPeerConnection({ iceServers });
  state.pc = pc;

  pc.onicecandidate = ({ candidate }) => {
    sendSignal(id, { type: 'ice', candidate });
  };

  pc.ontrack = ({ track, transceiver }) => {
    track.enabled = true;
    const mid = transceiver && transceiver.mid != null ? String(transceiver.mid) : '';
    if (mid) state.trackMids.set(track, mid);
    if (track.kind === 'audio') attachDisplayAudio(track);
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
    if (livePaneTracks(state).length && featured === 'you' && !isLive(paneYou)) {
      featured = id;
    }
    setPaneLive(pane, true, 'Live');
    watchRemoteTrack(state, track);
    playRemote(state);
  };

  pc.onnegotiationneeded = async () => {
    try {
      state.makingOffer = true;
      preferVideoCodecs(pc);
      await pc.setLocalDescription();
      sendSignal(id, { type: 'sdp', description: pc.localDescription });
      if (cameraTrack()) signalCameraToPeer(state, true);
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

  if (localStream) {
    let hasVideo = false;
    for (const track of localStream.getTracks()) {
      publishLocalTrack(pc, track, localStream);
      if (track.kind === 'video') hasVideo = true;
    }
    preferVideoCodecs(pc);
    if (hasVideo) applyVideoQuality(pc);
  }
  if (cameraTrack()) publishCameraToPeer(state);
  setPeerStatus();
  applyLayout();
  return state;
}

function removePeer(id) {
  const peer = peers.get(id);
  if (!peer) return;
  peer.pc.onicecandidate = null;
  peer.pc.ontrack = null;
  peer.pc.onnegotiationneeded = null;
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
  const peer = ensurePeer(from, true);
  const { pc } = peer;
  if (data.type === 'source') {
    handleSourceSignal(peer, data);
    return;
  }
  if (data.type === 'ice') {
    try {
      await pc.addIceCandidate(data.candidate);
    } catch (err) {
      if (!peer.ignoreOffer) console.error(err);
    }
    return;
  }
  if (!data.description) return;

  const description = data.description;
  const readyForOffer =
    !peer.makingOffer && (pc.signalingState === 'stable' || peer.isSettingRemoteAnswerPending);
  const offerCollision = description.type === 'offer' && !readyForOffer;
  peer.ignoreOffer = !peer.polite && offerCollision;
  if (peer.ignoreOffer) return;

  peer.isSettingRemoteAnswerPending = description.type === 'answer';
  await pc.setRemoteDescription(description);
  peer.isSettingRemoteAnswerPending = false;
  preferVideoCodecs(pc);

  if (description.type === 'offer') {
    await pc.setLocalDescription();
    sendSignal(from, { type: 'sdp', description: pc.localDescription });
    if (cameraTrack()) signalCameraToPeer(peer, true);
  } else if (cameraTrack()) {
    signalCameraToPeer(peer, true);
  }
}

async function handleRoomMessage(msg) {
  if (msg.type === 'hello') {
    myId = msg.id;
    closeAllPeers();
    for (const id of msg.peers || []) {
      ensurePeer(id, true);
    }
    setPeerStatus();
    refreshRemoteMedia();
    return;
  }

  if (msg.type === 'peer-joined') {
    if (msg.id && msg.id !== myId) resetPeer(msg.id, false);
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
  if (events) events.close();
  events = new EventSource('/api/stream');
  let opened = false;

  events.addEventListener('open', () => {
    opened = true;
    showRoomError('');
  });

  events.addEventListener('message', async (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    await handleRoomMessage(msg);
  });

  events.addEventListener('error', () => {
    if (events && events.readyState === EventSource.CONNECTING && opened) {
      return;
    }
    if (events && events.readyState === EventSource.CLOSED) {
      closeAllPeers();
      setPeerStatus();
      showRoomError('Disconnected from the room.');
    }
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
  floatBtn.hidden = !desktop;
  setLocalSharing(Boolean(localStream));
  setCameraLive(Boolean(cameraTrack()));
  setPeerStatus();
  applyLayout();
  refreshRemoteMedia();
  await connectSocket();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  unlockMedia();
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
