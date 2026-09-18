import { t, applyI18n, setLang, getLang, initLang } from './i18n.js';
import { state, hooks } from './js/state.js';
import * as api from './js/api.js';
import * as homeMod from './js/home.js';
import * as accountMod from './js/account.js';
import * as pinsMod from './js/pins.js';
import * as channelsMod from './js/channels.js';
import * as chatMod from './js/chat.js';
import * as webrtcMod from './js/webrtc.js';
import * as requestsMod from './js/requests.js';

const loginView = document.getElementById('login');
const roomView = document.getElementById('room');
const loginForm = document.getElementById('login-form');
const roomNameInput = document.getElementById('room-name');
const usernameInput = document.getElementById('username');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const homeBack = document.getElementById('home-back');
const homeRoomBack = document.getElementById('home-room-back');
const homeRoomHeading = document.getElementById('home-room-heading');
const home = document.querySelector('.home');
const homeStepKind = document.getElementById('home-step-kind');
const homeStepRoom = document.getElementById('home-step-room');
const homeStepUser = document.getElementById('home-step-user');
const homeKindScreenshare = document.getElementById('home-kind-screenshare');
const homeKindWatchparty = document.getElementById('home-kind-watchparty');
const createTtlWarn = document.getElementById('create-ttl-warn');
const permanentField = document.getElementById('permanent-field');
const modeTemporary = document.getElementById('mode-temporary');
const modePermanent = document.getElementById('mode-permanent');
const modeGuest = document.getElementById('mode-guest');
const modeLogin = document.getElementById('mode-login');
const modeRegister = document.getElementById('mode-register');
const accountForm = document.getElementById('account-form');
const accountPassword = document.getElementById('account-password');
const accountUsername = document.getElementById('account-username');
const accountSubmit = document.getElementById('account-submit');
const accountTtlWarn = document.getElementById('account-ttl-warn');
const turnstileWrap = document.getElementById('turnstile-wrap');
const turnstileHost = document.getElementById('turnstile-host');
const pinRail = document.getElementById('pin-rail');
const pinList = document.getElementById('pin-list');
const pinTip = document.getElementById('pin-tip');
const pinTipName = document.getElementById('pin-tip-name');
const pinTipUnpin = document.getElementById('pin-tip-unpin');
const pinTipPin = document.getElementById('pin-tip-pin');
const pinAddBtn = document.getElementById('pin-add-btn');
const pinUser = document.getElementById('pin-user');
const roomModal = document.getElementById('room-modal');
const roomModalForm = document.getElementById('room-modal-form');
const roomModalClose = document.getElementById('room-modal-close');
const modalModeJoin = document.getElementById('modal-mode-join');
const modalModeCreate = document.getElementById('modal-mode-create');
const modalRoomName = document.getElementById('modal-room-name');
const modalCreateTtl = document.getElementById('modal-create-ttl');
const modalPermanentField = document.getElementById('modal-permanent-field');
const modalModeTemporary = document.getElementById('modal-mode-temporary');
const modalModePermanent = document.getElementById('modal-mode-permanent');
const modalStepKind = document.getElementById('modal-step-kind');
const modalStepRoom = document.getElementById('modal-step-room');
const modalStepUser = document.getElementById('modal-step-user');
const modalKindScreenshare = document.getElementById('modal-kind-screenshare');
const modalKindWatchparty = document.getElementById('modal-kind-watchparty');
const modalUsername = document.getElementById('modal-username');
const modalBack = document.getElementById('modal-back');
const modalRoomSubmit = document.getElementById('modal-room-submit');
const modalRoomError = document.getElementById('modal-room-error');
const watchBtn = document.getElementById('watch-btn');
const watchSheet = document.getElementById('watch-sheet');
const watchSheetClose = document.getElementById('watch-sheet-close');
const watchForm = document.getElementById('watch-form');
const watchUrlInput = document.getElementById('watch-url');
const watchStartBtn = document.getElementById('watch-start');
const watchStopBtn = document.getElementById('watch-stop');
const watchError = document.getElementById('watch-error');
const paneWatch = document.getElementById('pane-watch');
const watchStage = document.getElementById('watch-stage');
const watchControls = document.getElementById('watch-controls');
const watchTransport = document.getElementById('watch-transport');
const watchPlayBtn = document.getElementById('watch-play');
const watchSeek = document.getElementById('watch-seek');
const watchTime = document.getElementById('watch-time');
const watchMuteBtn = document.getElementById('watch-mute');
const watchVolume = document.getElementById('watch-volume');
const watchFsBtn = document.getElementById('watch-fs');
const watchTitle = document.getElementById('watch-title');
const watchStateLabel = document.getElementById('watch-state');
const accountAvatarBtn = document.getElementById('account-avatar-btn');
const accountAvatarImg = document.getElementById('account-avatar-img');
const accountAvatarLetter = document.getElementById('account-avatar-letter');
const accountMenu = document.getElementById('account-menu');
const userSettingsBtn = document.getElementById('user-settings-btn');
const userBar = document.getElementById('user-bar');
const userBarName = document.getElementById('user-bar-name');
const userBarAvatarSlot = document.getElementById('user-bar-avatar-slot');
const userBarMenuSlot = document.getElementById('user-bar-menu-slot');
const channelVoiceBtn = document.getElementById('channel-voice');
const channelChatBtn = document.getElementById('channel-chat');
const voiceRoster = document.getElementById('voice-roster');
const voiceIdleGrid = document.getElementById('voice-idle-grid');
const mainChannelTitle = document.getElementById('main-channel-title');
const membersToggle = document.getElementById('members-toggle');
const channelsToggle = document.getElementById('channels-toggle');
const roomScrim = document.getElementById('room-scrim');
const mainPaneChat = document.getElementById('main-pane-chat');
const mainPaneVoice = document.getElementById('main-pane-voice');
const chatPane = document.getElementById('chat-pane');
const sidePanel = document.getElementById('side-panel');
const voiceChatPanel = document.getElementById('voice-chat-panel');
const voiceActionBar = document.querySelector('.voice-action-bar');
const accountUploadBtn = document.getElementById('account-upload-btn');
const accountLogoutBtn = document.getElementById('account-logout-btn');
const accountDeleteBtn = document.getElementById('account-delete-btn');
const roomIconBtn = document.getElementById('room-icon-btn');
const roomIconImg = document.getElementById('room-icon-img');
const cropper = document.getElementById('cropper');
const cropperImage = document.getElementById('cropper-image');
const cropperStage = document.getElementById('cropper-stage');
const cropperZoom = document.getElementById('cropper-zoom');
const cropperCancel = document.getElementById('cropper-cancel');
const cropperConfirm = document.getElementById('cropper-confirm');
const imageFile = document.getElementById('image-file');
const langEn = document.getElementById('lang-en');
const langPt = document.getElementById('lang-pt');
const roomLabel = document.getElementById('room-label');
const modeJoin = document.getElementById('mode-join');
const modeCreate = document.getElementById('mode-create');
const stage = document.querySelector('.stage');
const pipRail = document.getElementById('pip-rail');
const localVideo = document.getElementById('local-video');
const paneYou = document.getElementById('pane-you');
const youName = document.getElementById('you-name');
const shareBtn = document.getElementById('share-btn');
const chatBtn = document.getElementById('chat-btn');
const chatLog = document.getElementById('chat-log');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const changeBtn = document.getElementById('change-btn');
const cameraBtn = document.getElementById('camera-btn');
const floatBtn = document.getElementById('float-btn');
const leaveBtn = document.getElementById('leave-btn');
const peerCount = document.getElementById('peer-count');
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
const GUEST_PINS_KEY = 'screenshare.guestPins';
const MIC_CACHE_KEY = 'screenshare.mic';
const MAX_VOICE = 5;
const MIC_BITRATE = 64_000;
const VAD_HANG_MS = 160;
const PERSON_MIC_SVG = '<svg class="hi icon-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.1572 4.1572C8.94761 2.86349 10.373 2 12 2C14.4853 2 16.5 4.01472 16.5 6.5V11.5C16.5 11.8111 16.4684 12.1149 16.4083 12.4083M7.5 7.5V11.5C7.5 13.9853 9.51472 16 12 16C13.1154 16 14.136 15.5942 14.9222 14.9222"/><path d="M2 2L22 22"/><path d="M12 19H11.5828C8.07267 19 5.07706 16.4623 4.5 13M12 19H12.4172C14.2325 19 15.9102 18.3213 17.1869 17.1869M12 19V22M19.5 13C19.3878 13.6733 19.1841 14.3116 18.903 14.903"/></svg><svg class="hi icon-on" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6.5C7 4.01472 9.01472 2 11.5 2C13.9853 2 16 4.01472 16 6.5V11.5C16 13.9853 13.9853 16 11.5 16C9.01472 16 7 13.9853 7 11.5V6.5Z"/><path d="M11.5 19H11.0828C7.57267 19 4.57706 16.4623 4 13M11.5 19H11.9172C15.4273 19 18.4229 16.4623 19 13M11.5 19V22"/></svg>';
const DELETE_SVG = '<svg class="hi" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5"/><path d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.8981 2.28601 9.80498 2.3459 9.71729 2.41317C9.32164 2.7167 9.10063 3.20155 8.65861 4.17126L8.05292 5.5"/><path d="M9.5 16.5L9.5 10.5"/><path d="M14.5 16.5L14.5 10.5"/></svg>';
const PANE_PIP_SVG = '<svg class="hi" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.99219 19.965C5.11989 19.8873 3.97194 19.6366 3.16376 18.8284C1.99219 17.6569 1.99219 15.7712 1.99219 12C1.99219 8.22876 1.99219 6.34315 3.16376 5.17157C4.33534 4 6.22095 4 9.99219 4H13.9922C17.7634 4 19.6491 4 20.8206 5.17157C21.4738 5.82475 21.7628 6.69989 21.8907 8"/><path d="M19.9297 12H13.0547C11.9156 12 10.9922 12.8954 10.9922 14V18C10.9922 19.1046 11.9156 20 13.0547 20H19.9297C21.0688 20 21.9922 19.1046 21.9922 18V14C21.9922 12.8954 21.0688 12 19.9297 12Z"/></svg>';
const PANE_RELOAD_SVG = '<svg class="hi" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 7.99976H18C19.4142 7.99976 20.1213 7.99976 20.5607 7.56042C21 7.12108 21 6.41397 21 4.99976V3.49976"/><path d="M3 11.9998C3 7.02919 7.0293 2.99976 12 2.99976C15.571 2.99976 18.0948 4.73029 20 7.08347M21 11.9998C21 16.9703 16.9707 20.9998 12 20.9998C8.42904 20.9998 5.90524 19.2692 4 16.916"/><path d="M7.5 15.9998H6C4.58579 15.9998 3.87868 15.9998 3.43934 16.4391C3 16.8784 3 17.5855 3 18.9998V20.4998"/></svg>';

let iceServers = DEFAULT_ICE;
let events = null;
let reconnectTimer = null;
let socketGen = 0;
let roomQueue = Promise.resolve();
let myId = null;
let myName = '';
let homeMode = 'join';
let homePermanent = false;
let modalPermanentOn = false;
let homeStep = 'room';
let homeKind = 'screenshare';
let modalStep = 'room';
let modalKind = 'screenshare';
let pendingHome = { name: '', inviteCode: '', visibility: 'public', kind: 'screenshare' };
let pendingModal = { name: '', inviteCode: '', visibility: 'public', kind: 'screenshare' };
let currentRoomLabel = '';
let currentInviteCode = '';
let currentRoomId = '';
let roomKind = 'screenshare';
let watchState = null;
let watchPlayer = null;
let watchTickTimer = 0;
let watchApplying = false;
let watchRenderSeq = 0;
let watchVolumeValue = 1;
let watchVolumeRestore = 1;
let canManageWatch = false;
let copyRoomTimer = null;
let iAmCreator = false;
let canEditIcon = false;
let currentNameKey = '';
let currentIconUrl = '';
let accountUser = null;
let accountPins = [];
let guestPins = [];
let homeAuth = 'guest';
let turnstileSiteKey = '';
let turnstileWidgetId = null;
let cropJob = null;
const IMAGE_MAX_PX = 2000;
let pinTipTimer = 0;
let pinTipKey = '';
let modalRoomMode = 'join';
let leavingRoom = false;
let chatSocket = null;
let watchSocket = null;
let chatOpen = false;
let chatStickBottom = true;
let activeChannel = 'chat';
let inVoiceChannel = false;
let leavingVoice = false;
let voiceLeaveAt = 0;
let membersOpen = true;
const MOBILE_ROOM_MQ = '(max-width: 52rem)';
let mobilePane = 'main';
let voiceJoinPromise = null;
let voicePeerId = null;
let micSettings = { deviceId: '', gain: 1, threshold: 0.04 };
const roomMembers = new Map();
const voicePeerIds = new Set();
let featured = 'you';
let featuredView = { kind: 'pane' };
let localStream = null;
let cameraStream = null;
let cameraPreviewStream = null;
let selfCamApp = true;
let selfCamFloat = true;
let floatWin = null;
let floatPoll = null;
let mediaUnlocked = Boolean(desktop);
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
let micStartPromise = null;
let micDenied = false;
let voiceCtx = null;
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
  if (view !== 'room') mobilePane = 'main';
  if (roomView) roomView.dataset.mobilePane = mobilePane;
  placeAccountChrome(view === 'room');
  syncMobileChrome();
}

function placeAccountChrome(inRoom) {
  if (!accountAvatarBtn || !accountMenu) return;
  if (inRoom && userBarAvatarSlot && userBarMenuSlot) {
    userBarAvatarSlot.append(accountAvatarBtn);
    userBarMenuSlot.append(accountMenu);
  } else if (pinUser) {
    pinUser.append(accountAvatarBtn, accountMenu);
  }
}

function peerLabel(id) {
  const member = roomMembers.get(id);
  if (member && member.name) return member.name;
  const peer = peers.get(id);
  if (peer && peer.name) return peer.name;
  return `Peer ${String(id).slice(0, 4)}`;
}

function setYouName(name) {
  myName = name || '';
  if (youName) youName.textContent = myName || t('you');
  if (userBarName) userBarName.textContent = (accountUser && accountUser.username) || myName || t('you');
}

function syncLangButtons() {
  const current = getLang();
  if (langEn) langEn.setAttribute('aria-pressed', current === 'en' ? 'true' : 'false');
  if (langPt) langPt.setAttribute('aria-pressed', current === 'pt' ? 'true' : 'false');
}

function setHomeKind(kind) {
  homeKind = kind === 'watchparty' ? 'watchparty' : 'screenshare';
  if (homeKindScreenshare) homeKindScreenshare.setAttribute('aria-selected', homeKind === 'screenshare' ? 'true' : 'false');
  if (homeKindWatchparty) homeKindWatchparty.setAttribute('aria-selected', homeKind === 'watchparty' ? 'true' : 'false');
}

function setHomeStep(step) {
  homeStep = step === 'user' || step === 'kind' ? step : 'room';
  if (home) home.dataset.step = homeStep;
  if (homeStepKind) homeStepKind.hidden = homeStep !== 'kind';
  if (homeStepRoom) homeStepRoom.hidden = homeStep !== 'room';
  if (homeStepUser) homeStepUser.hidden = homeStep !== 'user';
  if (homeRoomHeading) {
    homeRoomHeading.textContent = homeStep === 'user' ? (pendingHome.name || roomNameInput.value.trim()) : '';
  }
  roomNameInput.required = homeStep === 'room';
  usernameInput.required = homeStep === 'user' && !accountUser;
  loginBtn.textContent = homeStep === 'user' ? t('enter') : t('continue');
  if (!loginView.hidden) {
    if (homeStep === 'user') usernameInput.focus();
    else if (homeStep === 'room') roomNameInput.focus();
  }
}

function setHomePermanent(_on) {
  homePermanent = false;
}

function setHomeMode(mode) {
  homeMode = mode === 'create' ? 'create' : 'join';
  modeJoin.setAttribute('aria-selected', homeMode === 'join' ? 'true' : 'false');
  modeCreate.setAttribute('aria-selected', homeMode === 'create' ? 'true' : 'false');
  if (createTtlWarn) createTtlWarn.hidden = true;
  if (permanentField) permanentField.hidden = true;
  if (homeStep === 'room' || homeStep === 'kind') loginBtn.textContent = t('continue');
  homeMod.syncVisibilityFields(homeMode, modalRoomMode);
  if (homeRoomBack) homeRoomBack.hidden = homeMode !== 'create' || homeStep !== 'room';
}

function letterFor(name) {
  const raw = String(name || '').replace(/^@/, '').trim();
  return (raw[0] || '?').toUpperCase();
}

function upsertRoomMember(item) {
  if (!item || !item.id) return null;
  const prev = roomMembers.get(item.id) || {};
  const next = {
    id: item.id,
    name: item.name || prev.name || '',
    userId: item.userId || prev.userId || null,
    avatarUrl: item.avatarUrl || prev.avatarUrl || '',
    inVoice: Boolean(item.inVoice),
    voiceChannelId: item.voiceChannelId || prev.voiceChannelId || null,
  };
  roomMembers.set(next.id, next);
  if (next.inVoice) voicePeerIds.add(next.id);
  else voicePeerIds.delete(next.id);
  return next;
}

function memberAccountKey(member) {
  if (member && member.userId) return `u:${member.userId}`;
  if (member && member.id) return `p:${member.id}`;
  return '';
}

function isSelfSession(member) {
  if (!member) return false;
  if (myId && member.id === myId) return true;
  const myUserId = accountUser && accountUser.id;
  return Boolean(myUserId && member.userId && String(member.userId) === String(myUserId));
}

function preferDisplayMember(a, b) {
  const score = (member) => {
    let n = 0;
    if (peerIsLive(peers.get(member.id), member)) n += 2;
    if (member.inVoice) n += 1;
    return n;
  };
  return score(b) > score(a) ? b : a;
}

function uniquePeople(members, { skipSelf = true, voiceChannelId = null } = {}) {
  const seen = new Map();
  for (const member of members) {
    if (!member || !member.id) continue;
    if (skipSelf && isSelfSession(member)) continue;
    if (voiceChannelId != null && String(member.voiceChannelId || '') !== String(voiceChannelId)) continue;
    const key = memberAccountKey(member);
    if (!key) continue;
    const prev = seen.get(key);
    seen.set(key, prev ? preferDisplayMember(prev, member) : member);
  }
  return [...seen.values()];
}

function sessionsForPerson(id) {
  const member = roomMembers.get(id);
  if (!member) return id ? [id] : [];
  if (!member.userId) return [member.id];
  return [...roomMembers.values()]
    .filter((row) => row.userId && String(row.userId) === String(member.userId))
    .map((row) => row.id);
}

function selfIsLive() {
  if (localStream) return true;
  if (cameraTrack()) return true;
  if (watchActive() && iAmWatchHost()) return true;
  return false;
}

function peerIsLive(peer, member) {
  if (watchActive() && watchState && member && watchState.hostPeerId === member.id) return true;
  if (!peer) return false;
  if (peer.screenOn) return true;
  if (peer.pane && isLive(peer.pane)) return true;
  if (peer.cameraTracks && peer.cameraTracks.size) return true;
  if (watchActive() && watchState && watchState.hostPeerId === peer.id) return true;
  return false;
}

function hasLiveStreams() {
  if (watchActive()) return true;
  if (paneYou && !paneYou.hidden && isLive(paneYou)) return true;
  if (cameraTrack()) return true;
  for (const peer of peers.values()) {
    if (peer.pane && isLive(peer.pane)) return true;
    if (peer.cameraTracks && peer.cameraTracks.size) return true;
  }
  return false;
}

function placeChatPane() {
  if (!chatPane) return;
  if (activeChannel === 'voice' && chatOpen && voiceChatPanel) {
    voiceChatPanel.append(chatPane);
  } else if (mainPaneChat) {
    mainPaneChat.append(chatPane);
  }
}

function applySidePanel() {
  if (!roomView) return;
  const voice = Boolean(state.activeChannel && state.activeChannel.type === 'voice');
  activeChannel = voice ? 'voice' : 'chat';
  const live = hasLiveStreams();
  roomView.dataset.channel = activeChannel;
  roomView.dataset.voice = inVoiceChannel ? 'joined' : 'idle';
  roomView.dataset.streams = live ? 'live' : 'idle';
  if (voice && chatOpen) roomView.dataset.sideChat = 'open';
  else delete roomView.dataset.sideChat;

  if (mainPaneChat) mainPaneChat.hidden = voice;
  if (mainPaneVoice) mainPaneVoice.hidden = !voice;
  if (voiceActionBar) voiceActionBar.hidden = !voice;

  if (sidePanel) {
    if (voice) {
      if (mobilePane === 'members') {
        mobilePane = 'main';
        if (roomView) roomView.dataset.mobilePane = 'main';
      }
      sidePanel.hidden = !chatOpen;
      sidePanel.dataset.mode = chatOpen ? 'chat' : '';
      sidePanel.dataset.collapsed = chatOpen ? 'false' : 'true';
    } else if (isMobileRoom()) {
      sidePanel.hidden = false;
      sidePanel.dataset.mode = 'members';
      sidePanel.dataset.collapsed = mobilePane === 'members' ? 'false' : 'true';
    } else {
      sidePanel.hidden = !membersOpen;
      sidePanel.dataset.mode = 'members';
      sidePanel.dataset.collapsed = membersOpen ? 'false' : 'true';
    }
  }
  if (peoplePanel) peoplePanel.hidden = voice;
  if (voiceChatPanel) voiceChatPanel.hidden = !(voice && chatOpen);
  if (membersToggle) membersToggle.hidden = voice;
  syncMobileChrome();
  placeChatPane();
  renderVoiceRoster();
  renderVoiceIdleCards();
}

function setActiveChannel(channel) {
  if (channel && typeof channel === 'object') {
    state.activeChannel = channel;
    activeChannel = channel.type === 'voice' ? 'voice' : 'chat';
  } else {
    activeChannel = channel === 'voice' ? 'voice' : 'chat';
    if (activeChannel === 'text' || activeChannel === 'chat') {
      const text = channelsMod.firstTextChannel();
      if (text) state.activeChannel = { type: 'text', id: text.id };
    }
  }
  channelsMod.renderChannels();
  if (activeChannel === 'chat') chatOpen = false;
  applySidePanel();
  applyLayout();
  if (activeChannel === 'chat') {
    chatStickBottom = true;
    scrollChatIfNeeded();
  }
}

function isMobileRoom() {
  return window.matchMedia(MOBILE_ROOM_MQ).matches;
}

function syncMobileChrome() {
  const narrow = isMobileRoom();
  const inRoom = Boolean(roomView && !roomView.hidden);
  const channelsOpen = mobilePane === 'channels';
  const membersShown = narrow ? mobilePane === 'members' : membersOpen;
  const voiceChat = narrow && activeChannel === 'voice' && chatOpen;
  if (channelsToggle) channelsToggle.setAttribute('aria-expanded', channelsOpen ? 'true' : 'false');
  if (membersToggle) {
    membersToggle.setAttribute('aria-expanded', membersShown ? 'true' : 'false');
    membersToggle.setAttribute('aria-pressed', membersShown ? 'true' : 'false');
  }
  if (roomScrim) roomScrim.hidden = !narrow || !inRoom || (mobilePane === 'main' && !voiceChat);
  const channelColumn = document.getElementById('channel-column');
  if (channelColumn) channelColumn.inert = Boolean(narrow && inRoom && !channelsOpen);
  if (pinRail) pinRail.inert = Boolean(narrow && inRoom && !channelsOpen);
  if (sidePanel) sidePanel.inert = Boolean(narrow && inRoom && !membersShown && !voiceChat);
}

function setMobilePane(pane) {
  const next = pane === 'channels' || pane === 'members' ? pane : 'main';
  mobilePane = next;
  if (roomView) roomView.dataset.mobilePane = next;
  if (isMobileRoom()) membersOpen = next === 'members';
  applySidePanel();
}

function setMembersOpen(open) {
  if (isMobileRoom()) {
    setMobilePane(open ? 'members' : 'main');
    return;
  }
  membersOpen = Boolean(open);
  applySidePanel();
}

function connectVoicePeer(member) {
  if (!inVoiceChannel || !member || !member.id || member.id === myId) return;
  if (!webrtcMod.shouldConnectPeer(member) && !member.inVoice) return;
  if (state.voiceChannelId && member.voiceChannelId && String(member.voiceChannelId) !== String(state.voiceChannelId)) return;
  if (peers.has(member.id)) {
    setPeerName(member.id, member.name, member);
    return;
  }
  ensurePeer(member.id, member.name, member);
  sendSignal(member.id, { type: 'restart' });
}

async function joinVoiceChannel(channelId) {
  const targetId = channelId
    || state.voiceChannelId
    || (state.activeChannel.type === 'voice' && state.activeChannel.id)
    || (state.channels.find((ch) => ch.type === 'voice') || {}).id;
  if (!targetId) return;
  if (inVoiceChannel && String(state.voiceChannelId) === String(targetId)) return;
  if (voiceJoinPromise) return voiceJoinPromise;
  voiceJoinPromise = (async () => {
    try {
      const ok = await channelsMod.joinVoice(targetId);
      if (!ok) return;
    } catch {
      showRoomError(t('could_not_reach'));
    } finally {
      voiceJoinPromise = null;
    }
  })();
  return voiceJoinPromise;
}

async function finishVoiceJoin() {
  inVoiceChannel = true;
  leavingVoice = false;
  if (myId) voicePeerIds.add(myId);
  if (micBtn) micBtn.disabled = false;
  await startMicCapture();
  for (const member of roomMembers.values()) connectVoicePeer(member);
  channelsMod.syncChannelChrome();
  renderVoiceRoster();
  applySidePanel();
  applyRoomChrome();
}

async function leaveVoiceChannel() {
  if (leavingVoice) return;
  if (!inVoiceChannel && !state.voiceChannelId && !voicePeerIds.has(myId)) return;
  leavingVoice = true;
  try {
    await channelsMod.leaveVoice();
  } catch {
    finishVoiceLeave();
  } finally {
    leavingVoice = false;
  }
}

function finishVoiceLeave() {
  inVoiceChannel = false;
  voiceLeaveAt = Date.now();
  if (myId) voicePeerIds.delete(myId);
  if (micBtn) micBtn.disabled = true;
  stopShare();
  stopCamera();
  stopMicCapture();
  closeAllPeers();
  channelsMod.syncChannelChrome();
  renderVoiceRoster();
  renderVoiceIdleCards();
  applySidePanel();
  applyRoomChrome();
}

async function onVoiceChannelClick() {
  if (!inVoiceChannel) await joinVoiceChannel();
  setActiveChannel('voice');
}

function renderVoiceRoster() {
  const roster = document.getElementById('voice-roster');
  if (!roster) return;
  const rows = [];
  const channelId = state.voiceChannelId;
  if (inVoiceChannel && myName && channelId) {
    rows.push({
      id: myId || 'self',
      name: myName,
      self: true,
      avatarUrl: accountUser && accountUser.avatarUrl,
      live: selfIsLive(),
    });
  }
  if (channelId) {
    for (const member of uniquePeople(roomMembers.values(), { voiceChannelId: channelId })) {
      rows.push({
        id: member.id,
        name: member.name || peerLabel(member.id),
        self: false,
        avatarUrl: member.avatarUrl,
        live: peerIsLive(peers.get(member.id), member),
      });
    }
  }
  roster.replaceChildren(
    ...rows.map((item) => {
      const li = document.createElement('li');
      li.className = `voice-roster-user${item.live ? ' is-live' : ''}`;
      const avatar = document.createElement('span');
      avatar.className = 'voice-roster-avatar';
      if (item.avatarUrl) {
        const img = document.createElement('img');
        img.alt = '';
        img.src = item.avatarUrl;
        avatar.append(img);
      } else {
        avatar.textContent = letterFor(item.name);
      }
      const name = document.createElement('span');
      name.className = 'voice-roster-name';
      name.textContent = item.self ? `${item.name} ${t('you_suffix')}` : item.name;
      li.append(avatar, name);
      if (item.live) {
        const dot = document.createElement('span');
        dot.className = 'live-dot';
        dot.title = t('live');
        li.append(dot);
      }
      return li;
    })
  );
}

function renderVoiceIdleCards() {
  if (!voiceIdleGrid) return;
  const idle = activeChannel === 'voice' && inVoiceChannel && !hasLiveStreams();
  voiceIdleGrid.hidden = !idle;
  if (!idle) {
    voiceIdleGrid.replaceChildren();
    return;
  }
  const rows = [];
  if (myName) {
    rows.push({
      name: myName,
      avatarUrl: accountUser && accountUser.avatarUrl,
      live: selfIsLive(),
    });
  }
  for (const member of uniquePeople([...roomMembers.values()].filter((row) => row.inVoice))) {
    rows.push({
      name: member.name || peerLabel(member.id),
      avatarUrl: member.avatarUrl,
      live: peerIsLive(peers.get(member.id), member),
    });
  }
  voiceIdleGrid.replaceChildren(
    ...rows.map((item) => {
      const card = document.createElement('div');
      card.className = `voice-idle-card${item.live ? ' is-live' : ''}`;
      const avatar = document.createElement('span');
      avatar.className = 'voice-idle-card-avatar';
      if (item.avatarUrl) {
        const img = document.createElement('img');
        img.alt = '';
        img.src = item.avatarUrl;
        avatar.append(img);
      } else {
        avatar.textContent = letterFor(item.name);
      }
      const name = document.createElement('span');
      name.className = 'voice-idle-card-name';
      name.textContent = item.name;
      card.append(avatar, name);
      return card;
    })
  );
}

function setHomeAuth(mode) {
  homeAuth = accountUser ? 'guest' : (mode === 'login' || mode === 'register' ? mode : 'guest');
  if (home) home.dataset.auth = homeAuth;
  if (home) home.dataset.signed = accountUser ? 'true' : 'false';
  if (modeGuest) modeGuest.setAttribute('aria-selected', homeAuth === 'guest' ? 'true' : 'false');
  if (modeLogin) modeLogin.setAttribute('aria-selected', homeAuth === 'login' ? 'true' : 'false');
  if (modeRegister) modeRegister.setAttribute('aria-selected', homeAuth === 'register' ? 'true' : 'false');
  if (accountForm) accountForm.hidden = Boolean(accountUser) || homeAuth === 'guest';
  if (accountSubmit) accountSubmit.textContent = t(homeAuth === 'register' ? 'register' : 'log_in');
  if (accountTtlWarn) accountTtlWarn.hidden = homeAuth !== 'register';
  if (accountPassword) {
    accountPassword.autocomplete = homeAuth === 'register' ? 'new-password' : 'current-password';
  }
  syncTurnstile();
  if (usernameInput) usernameInput.required = homeStep === 'user' && !accountUser;
  if (roomNameInput) roomNameInput.required = homeStep === 'room' && homeAuth === 'guest';
}

function isPopOpen(el) {
  return Boolean(el && el.classList.contains('is-open'));
}

const popCloseTimers = new WeakMap();
const POP_MS = 180;

function popDuration() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : POP_MS;
}

function setPopOpen(el, open) {
  if (!el) return false;
  const next = Boolean(open);
  const pending = popCloseTimers.get(el);
  if (pending) {
    clearTimeout(pending);
    popCloseTimers.delete(el);
  }
  if (next) {
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add('is-open');
    return true;
  }
  el.classList.remove('is-open');
  if (el.hidden) return false;
  const timer = window.setTimeout(() => {
    if (!el.classList.contains('is-open')) el.hidden = true;
    popCloseTimers.delete(el);
  }, popDuration());
  popCloseTimers.set(el, timer);
  return false;
}

function setAccountMenu(open) {
  if (!accountMenu) return;
  setPopOpen(accountMenu, open);
  const expanded = isPopOpen(accountMenu) ? 'true' : 'false';
  if (accountAvatarBtn) accountAvatarBtn.setAttribute('aria-expanded', expanded);
  if (userSettingsBtn) userSettingsBtn.setAttribute('aria-expanded', expanded);
}

function renderAccountAvatar() {
  if (!accountAvatarBtn) return;
  const inRoom = Boolean(roomView && !roomView.hidden);
  const logged = Boolean(accountUser);
  const show = logged || inRoom;
  accountAvatarBtn.hidden = !show;
  if (!show) {
    setAccountMenu(false);
    return;
  }
  const name = logged ? accountUser.username : myName;
  const url = logged ? accountUser.avatarUrl : '';
  if (accountAvatarImg) {
    if (url) {
      accountAvatarImg.src = url;
      accountAvatarImg.hidden = false;
    } else {
      accountAvatarImg.removeAttribute('src');
      accountAvatarImg.hidden = true;
    }
  }
  if (accountAvatarLetter) {
    accountAvatarLetter.hidden = Boolean(url);
    accountAvatarLetter.textContent = letterFor(name);
  }
  if (userBarName) userBarName.textContent = name || t('you');
  if (accountMenu) accountMenu.dataset.guest = logged ? 'false' : 'true';
}

function hidePinTip() {
  pinTipKey = '';
  if (pinTipTimer) {
    clearTimeout(pinTipTimer);
    pinTipTimer = 0;
  }
  if (pinTip) {
    pinTip.hidden = true;
    pinTip.dataset.nameOnly = 'false';
    pinTip.dataset.pinned = 'true';
  }
  if (pinTipUnpin) pinTipUnpin.hidden = false;
  if (pinTipPin) pinTipPin.hidden = true;
}

function placePinTip(btn) {
  if (!pinTip || !btn || pinTip.hidden) return;
  const rect = btn.getBoundingClientRect();
  const pad = 8;
  const gap = 8;
  pinTip.style.top = `${pad}px`;
  pinTip.style.left = `${Math.round(rect.right + gap)}px`;
  const tipW = pinTip.offsetWidth;
  const tipH = pinTip.offsetHeight;
  let top = rect.top + (rect.height - tipH) / 2;
  top = Math.max(pad, Math.min(top, window.innerHeight - tipH - pad));
  let left = rect.right + gap;
  if (left + tipW > window.innerWidth - pad) {
    left = Math.max(pad, rect.left - tipW - gap);
  }
  pinTip.style.top = `${Math.round(top)}px`;
  pinTip.style.left = `${Math.round(left)}px`;
}

function showPinTip(btn, pin, options = {}) {
  if (!pinTip || !pinTipName || !pin) return;
  if (pinTipTimer) {
    clearTimeout(pinTipTimer);
    pinTipTimer = 0;
  }
  const nameOnly = Boolean(options.nameOnly);
  const pinned = !nameOnly && pin.pinned !== false;
  pinTip.dataset.nameOnly = nameOnly ? 'true' : 'false';
  pinTip.dataset.pinned = pinned ? 'true' : 'false';
  if (pinTipUnpin) pinTipUnpin.hidden = nameOnly || !pinned;
  if (pinTipPin) pinTipPin.hidden = nameOnly || pinned;
  pinTipKey = pin.nameKey;
  pinTipName.textContent = pin.label;
  pinTip.hidden = false;
  placePinTip(btn);
  requestAnimationFrame(() => placePinTip(btn));
}

function delayHidePinTip() {
  if (pinTipTimer) clearTimeout(pinTipTimer);
  pinTipTimer = window.setTimeout(() => {
    hidePinTip();
  }, 140);
}

function loadGuestPins() {
  return pinsMod.loadGuestPins();
}

function saveGuestPins() {
  pinsMod.saveGuestPins(guestPins);
}

function pinSource() {
  return accountUser ? accountPins : guestPins;
}

function currentSeatPin() {
  return {
    roomId: currentRoomId || currentNameKey,
    nameKey: currentRoomId || currentNameKey,
    inviteCode: currentInviteCode || state.inviteCode,
    label: currentRoomLabel || currentInviteCode || currentNameKey,
    iconUrl: currentIconUrl || '',
    username: myName || '',
    pinned: false,
  };
}

function rememberGuestPinMeta() {
  if (accountUser || !(currentRoomId || currentInviteCode)) return;
  const key = currentRoomId || currentInviteCode;
  const idx = guestPins.findIndex((pin) => (pin.roomId || pin.inviteCode || pin.nameKey) === key);
  if (idx === -1) return;
  guestPins[idx] = {
    ...guestPins[idx],
    roomId: currentRoomId || guestPins[idx].roomId,
    inviteCode: currentInviteCode || guestPins[idx].inviteCode,
    label: currentRoomLabel || guestPins[idx].label,
    iconUrl: currentIconUrl || guestPins[idx].iconUrl || '',
    username: myName || guestPins[idx].username || '',
    pinned: true,
  };
  pinsMod.saveGuestPins(guestPins);
}

function railRooms() {
  const rooms = pinSource().map((pin) => ({ ...pin, pinned: pin.pinned !== false }));
  if (currentRoomId && !roomView.hidden) {
    const seated = rooms.some((pin) => (pin.roomId || pin.nameKey) === currentRoomId);
    if (!seated) rooms.push(currentSeatPin());
  }
  return rooms;
}

function renderPins() {
  if (!pinRail || !pinList) return;
  pinRail.hidden = false;
  const rooms = railRooms();
  const pins = rooms.map((pin) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pin-btn';
    const pinId = pin.roomId || pin.nameKey || pin.inviteCode || '';
    btn.dataset.nameKey = pinId;
    btn.dataset.pinned = pin.pinned ? 'true' : 'false';
    btn.setAttribute('aria-label', pin.label);
    btn.setAttribute('aria-current', pinId && pinId === (currentRoomId || currentNameKey) ? 'true' : 'false');
    const face = document.createElement('span');
    face.className = 'pin-face';
    if (pin.iconUrl) {
      const img = document.createElement('img');
      img.alt = '';
      img.src = pin.iconUrl;
      face.append(img);
    } else {
      face.textContent = letterFor(pin.label);
    }
    btn.append(face);
    btn.addEventListener('click', () => rejoinPinned(pin));
    btn.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      hidePinTip();
      if (pin.pinned) unpinRoom(pinId);
      else pinRoom(pinId);
    });
    btn.addEventListener('pointerenter', () => showPinTip(btn, pin));
    btn.addEventListener('pointerleave', () => delayHidePinTip());
    return btn;
  });
  if (pinAddBtn) pins.push(pinAddBtn);
  pinList.replaceChildren(...pins);
  if (pinTipKey && pinTipKey !== '__add__' && !rooms.some((pin) => pin.nameKey === pinTipKey)) {
    hidePinTip();
  }
  renderAccountAvatar();
}

function setRoomIconButton(info) {
  if (!roomIconBtn) return;
  const canEdit = Boolean(info && info.canEditIcon);
  roomIconBtn.hidden = !canEdit;
  const url = info && info.iconUrl;
  currentIconUrl = url || '';
  roomIconBtn.dataset.hasIcon = url ? 'true' : 'false';
  if (roomIconImg) {
    if (url) {
      roomIconImg.src = url;
      roomIconImg.hidden = false;
    } else {
      roomIconImg.removeAttribute('src');
      roomIconImg.hidden = true;
    }
  }
}

async function loadAccount() {
  try {
    const data = await accountMod.loadAccountState();
    accountUser = data.user || null;
    accountPins = accountUser && Array.isArray(data.pins) ? data.pins : [];
    requestsMod.setPendingRequests(data.pendingJoinRequests || []);
  } catch {
    accountUser = null;
    accountPins = [];
  }
  if (!accountUser) guestPins = loadGuestPins();
  setHomeAuth(accountUser ? 'guest' : homeAuth);
  setHomeMode(homeMode);
  renderPins();
}

function turnstileNeeded() {
  return homeAuth === 'register' && Boolean(turnstileSiteKey) && !accountUser;
}

function readTurnstileToken() {
  if (!turnstileNeeded()) return '';
  if (turnstileWidgetId == null || !window.turnstile) return '';
  try {
    return String(window.turnstile.getResponse(turnstileWidgetId) || '');
  } catch {
    return '';
  }
}

function resetTurnstile() {
  if (turnstileWidgetId == null || !window.turnstile) return;
  try {
    window.turnstile.reset(turnstileWidgetId);
  } catch {
    // ignore
  }
}

function destroyTurnstile() {
  if (turnstileWidgetId == null || !window.turnstile) {
    turnstileWidgetId = null;
    return;
  }
  try {
    window.turnstile.remove(turnstileWidgetId);
  } catch {
    // ignore
  }
  turnstileWidgetId = null;
}

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (document.getElementById('cf-turnstile-script')) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const wait = () => {
        if (window.turnstile) return resolve();
        if (Date.now() - started > 8000) return reject(new Error('turnstile'));
        window.setTimeout(wait, 50);
      };
      wait();
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'cf-turnstile-script';
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('turnstile'));
    document.head.append(script);
  });
}

async function syncTurnstile() {
  const show = turnstileNeeded();
  if (turnstileWrap) turnstileWrap.hidden = !show;
  if (!show) {
    destroyTurnstile();
    return;
  }
  if (!turnstileHost) return;
  try {
    await loadTurnstileScript();
  } catch {
    return;
  }
  if (!turnstileNeeded() || !window.turnstile) return;
  if (turnstileWidgetId != null) return;
  turnstileHost.replaceChildren();
  turnstileWidgetId = window.turnstile.render(turnstileHost, {
    sitekey: turnstileSiteKey,
    theme: 'dark',
  });
}

async function loadAuthConfig() {
  try {
    const res = await fetch('/api/auth/config', { credentials: 'same-origin' });
    if (!res.ok) return;
    const data = await res.json();
    turnstileSiteKey = data && data.turnstileSiteKey ? String(data.turnstileSiteKey) : '';
  } catch {
    turnstileSiteKey = '';
  }
  syncTurnstile();
}

async function submitAccount() {
  loginError.hidden = true;
  const payload = {
    username: accountUsername ? accountUsername.value : '',
    password: accountPassword ? accountPassword.value : '',
  };
  if (homeAuth === 'register') {
    const token = readTurnstileToken();
    if (turnstileSiteKey && !token) {
      loginError.textContent = t('captcha_fail');
      loginError.hidden = false;
      return;
    }
    if (token) payload.turnstileToken = token;
  }
  const path = homeAuth === 'register' ? '/api/auth/register' : '/api/auth/login';
  accountSubmit.disabled = true;
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      loginError.textContent = await readError(res, t('account_fail'));
      loginError.hidden = false;
      resetTurnstile();
      return;
    }
    const data = await res.json();
    accountUser = data.user || null;
    accountPins = accountUser && Array.isArray(data.pins) ? data.pins : [];
    if (accountPassword) accountPassword.value = '';
    if (accountUsername) accountUsername.value = '';
    setHomeAuth('guest');
    setHomeMode(homeMode);
    renderPins();
  } catch {
    loginError.textContent = t('could_not_reach');
    loginError.hidden = false;
    resetTurnstile();
  } finally {
    accountSubmit.disabled = false;
  }
}

async function logoutAccount() {
  setAccountMenu(false);
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } catch {
    // still clear local
  }
  accountUser = null;
  accountPins = [];
  guestPins = loadGuestPins();
  setHomeAuth('guest');
  setHomeMode(homeMode);
  renderPins();
}

async function deleteAccount() {
  if (!window.confirm(t('delete_account_confirm'))) return;
  setAccountMenu(false);
  try {
    const res = await fetch('/api/account/delete', { method: 'POST', credentials: 'same-origin' });
    if (!res.ok) {
      showRoomError(await readError(res, t('could_not_reach')));
      return;
    }
  } catch {
    showRoomError(t('could_not_reach'));
    return;
  }
  accountUser = null;
  accountPins = [];
  guestPins = loadGuestPins();
  if (!roomView.hidden) {
    await returnHome({ notifyServer: false });
  }
  setHomeAuth('guest');
  renderPins();
}

function showJoinError(message) {
  if (roomView.hidden) {
    loginError.textContent = message;
    loginError.hidden = false;
  } else {
    showRoomError(message);
  }
}

async function rejoinPinned(pin) {
  const roomId = pin.roomId || pin.nameKey;
  const inviteCode = pin.inviteCode;
  if (!roomId && !inviteCode) return;
  if (roomId && roomId === currentRoomId && !roomView.hidden) return;
  hidePinTip();
  if (!accountUser) {
    if (!inviteCode) {
      openRoomModal({ mode: 'join', name: pin.label || inviteCode || '' });
      return;
    }
    try {
      const info = await homeMod.joinRoom({ inviteCode, username: pin.username });
      if (!roomView.hidden) await returnHome({ notifyServer: false });
      await enterRoom(info);
    } catch (err) {
      showJoinError(err.message || t('could_not_reach'));
    }
    return;
  }
  try {
    const info = await homeMod.rejoinRoom(roomId);
    if (!roomView.hidden) await returnHome({ notifyServer: false });
    await enterRoom(info);
  } catch (err) {
    showJoinError(err.message || t('could_not_enter'));
  }
}

async function pinRoom(nameKey) {
  hidePinTip();
  if (!nameKey) return;
  if (!accountUser) {
    const seated = currentNameKey === nameKey ? currentSeatPin() : null;
    const existing = guestPins.find((pin) => pin.nameKey === nameKey);
    const next = {
      roomId: (seated && seated.roomId) || (existing && existing.roomId) || nameKey,
      nameKey,
      inviteCode: (seated && seated.inviteCode) || (existing && existing.inviteCode) || '',
      label: (seated && seated.label) || (existing && existing.label) || nameKey,
      iconUrl: (seated && seated.iconUrl) || (existing && existing.iconUrl) || '',
      username: (seated && seated.username) || (existing && existing.username) || '',
      pinned: true,
    };
    guestPins = [next, ...guestPins.filter((pin) => pin.nameKey !== nameKey)];
    saveGuestPins();
    renderPins();
    return;
  }
  try {
    const res = await fetch('/api/rooms/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ roomId: nameKey, nameKey }),
    });
    if (!res.ok) return;
    const data = await res.json();
    accountPins = Array.isArray(data.pins) ? data.pins : accountPins;
    renderPins();
  } catch {
    // ignore
  }
}

async function unpinRoom(nameKey) {
  hidePinTip();
  if (!accountUser) {
    guestPins = guestPins.filter((pin) => pin.nameKey !== nameKey);
    saveGuestPins();
    renderPins();
    return;
  }
  try {
    const res = await fetch('/api/rooms/unpin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ roomId: nameKey, nameKey }),
    });
    if (!res.ok) return;
    const data = await res.json();
    accountPins = Array.isArray(data.pins) ? data.pins : accountPins;
    renderPins();
  } catch {
    // ignore
  }
}

function setModalRoomError(message) {
  if (!modalRoomError) return;
  if (!message) {
    modalRoomError.hidden = true;
    modalRoomError.textContent = '';
    return;
  }
  modalRoomError.textContent = message;
  modalRoomError.hidden = false;
}

function setModalPermanent(on) {
  modalPermanentOn = Boolean(on);
  if (modalModeTemporary) modalModeTemporary.setAttribute('aria-selected', modalPermanentOn ? 'false' : 'true');
  if (modalModePermanent) modalModePermanent.setAttribute('aria-selected', modalPermanentOn ? 'true' : 'false');
  syncModalFields();
}

function setModalKind(kind) {
  modalKind = kind === 'watchparty' ? 'watchparty' : 'screenshare';
  if (modalKindScreenshare) modalKindScreenshare.setAttribute('aria-selected', modalKind === 'screenshare' ? 'true' : 'false');
  if (modalKindWatchparty) modalKindWatchparty.setAttribute('aria-selected', modalKind === 'watchparty' ? 'true' : 'false');
}

function syncModalFields() {
  if (modalCreateTtl) modalCreateTtl.hidden = true;
  if (modalPermanentField) modalPermanentField.hidden = true;
  homeMod.syncVisibilityFields(homeMode, modalRoomMode);
  if (modalRoomName) modalRoomName.required = modalStep === 'room';
  if (modalUsername) modalUsername.required = modalStep === 'user' && !accountUser;
  if (modalRoomSubmit) {
    modalRoomSubmit.textContent = modalStep === 'user' || (modalStep === 'room' && accountUser)
      ? t('enter')
      : t('continue');
  }
}

function setModalStep(step) {
  modalStep = step === 'kind' || step === 'user' ? step : 'room';
  if (roomModal) roomModal.dataset.step = modalStep;
  if (modalStepKind) modalStepKind.hidden = modalStep !== 'kind';
  if (modalStepRoom) modalStepRoom.hidden = modalStep !== 'room';
  if (modalStepUser) modalStepUser.hidden = modalStep !== 'user';
  syncModalFields();
  if (isPopOpen(roomModal)) {
    if (modalStep === 'user' && modalUsername) modalUsername.focus();
    else if (modalStep === 'room' && modalRoomName) modalRoomName.focus();
  }
}

function setModalRoomMode(mode) {
  const next = mode === 'create' ? 'create' : 'join';
  const changed = next !== modalRoomMode;
  modalRoomMode = next;
  if (modalModeJoin) modalModeJoin.setAttribute('aria-selected', modalRoomMode === 'join' ? 'true' : 'false');
  if (modalModeCreate) modalModeCreate.setAttribute('aria-selected', modalRoomMode === 'create' ? 'true' : 'false');
  if (changed && modalStep !== 'user') {
    setModalStep(modalRoomMode === 'create' ? 'kind' : 'room');
  } else if (modalStep === 'kind' && modalRoomMode === 'join') {
    setModalStep('room');
  } else {
    syncModalFields();
  }
}

function setRoomModal(open) {
  if (!roomModal) return;
  const next = Boolean(open);
  if (next) {
    hidePinTip();
    setAccountMenu(false);
    setPeopleOpen(false);
    setMicOpen(false);
    setModalRoomError('');
    setModalRoomMode(modalRoomMode);
    setModalStep(modalStep);
  }
  setPopOpen(roomModal, next);
  if (pinAddBtn) pinAddBtn.setAttribute('aria-expanded', isPopOpen(roomModal) ? 'true' : 'false');
  if (next && modalStep === 'room' && modalRoomName) modalRoomName.focus();
}

function openRoomModal(options = {}) {
  if (cropper && !cropper.hidden) return;
  if (modalRoomName) modalRoomName.value = options.inviteCode || options.name || '';
  if (modalUsername) modalUsername.value = options.username || '';
  pendingModal = { name: options.name || '', inviteCode: options.inviteCode || '', kind: 'screenshare' };
  setModalPermanent(false);
  setModalKind('screenshare');
  setModalRoomMode(options.mode === 'create' ? 'create' : 'join');
  setModalStep(options.mode === 'create' ? 'kind' : 'room');
  setRoomModal(true);
}

async function enterJoinedRoom(info) {
  setRoomModal(false);
  if (!roomView.hidden) {
    await returnHome({ notifyServer: false });
  }
  await enterRoom(info);
}

async function joinAccountRoom({ name, inviteCode, username, create, visibility, kind, onError, onBusy }) {
  const fail = (message) => {
    if (onError) onError(message);
  };
  const busy = (value) => {
    if (onBusy) onBusy(value);
  };
  if (create && !accountUser) {
    fail(t('auth_required'));
    return false;
  }
  if (create && !name) {
    fail(t('enter_fields'));
    return false;
  }
  if (!create && !inviteCode) {
    fail(t('enter_fields'));
    return false;
  }
  if (!accountUser && !username && !create) {
    fail(t('enter_fields'));
    return false;
  }
  busy(true);
  try {
    let code = inviteCode;
    if (create) {
      const created = await homeMod.createRoom({
        name,
        visibility: visibility || state.homeVisibility || 'public',
        kind: kind === 'watchparty' ? 'watchparty' : 'screenshare',
      });
      code = created.inviteCode;
    }
    try {
      const info = await homeMod.joinRoom({ inviteCode: code, username });
      await enterJoinedRoom(info);
      return true;
    } catch (err) {
      if (err.code === 'join_private' || err.code === 'auth_required') {
        if (!accountUser) {
          fail(t('auth_required'));
          return false;
        }
        const requested = await homeMod.requestJoin(code);
        if (requested && requested.joined) {
          await enterJoinedRoom(requested.joined);
          return true;
        }
        const wait = document.getElementById('join-wait');
        if (wait) wait.hidden = false;
        fail(t('join_pending'));
        return false;
      }
      fail(err.message || t('could_not_enter'));
      return false;
    }
  } catch (err) {
    fail(err.message || t('could_not_reach'));
    return false;
  } finally {
    busy(false);
  }
}

function closeCropper() {
  cropJob = null;
  if (cropper) cropper.hidden = true;
  if (imageFile) imageFile.value = '';
}

function layoutCrop() {
  if (!cropJob || !cropperStage || !cropperImage) return;
  const s = cropperStage.clientWidth;
  const cover = Math.max(s / cropJob.nw, s / cropJob.nh) * (cropJob.zoom / 100);
  const w = cropJob.nw * cover;
  const h = cropJob.nh * cover;
  cropJob.minX = Math.min(0, s - w);
  cropJob.minY = Math.min(0, s - h);
  cropJob.x = Math.min(0, Math.max(cropJob.minX, cropJob.x));
  cropJob.y = Math.min(0, Math.max(cropJob.minY, cropJob.y));
  cropperImage.style.width = `${w}px`;
  cropperImage.style.height = `${h}px`;
  cropperImage.style.left = `${cropJob.x}px`;
  cropperImage.style.top = `${cropJob.y}px`;
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image'));
    img.src = src;
  });
}

async function startCropFromFile(file, kind) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(url);
    const max = Math.max(img.naturalWidth, img.naturalHeight);
    let source = img;
    if (max > IMAGE_MAX_PX) {
      const scale = IMAGE_MAX_PX / max;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      source = await loadImageElement(canvas.toDataURL('image/png'));
    }
    cropJob = {
      kind,
      img: source,
      nw: source.naturalWidth,
      nh: source.naturalHeight,
      x: 0,
      y: 0,
      zoom: 100,
      dragging: false,
      lastX: 0,
      lastY: 0,
    };
    cropperImage.src = source.src;
    cropperZoom.value = '100';
    cropper.hidden = false;
    layoutCrop();
  } catch {
    showRoomError(t('image_invalid'));
    if (loginView && !loginView.hidden) {
      loginError.textContent = t('image_invalid');
      loginError.hidden = false;
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

function exportCropBlob() {
  if (!cropJob || !cropperStage) return Promise.resolve(null);
  const s = cropperStage.clientWidth;
  const cover = Math.max(s / cropJob.nw, s / cropJob.nh) * (cropJob.zoom / 100);
  const sw = s / cover;
  const sx = -cropJob.x / cover;
  const sy = -cropJob.y / cover;
  const out = Math.min(IMAGE_MAX_PX, Math.max(1, Math.round(sw)));
  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  canvas.getContext('2d').drawImage(cropJob.img, sx, sy, sw, sw, 0, 0, out, out);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.9);
  });
}

function pickImage(kind) {
  cropJob = { kind, pending: true };
  if (imageFile) imageFile.click();
}

async function uploadCropped(kind, blob) {
  const path = kind === 'avatar' ? '/api/account/avatar' : '/api/rooms/icon';
  const res = await fetch(path, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'image/webp' },
    body: blob,
  });
  if (!res.ok) throw new Error(await readError(res, t('image_invalid')));
  return res.json();
}

function keyOf(value) {
  return String(value ?? '').trim().toLowerCase();
}

function splitRoomLabel(label) {
  const raw = String(label || '').trim().replace(/\s+/g, ' ');
  if (!raw) return { name: '', tag: '', label: '' };
  const hash = raw.lastIndexOf('#');
  if (hash !== -1) {
    const tag = keyOf(raw.slice(hash + 1));
    if (/^[a-z]{4}$/.test(tag)) {
      const name = raw.slice(0, hash).trim();
      return { name, tag, label: `${name}#${tag}` };
    }
  }
  return { name: raw, tag: '', label: raw };
}

function labelsEqual(a, b) {
  const left = splitRoomLabel(a);
  const right = splitRoomLabel(b);
  return keyOf(left.name) === keyOf(right.name) && left.tag === right.tag;
}

function parseRoomInvite() {
  return homeMod.parseRoomInvite();
}

function roomInvitePath() {
  return homeMod.roomInvitePath(currentInviteCode || state.inviteCode);
}

function roomInviteUrl() {
  return homeMod.roomInviteUrl(currentInviteCode || state.inviteCode);
}

function setRoomInviteUrl() {
  homeMod.setRoomInviteUrl(currentInviteCode || state.inviteCode);
}

function clearRoomInviteUrl() {
  homeMod.clearRoomInviteUrl();
}

function applyRoomInvite(invite) {
  homeMod.applyRoomInvite(invite);
  setHomeMode('join');
}

function setRoomLabel(label) {
  currentRoomLabel = String(label || '');
  if (!roomLabel) return;
  roomLabel.textContent = currentRoomLabel;
  roomLabel.hidden = !currentRoomLabel;
}

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Electron and some Chromium builds expose clipboard but deny write.
    }
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.left = '-9999px';
  document.body.appendChild(field);
  field.focus();
  field.select();
  const ok = document.execCommand('copy');
  field.remove();
  if (!ok) throw new Error('copy');
}

async function copyRoomLink() {
  if (!currentInviteCode && !currentRoomLabel) return;
  const url = roomInviteUrl();
  try {
    await copyText(url);
  } catch {
    showRoomError(t('copy_fail'));
    return;
  }
  if (!roomLabel) return;
  roomLabel.textContent = t('copied');
  clearTimeout(copyRoomTimer);
  copyRoomTimer = setTimeout(() => {
    if (roomLabel && currentRoomLabel) roomLabel.textContent = currentRoomLabel;
  }, 1200);
}

function applyUiLanguage() {
  applyI18n();
  syncLangButtons();
  setYouName(myName);
  setHomeAuth(homeAuth);
  setHomeMode(homeMode);
  setHomeStep(homeStep);
  setLocalSharing(Boolean(localStream));
  setFloatOpen(floatBtn.dataset.open === 'true');
  syncMicControls();
  renderPeopleList();
  renderVoiceRoster();
  syncChatDeleteLabels();
  syncWatchControls();
  applyRoomChrome();
  setActiveChannel(activeChannel);
  applyLayout();
  refreshRemoteMedia();
  renderPins();
  setHomeKind(homeKind);
  setModalKind(modalKind);
  setModalRoomMode(modalRoomMode);
  if (pinTipKey === '__add__' && pinAddBtn && pinTip && !pinTip.hidden) {
    showPinTip(pinAddBtn, { nameKey: '__add__', label: t('join_room') }, { nameOnly: true });
  }
}

function loadCachedRoom() {
  try {
    const raw = localStorage.getItem(ROOM_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.name !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}

function rememberLastRoom(info) {
  const prev = loadCachedRoom() || {};
  const name = (info && (info.label || info.name)) || prev.name || '';
  const inviteCode = (info && info.inviteCode) || currentInviteCode || prev.inviteCode || '';
  const username = (info && info.username) || myName || prev.username || '';
  const roomId = (info && (info.id || info.roomId)) || currentRoomId || prev.roomId || '';
  if (!name || !inviteCode) return;
  try {
    localStorage.setItem(ROOM_CACHE_KEY, JSON.stringify({ name, inviteCode, username, roomId }));
  } catch {
    // ignore
  }
}

function cachePermanentRoom(name) {
  rememberLastRoom({ name });
}

function clearLastRoom() {
  try {
    localStorage.removeItem(ROOM_CACHE_KEY);
  } catch {
    // ignore
  }
}

async function resumeLastRoom() {
  const cached = loadCachedRoom();
  if (!cached || !cached.inviteCode) return false;
  if (!accountUser && !cached.username) return false;
  try {
    const info = await homeMod.joinRoom({
      inviteCode: cached.inviteCode,
      username: cached.username,
    });
    await enterRoom(info);
    return true;
  } catch {
    return false;
  }
}

function prefillJoinForm() {
  const cached = loadCachedRoom();
  if (!cached) return;
  roomNameInput.value = cached.inviteCode || cached.name || '';
}

function renderPeopleList() {
  if (!peopleList) return;
  const rows = [];
  if (myName) rows.push({ id: 'self', name: myName, self: true });
  for (const member of uniquePeople(roomMembers.values())) {
    rows.push({
      id: member.id,
      name: member.name || peerLabel(member.id),
      self: false,
      peer: peers.get(member.id),
      member,
    });
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
      mic.setAttribute('aria-label', item.self ? t('your_mic') : t('voice_for', { name: item.name }));

      const avatar = document.createElement('span');
      avatar.className = 'person-avatar';
      const avatarUrl = item.self
        ? (accountUser && accountUser.avatarUrl)
        : ((item.member && item.member.avatarUrl) || (item.peer && item.peer.avatarUrl));
      if (avatarUrl) {
        const img = document.createElement('img');
        img.alt = '';
        img.src = avatarUrl;
        avatar.append(img);
      } else {
        avatar.textContent = letterFor(item.name);
      }

      const name = document.createElement('span');
      name.className = 'person-name';
      name.textContent = item.self ? `${item.name} ${t('you_suffix')}` : item.name;

      li.append(mic, avatar, name);
      if (watchActive() && iAmCreator && !item.self) {
        const hostBtn = document.createElement('button');
        hostBtn.type = 'button';
        hostBtn.className = 'person-host';
        hostBtn.textContent = t('watch_make_host');
        if (watchState && watchState.hostPeerId === item.id) hostBtn.hidden = true;
        hostBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          makeWatchHost(item.id);
        });
        li.append(hostBtn);
      }
      if (!item.self && iAmCreator) {
        const kick = document.createElement('button');
        kick.type = 'button';
        kick.className = 'person-kick';
        kick.innerHTML = DELETE_SVG;
        kick.setAttribute('aria-label', t('remove'));
        kick.addEventListener('click', (event) => {
          event.stopPropagation();
          kickPeer(item.id);
        });
        li.append(kick);
      }

      if (item.self) {
        mic.addEventListener('click', (event) => {
          event.stopPropagation();
          if (micBtn && micBtn.disabled) return;
          setAccountMenu(!isPopOpen(accountMenu));
        });
      } else if (item.peer) {
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
        vol.setAttribute('aria-label', t('volume_for', { name: item.name }));
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
  if (!peopleList) return;
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
    if (muteBtn) muteBtn.textContent = peer.voiceMuted ? t('unmute') : t('mute');
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
  if (micToggle) micToggle.textContent = micUnmuted ? t('mute') : t('unmute');
  if (micDevice && micSettings.deviceId) micDevice.value = micSettings.deviceId;
}

function setMicLive(live) {
  if (!micBtn) return;
  micBtn.dataset.live = live ? 'true' : 'false';
  micBtn.dataset.muted = live ? 'false' : 'true';
  micBtn.setAttribute('aria-pressed', live ? 'true' : 'false');
}

function setMicOpen(open) {
  voicePeerId = null;
  refreshPeopleVoice();
  setAccountMenu(open);
}

function setPeopleOpen(open) {
  setMembersOpen(open);
}

function isLive(pane) {
  return pane && pane.dataset.live === 'true';
}

function allPanes() {
  const panes = [];
  if (paneWatch && watchActive()) panes.push(paneWatch);
  if (paneYou && !paneYou.hidden) panes.push(paneYou);
  for (const peer of peers.values()) {
    if (peer.pane && !peer.pane.hidden) panes.push(peer.pane);
  }
  return panes;
}

function peerByPc(pc) {
  for (const peer of peers.values()) {
    if (peer.pc === pc) return peer;
  }
  return null;
}

function getFeaturedPane() {
  if (featured === 'watch') return paneWatch;
  if (featured === 'you') return paneYou;
  return peers.get(featured)?.pane || paneYou;
}

function setPaneLive(pane, live, label) {
  if (!pane) return;
  pane.dataset.live = live ? 'true' : 'false';
  pane.querySelector('.pane-state').textContent = live ? t('live') : t('idle');
  if (!live && fullscreenElement() === pane) exitFullscreen();
  if (!live) exitPipForVideo(pane.querySelector(':scope > video'));
  applyLayout();
}

function pipSupported() {
  return Boolean(
    document.pictureInPictureEnabled
    && HTMLVideoElement.prototype.requestPictureInPicture
  );
}

function exitPipForVideo(video) {
  if (video && document.pictureInPictureElement === video) {
    document.exitPictureInPicture().catch(() => {});
  }
}

async function togglePanePip(video) {
  if (!video || !pipSupported()) return;
  try {
    if (document.pictureInPictureElement === video) {
      await document.exitPictureInPicture();
      return;
    }
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    await video.requestPictureInPicture();
  } catch {
    showRoomError(t('pip_fail'));
  }
}

function bindPipButton(btn, video) {
  if (!btn || !video) return;
  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    togglePanePip(video);
  });
}

function syncPipButtons() {
  const supported = pipSupported();
  const active = document.pictureInPictureElement;
  for (const pane of allPanes()) {
    const video = pane.querySelector(':scope > video');
    const btn = pane.querySelector('.pane-pip');
    if (!btn) continue;
    btn.hidden = !supported;
    const on = Boolean(video && video === active);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    const label = t(on ? 'pip_exit' : 'pip');
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }
}

function applyLayout() {
  if (paneWatch) paneWatch.hidden = !watchActive();
  if (watchActive()) {
    featured = 'watch';
  } else {
    if (featured === 'watch' || (featured !== 'you' && !peers.has(featured))) featured = 'you';
    const liveRemote = [...peers.values()].find((peer) => isLive(peer.pane));
    if (featured === 'you' && paneYou && !paneYou.hidden && !isLive(paneYou) && liveRemote) featured = liveRemote.id;
    if (featured !== 'you' && featured !== 'watch' && (!peers.has(featured) || !isLive(peers.get(featured).pane))) {
      featured = paneYou && !paneYou.hidden && isLive(paneYou) ? 'you' : liveRemote ? liveRemote.id : 'you';
    }
  }

  for (const pane of allPanes()) {
    const id = pane === paneWatch ? 'watch' : pane === paneYou ? 'you' : pane.dataset.peer;
    const isFeatured = featured === id;
    pane.removeAttribute('title');
    pane.dataset.slot = isFeatured ? 'featured' : 'pip';
    const video = pane.querySelector(':scope > video');
    if (video) video.title = isFeatured ? t('fullscreen') : t('show_stream');
    const reload = pane.querySelector('.pane-reload');
    if (reload) {
      reload.title = t('reload_stream');
      reload.setAttribute('aria-label', t('reload_stream'));
    }
    const volume = pane.querySelector('.pane-volume');
    if (volume) {
      volume.title = t('volume');
      volume.setAttribute('aria-label', t('volume'));
    }
    if (isFeatured) {
      if (pane.parentNode !== stage || pane.nextSibling !== pipRail) {
        stage.insertBefore(pane, pipRail);
      }
    } else if (pane.parentNode !== pipRail) {
      pipRail.append(pane);
    }
  }
  syncPipButtons();
  placeCamChrome();
  renderVoiceRoster();
  applySidePanel();
}

function setPeerStatus() {
  const count = (myName ? 1 : 0) + uniquePeople(roomMembers.values()).length;
  if (peerCount) {
    peerCount.textContent = String(count);
  }
  renderPeopleList();
  renderVoiceRoster();
}

function isWatchpartyRoom() {
  return roomKind === 'watchparty';
}

function watchActive() {
  return Boolean(watchState && watchState.sourceType);
}

function iAmWatchHost() {
  if (!watchState || !myId) return false;
  if (watchState.hostPeerId && watchState.hostPeerId === myId) return true;
  if (watchState.hostUserId && accountUser && String(watchState.hostUserId) === String(accountUser.id)) return true;
  return false;
}

function applyRoomChrome() {
  const watchOnly = isWatchpartyRoom();
  if (shareBtn) shareBtn.hidden = watchOnly;
  if (changeBtn) changeBtn.hidden = watchOnly || !localStream;
  if (cameraBtn) cameraBtn.hidden = watchOnly;
  if (floatBtn) floatBtn.hidden = watchOnly || !desktop;
  if (paneYou) paneYou.hidden = watchOnly;
  if (watchBtn) {
    watchBtn.hidden = !canManageWatch;
    watchBtn.dataset.live = watchActive() ? 'true' : 'false';
    watchBtn.setAttribute('aria-expanded', isPopOpen(watchSheet) ? 'true' : 'false');
  }
  if (watchStopBtn) watchStopBtn.hidden = !watchActive() || !canManageWatch;
  if (leaveBtn) {
    const inVoice = Boolean(inVoiceChannel || state.voiceChannelId);
    leaveBtn.setAttribute('aria-label', t(inVoice ? 'disconnect_voice' : 'leave'));
    leaveBtn.dataset.voice = inVoice ? 'true' : 'false';
  }
  applySidePanel();
}

function showRoomError(message) {
  if (!roomError) return;
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
  shareBtn.setAttribute('aria-label', sharing ? t('stop_sharing') : t('share_screen'));
  changeBtn.hidden = !sharing;
  if (sharing && ![...peers.values()].some((peer) => isLive(peer.pane))) {
    featured = 'you';
  }
  setPaneLive(paneYou, sharing, sharing ? 'Live' : 'Idle');
  applyRoomChrome();
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
    showRoomError(t('fullscreen_fail'));
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
      if (res.ok || res.status === 404) return;
      if (res.status !== 409) break;
    } catch {
      // retry
    }
    await sleep(250 * (attempt + 1));
  }
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
  if ('contentHint' in track) track.contentHint = 'speech';
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
  if (micRawStream || micDenied) return;
  if (micStartPromise) return micStartPromise;
  micStarting = true;
  micStartPromise = (async () => {
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
        showRoomError(t('mic_blocked'));
      } else {
        micBtn.disabled = false;
        showRoomError(t('mic_fail'));
      }
    } finally {
      micStarting = false;
      micStartPromise = null;
    }
  })();
  return micStartPromise;
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
  micStartPromise = null;
  setMicLive(false);
  setMicOpen(false);
  if (micLevel) micLevel.style.width = '0';
  syncMicControls();
}

async function setMicUnmuted(on) {
  if (!inVoiceChannel && on) return;
  if (on && !micRawStream) {
    await startMicCapture();
    if (!micRawStream) return;
  }
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
  track.enabled = inVoiceChannel;
  const stream = new MediaStream([track]);
  const el = peer.voiceEl || new Audio();
  peer.voiceEl = el;
  el.autoplay = true;
  el.playsInline = true;
  el.muted = !inVoiceChannel;
  el.srcObject = stream;
  el.play().catch(() => {});
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

function findAudioTrack(peer, mid) {
  if (!mid) return null;
  if (peer.pendingAudios && peer.pendingAudios.has(mid)) return peer.pendingAudios.get(mid);
  for (const [item, mapped] of peer.trackMids) {
    if (mapped === mid && item.kind === 'audio') return item;
  }
  return null;
}

function handleMicSource(peer, data) {
  const mid = data.mid != null ? String(data.mid) : '';
  if (!mid) return;
  if (data.on) peer.micMids.add(mid);
  else peer.micMids.delete(mid);
  if (peer.pendingAudios) peer.pendingAudios.delete(mid);
  if (!data.on) {
    detachRemoteMic(peer);
    refreshPeopleVoice();
    return;
  }
  const track = findAudioTrack(peer, mid);
  if (!track) {
    flushPendingAudio(peer);
    return;
  }
  if (peer.stream && peer.stream.getAudioTracks().includes(track)) {
    peer.stream.removeTrack(track);
    bindRemoteVideo(peer, true);
  }
  attachRemoteMic(peer, mid, track);
  flushPendingAudio(peer);
}

function attachShareAudio(peer, track) {
  if (!track || track.kind !== 'audio') return;
  attachDisplayAudio(track);
  if (!peer.stream) peer.stream = new MediaStream();
  for (const existing of [...peer.stream.getAudioTracks()]) {
    if (existing === track) continue;
    const existingMid = peer.trackMids.get(existing);
    if (existingMid && peer.micMids.has(existingMid)) continue;
    peer.stream.removeTrack(existing);
  }
  if (!peer.stream.getAudioTracks().includes(track)) peer.stream.addTrack(track);
  watchRemoteTrack(peer, track);
  playRemote(peer);
}

function removeShareAudioFromPane(peer, mid) {
  if (!peer.stream) return;
  for (const track of [...peer.stream.getAudioTracks()]) {
    const mapped = peer.trackMids.get(track);
    if (mid && mapped !== mid) continue;
    if (!mid && mapped && peer.micMids.has(mapped)) continue;
    peer.stream.removeTrack(track);
  }
  bindRemoteVideo(peer, true);
}

function handleShareAudioSource(peer, data) {
  const mid = data.mid != null ? String(data.mid) : '';
  if (!data.on) {
    if (mid) peer.screenAudioMids.delete(mid);
    else peer.screenAudioMids.clear();
    removeShareAudioFromPane(peer, mid);
    return;
  }
  if (!mid) return;
  peer.screenAudioMids.add(mid);
  const track = findAudioTrack(peer, mid);
  if (peer.pendingAudios) peer.pendingAudios.delete(mid);
  if (track) attachShareAudio(peer, track);
}

function flushPendingAudio(peer) {
  if (!peer.pendingAudios) return;
  for (const [mid, track] of [...peer.pendingAudios]) {
    if (peer.micMids.has(mid)) {
      peer.pendingAudios.delete(mid);
      attachRemoteMic(peer, mid, track);
      continue;
    }
    if (peer.screenAudioMids.has(mid) || (peer.screenOn && peer.voiceMid)) {
      peer.pendingAudios.delete(mid);
      attachShareAudio(peer, track);
    }
  }
}

function routeRemoteAudio(peer, mid, track) {
  if (shouldTreatAsMic(peer, mid, track)) {
    if (peer.pendingAudios) peer.pendingAudios.delete(mid);
    attachRemoteMic(peer, mid, track);
    flushPendingAudio(peer);
    return;
  }
  if (mid && peer.screenAudioMids.has(mid)) {
    if (peer.pendingAudios) peer.pendingAudios.delete(mid);
    attachShareAudio(peer, track);
    return;
  }
  if (mid) peer.pendingAudios.set(mid, track);
  flushPendingAudio(peer);
}

function signalShareAudioToPeer(peer, on) {
  const sender = peer.screenSenders.audio;
  const transceiver = sender && peer.pc.getTransceivers().find((item) => item.sender === sender);
  const mid = transceiver && transceiver.mid != null ? String(transceiver.mid) : '';
  if (on && !mid) return;
  sendSignal(peer.id, { type: 'source', role: 'share-audio', mid, on: Boolean(on) });
}

function signalMediaRoles(peer) {
  if (cameraTrack()) signalCameraToPeer(peer, true);
  if (micTrack()) {
    signalMicToPeer(peer, true);
    applyMicQuality(peer);
  }
  if (localStream) {
    signalScreenToPeer(peer, true);
    signalShareAudioToPeer(
      peer,
      localStream.getAudioTracks().some((track) => track.readyState === 'live')
    );
  }
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
          showRoomError(t('share_audio_stopped'));
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
          showRoomError(t('share_audio_stopped'));
        }
        return;
      }
      onShareVideoEnded(stream);
    });
  }
  await publishShareStream(stream);
  signalScreenToPeers(true);
  if (!stream.getAudioTracks().length) {
    showRoomError(desktop ? t('no_share_audio_desktop') : t('no_share_audio_web'));
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
  pickerContinue.textContent = t('continue');
  qualityRow.hidden = false;
  if (pickerTabs) pickerTabs.hidden = true;
  if (pickerEmpty) pickerEmpty.hidden = true;
  if (pickerTitle) pickerTitle.textContent = t('share');
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
      pickerEmpty.textContent = group === 'browser' ? t('no_browsers') : t('no_windows');
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
      showRoomError(t('list_windows_fail'));
      finish(null);
      return;
    }
    if (!sources.length) {
      showRoomError(t('no_sources'));
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

function silenceMsg() {
  return t('silence');
}

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
    if (roomError.textContent === silenceMsg()) showRoomError('');
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
    if (gotPcm || ticks >= 2) showRoomError(silenceMsg());
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
    showRoomError(started && started.error ? started.error : t('native_audio_fail'));
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
      showRoomError(t('share_blocked'));
      return;
    }
    showRoomError(t('change_screen_fail'));
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
      showRoomError(t('share_blocked'));
      return;
    }
    showRoomError(t('share_fail'));
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
  for (const peer of peers.values()) signalShareAudioToPeer(peer, false);
  for (const peer of peers.values()) {
    for (const kind of ['video', 'audio']) {
      const sender = peer.screenSenders[kind];
      if (sender && sender.track) sender.replaceTrack(null).catch(() => {});
    }
  }
  if (featuredView.kind === 'camera' || featuredView.kind === 'self') {
    renderCamFeature();
    renderCamStack();
  }
}

function setCameraLive(live) {
  cameraBtn.dataset.live = live ? 'true' : 'false';
  cameraBtn.setAttribute('aria-pressed', live ? 'true' : 'false');
  if (!live && featuredView.kind === 'self') featuredView = { kind: 'pane' };
  refreshRemoteMedia();
  applyLayout();
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
    if (pickerTitle) pickerTitle.textContent = t('camera');
    qualityRow.hidden = true;
    pickerGrid.replaceChildren();
    pickerGrid.hidden = true;
    pickerContinue.hidden = false;
    pickerContinue.textContent = t('confirm');
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
      showRoomError(t('camera_blocked'));
      return;
    }
    showRoomError(t('camera_fail'));
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

function collectLocalCamera() {
  const track = cameraTrack();
  if (!track) return null;
  return { peerId: 'self', mid: 'self', track, self: true };
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
  const self = collectLocalCamera();
  const featuringSelf = featuredView.kind === 'self';
  if (self && selfCamApp && !featuringSelf) {
    items.push({ kind: 'camera', ...self });
  } else if (self && !selfCamApp) {
    items.push({ kind: 'self-hidden' });
  }
  for (const cam of collectRemoteCameras()) {
    if (featuredView.kind === 'camera' && featuredView.peerId === cam.peerId && featuredView.mid === cam.mid) {
      continue;
    }
    items.push({ kind: 'camera', ...cam });
  }
  if (featuredView.kind === 'camera' || featuringSelf) {
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

function setSelfCamApp(on) {
  selfCamApp = Boolean(on);
  if (!selfCamApp && featuredView.kind === 'self') featuredView = { kind: 'pane' };
  refreshRemoteMedia();
}

function setSelfCamFloat(on) {
  selfCamFloat = Boolean(on);
  syncFloatWindow();
}

function renderCamFeature() {
  if (featuredView.kind === 'self') {
    const track = cameraTrack();
    if (!track || !selfCamApp) {
      featuredView = { kind: 'pane' };
      camFeature.hidden = true;
      camFeature.srcObject = null;
      camFeature.style.transform = '';
      return;
    }
    camFeature.hidden = false;
    camFeature.style.transform = 'scaleX(-1)';
    camFeature.srcObject = new MediaStream([track]);
    camFeature.play().catch(() => {});
    return;
  }
  camFeature.style.transform = '';
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
    if (item.self) button.classList.add('cam-tile-self');
    if (item.kind === 'self-hidden') {
      button.classList.add('cam-tile-hidden');
      button.title = t('show_self_cam');
      button.textContent = t('you');
    } else if (item.track) {
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = new MediaStream([item.track]);
      button.append(video);
      if (item.self) {
        const hide = document.createElement('span');
        hide.className = 'cam-tile-hide';
        hide.setAttribute('role', 'img');
        hide.setAttribute('aria-label', t('hide_self_cam'));
        hide.title = t('hide_self_cam');
        hide.textContent = '×';
        button.append(hide);
      }
    } else {
      button.classList.add('cam-tile-idle');
      button.title = t('not_sharing');
    }
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (item.kind === 'self-hidden') {
        setSelfCamApp(true);
        return;
      }
      if (item.self && event.target.closest('.cam-tile-hide')) {
        setSelfCamApp(false);
        return;
      }
      if (item.kind === 'screen') {
        unfeatureCamera();
        return;
      }
      if (item.self) {
        featuredView = { kind: 'self' };
      } else {
        featuredView = { kind: 'camera', peerId: item.peerId, mid: item.mid };
      }
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
    hideUnmute(peer);
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
  hideUnmute(peer);
  if (featuredView.kind === 'camera') refreshRemoteMedia();
}

function handleSourceSignal(peer, data) {
  if (data.role === 'screen') {
    peer.screenOn = Boolean(data.on);
    if (!data.on) {
      peer.screenAudioMids.clear();
      clearRemoteScreen(peer);
      return;
    }
    flushPendingAudio(peer);
    return;
  }
  if (data.role === 'share-audio') {
    handleShareAudioSource(peer, data);
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
  floatBtn.setAttribute('aria-label', t(open ? 'float_cams_close' : 'float_cams'));
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

function collectFloatCameras() {
  const cams = collectRemoteCameras();
  const self = collectLocalCamera();
  if (self && selfCamFloat) cams.unshift(self);
  return cams;
}

function syncFloatWindow() {
  const doc = floatDoc();
  if (!doc) return false;
  const strip = doc.getElementById('cams');
  const empty = doc.getElementById('empty');
  const selfBtn = doc.getElementById('self-toggle');
  if (!strip || !empty) return false;
  const cams = collectFloatCameras();
  empty.hidden = cams.length > 0;
  empty.textContent = t('no_cameras');
  if (selfBtn) {
    const live = Boolean(collectLocalCamera());
    selfBtn.hidden = !live;
    selfBtn.setAttribute('aria-pressed', selfCamFloat ? 'true' : 'false');
    selfBtn.textContent = t(selfCamFloat ? 'hide_self_cam' : 'show_self_cam');
  }
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
    if (video) video.style.transform = cam.self ? 'scaleX(-1)' : '';
    if (video && current === cam.track) continue;
    if (!video) {
      video = doc.createElement('video');
      video.dataset.camKey = key;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      strip.append(video);
    }
    video.style.transform = cam.self ? 'scaleX(-1)' : '';
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
    showRoomError(t('camera_window_fail'));
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
  for (const existing of [...peer.stream.getTracks()]) {
    if (existing === track) return;
    const ended = existing.readyState === 'ended';
    const replaceVideo = track.kind === 'video' && existing.kind === 'video';
    if (ended || replaceVideo) peer.stream.removeTrack(existing);
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

function hideUnmute(peer) {
  if (peer && peer.unmute) peer.unmute.hidden = true;
}

async function playRemote(peer) {
  bindRemoteVideo(peer);
  if (desktop) mediaUnlocked = true;
  if (desktop) {
    peer.video.muted = false;
    applyPeerVolume(peer);
    try {
      await peer.video.play();
    } catch {
      await peer.video.play().catch(() => {});
    }
    hideUnmute(peer);
    if (peer.voiceEl) peer.voiceEl.play().catch(() => {});
    return true;
  }
  peer.video.muted = true;
  try {
    await peer.video.play();
  } catch {
    // Video can still paint; audio button is a fallback.
  }
  if (!remoteHasAudio(peer)) {
    peer.video.muted = false;
    hideUnmute(peer);
    return true;
  }
  if (!mediaUnlocked) {
    peer.unmute.hidden = false;
    return false;
  }
  peer.video.muted = false;
  try {
    await peer.video.play();
    hideUnmute(peer);
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
}

function watchRemoteTrack(peer, track) {
  const refresh = () => {
    if (peer.stream && track.readyState === 'ended') peer.stream.removeTrack(track);
    const live = livePaneTracks(peer);
    setPaneLive(peer.pane, live.length > 0, live.length ? 'Live' : 'Idle');
    if (!live.length) {
      clearPaneVideo(peer.video);
      hideUnmute(peer);
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
      <button class="pane-reload" type="button" aria-label="Reload stream" title="Reload stream">${PANE_RELOAD_SVG}</button>
      <button class="pane-pip" type="button" aria-label="Picture-in-picture" title="Picture-in-picture" aria-pressed="false">${PANE_PIP_SVG}</button>
      <input class="pane-volume" type="range" min="0" max="1" step="0.01" value="1" aria-label="Volume" title="Volume" />
    </div>
  `;
  const video = pane.querySelector('video');
  const unmute = pane.querySelector('.unmute');
  if (desktop && unmute) unmute.hidden = true;
  const reloadBtn = pane.querySelector('.pane-reload');
  const pipBtn = pane.querySelector('.pane-pip');
  const volumeSlider = pane.querySelector('.pane-volume');
  reloadBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const peer = peers.get(id);
    if (peer) reloadRemotePane(peer);
  });
  bindPipButton(pipBtn, video);
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

function setPeerName(id, name, meta) {
  const peer = peers.get(id);
  if (!peer) return peer;
  if (name) peer.name = name;
  if (meta) {
    if (meta.avatarUrl !== undefined) peer.avatarUrl = meta.avatarUrl || '';
    if (meta.userId !== undefined) peer.userId = meta.userId || null;
  }
  const label = peer.pane.querySelector('.pane-name');
  if (label && peer.name) label.textContent = peer.name;
  renderPeopleList();
  return peer;
}

function resetPeer(id, name, meta) {
  const existing = peers.get(id);
  const keepName = name || (existing && existing.name) || '';
  const keepMeta = meta || (existing ? { avatarUrl: existing.avatarUrl, userId: existing.userId } : null);
  removePeer(id);
  return ensurePeer(id, keepName, keepMeta);
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

function ensurePeer(id, name, meta) {
  if (peers.has(id)) {
    setPeerName(id, name, meta);
    return peers.get(id);
  }
  const polite = peerPolite(id);
  const { pane, video, unmute, volumeSlider } = createRemotePane(id);
  const state = {
    id,
    name: name || '',
    userId: meta && meta.userId || null,
    avatarUrl: meta && meta.avatarUrl || '',
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
    screenAudioMids: new Set(),
    screenOn: false,
    cameraTracks: new Map(),
    pendingVideos: new Map(),
    pendingAudios: new Map(),
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
      routeRemoteAudio(state, mid, track);
      return;
    }
    if (shouldTreatAsCamera(state, mid, track)) {
      addRemoteCamera(state, mid, track);
      return;
    }
    if (isWatchpartyRoom() && track.kind === 'video') {
      track.enabled = false;
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
      signalMediaRoles(state);
    } catch (err) {
      console.error(err);
      showRoomError(t('negotiate_fail'));
    } finally {
      state.makingOffer = false;
    }
  };

  unmute.addEventListener('click', async (event) => {
    event.stopPropagation();
    const ok = await unlockRemoteAudio(state);
    if (!ok && remoteHasAudio(state)) {
      showRoomError(t('audio_blocked'));
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
  if (!inVoiceChannel) return;
  const member = roomMembers.get(from);
  if (member && !member.inVoice) return;
  if (data.type === 'restart') {
    resetPeer(from, member && member.name, member);
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
    signalMediaRoles(peer);
  } else {
    signalMediaRoles(peer);
  }
}

function peerEntry(item) {
  if (!item) return null;
  if (typeof item === 'string') return { id: item, name: '', inVoice: false, voiceChannelId: null };
  return {
    id: item.id,
    name: item.name || '',
    userId: item.userId || null,
    avatarUrl: item.avatarUrl || null,
    inVoice: Boolean(item.inVoice),
    voiceChannelId: item.voiceChannelId || null,
  };
}

async function handleRoomMessage(msg) {
  if (requestsMod.handleRequestEvent(msg)) return;
  if (msg.type === 'channel-added' || msg.type === 'channel-renamed') {
    if (msg.channel && msg.channel.id) {
      const rest = state.channels.filter((ch) => ch.id !== msg.channel.id);
      channelsMod.setChannels([...rest, msg.channel]);
    }
    return;
  }
  if (msg.type === 'channel-deleted') {
    channelsMod.applyDeletedChannel(
      msg.channelId || (msg.channel && msg.channel.id),
      msg.channels,
      msg.voiceCounts
    );
    return;
  }
  if (webrtcMod.applyVoiceEvent(msg, {
    myId,
    upsert: upsertRoomMember,
    connect: connectVoicePeer,
    remove: removePeer,
    render() {
      channelsMod.syncChannelChrome();
      renderVoiceRoster();
      applySidePanel();
      applyRoomChrome();
    },
  })) return;
  if (msg.type === 'hello') {
    myId = msg.id;
    if (msg.name) setYouName(msg.name);
    const listed = (msg.peers || []).map(peerEntry).filter((peer) => peer && peer.id);
    const listedIds = new Set(listed.map((peer) => peer.id));
    roomMembers.clear();
    voicePeerIds.clear();
    for (const peer of listed) upsertRoomMember(peer);
    if (inVoiceChannel && myId) voicePeerIds.add(myId);
    else if (msg.inVoice && myId) voicePeerIds.add(myId);
    for (const id of [...peers.keys()]) {
      if (!listedIds.has(id) || !voicePeerIds.has(id)) removePeer(id);
    }
    if (inVoiceChannel) {
      if (!msg.inVoice) {
        fetch('/api/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ action: 'join', channelId: state.voiceChannelId }),
        }).catch(() => {});
      }
      for (const peer of listed) {
        if (!peer.inVoice) continue;
        const existing = peers.get(peer.id);
        if (!existing) {
          connectVoicePeer(peer);
          continue;
        }
        setPeerName(peer.id, peer.name, peer);
        const ice = existing.pc.iceConnectionState;
        const conn = existing.pc.connectionState;
        if (ice === 'failed' || conn === 'failed') recoverPeer(existing);
      }
    }
    if (msg.channels) channelsMod.setChannels(msg.channels);
    if (msg.voiceCounts) state.voiceCounts = msg.voiceCounts;
    if (msg.voiceChannelId) state.voiceChannelId = String(msg.voiceChannelId);
    if (msg.pendingJoinRequests) requestsMod.setPendingRequests(msg.pendingJoinRequests);
    if (msg.kind) roomKind = msg.kind === 'watchparty' ? 'watchparty' : 'screenshare';
    if (Object.prototype.hasOwnProperty.call(msg, 'watch')) {
      applyWatchState(msg.watch, { action: 'set', canManageWatch: iAmCreator || iAmWatchHost(), serverAt: Date.now() });
    }
    applyRoomChrome();
    setPeerStatus();
    renderVoiceRoster();
    refreshRemoteMedia();
    return;
  }

  if (msg.type === 'watch') {
    applyIncomingWatch(msg.state, msg.action, msg.serverAt);
    return;
  }

  if (msg.type === 'peer-joined') {
    if (msg.id && msg.id !== myId) {
      const member = upsertRoomMember(peerEntry(msg));
      if (inVoiceChannel && member && member.inVoice) connectVoicePeer(member);
      setPeerStatus();
      renderVoiceRoster();
    }
    showRoomError('');
    return;
  }

  if (msg.type === 'voice-joined') {
    if (msg.id && msg.id !== myId) {
      const prev = roomMembers.get(msg.id) || { id: msg.id, name: '', inVoice: true };
      prev.inVoice = true;
      upsertRoomMember(prev);
      if (inVoiceChannel) connectVoicePeer(prev);
      renderVoiceRoster();
      applySidePanel();
    }
    return;
  }

  if (msg.type === 'voice-left') {
    if (msg.id && msg.id !== myId) {
      const prev = roomMembers.get(msg.id);
      if (prev) {
        prev.inVoice = false;
        upsertRoomMember(prev);
      }
      voicePeerIds.delete(msg.id);
      removePeer(msg.id);
      renderVoiceRoster();
      applySidePanel();
    }
    return;
  }

  if (msg.type === 'kicked') {
    returnHome({ notifyServer: false, forgetRoom: true, message: t('kicked') });
    return;
  }

  if (msg.type === 'peer-left') {
    roomMembers.delete(msg.id);
    voicePeerIds.delete(msg.id);
    removePeer(msg.id);
    setPeerStatus();
    renderVoiceRoster();
    return;
  }

  if (msg.type === 'signal') {
    try {
      await handleSignal(msg.from, msg.data);
    } catch (err) {
      console.error(err);
      showRoomError(t('signal_fail'));
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
      showRoomError(t('signal_fail'));
    });
  });

  events.addEventListener('error', () => {
    if (gen !== socketGen || leavingRoom) return;
    if (events && events.readyState === EventSource.CONNECTING) {
      if (opened) showRoomError(t('reconnecting'));
      return;
    }
    if (events && events.readyState === EventSource.CLOSED) {
      void (async () => {
        if (gen !== socketGen || leavingRoom) return;
        try {
          const res = await fetch('/api/me', { credentials: 'same-origin' });
          if (res.status === 404 || res.status === 401) {
            const message = res.status === 404 ? t('room_not_found') : '';
            await returnHome({ notifyServer: false, forgetRoom: true, message });
            return;
          }
        } catch {
          // Network blip — keep reconnecting.
        }
        if (gen !== socketGen || leavingRoom) return;
        showRoomError(t('disconnected'));
        reconnectTimer = setTimeout(() => connectSocket(), 1000);
      })();
    }
  });
}

const CHAT_NAME_COLORS = [
  '#ff7ab8', '#7ad1ff', '#9be07a', '#ffb347',
  '#c9a0ff', '#ff6b6b', '#4ecdc4', '#ffe66d',
  '#a8e6cf', '#ff8c69', '#6c9fff', '#e0aaff',
];

function hashNameColor(key) {
  let h = 2166136261;
  const s = String(key || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return CHAT_NAME_COLORS[(h >>> 0) % CHAT_NAME_COLORS.length];
}

function isChatNearBottom() {
  if (!chatLog) return true;
  return chatLog.scrollHeight - chatLog.scrollTop - chatLog.clientHeight < 48;
}

function scrollChatIfNeeded() {
  if (!chatLog || !chatStickBottom) return;
  chatLog.scrollTop = chatLog.scrollHeight;
}

function clearChatLog() {
  if (chatLog) chatLog.replaceChildren();
  chatStickBottom = true;
}

function removeChatMessage(id) {
  if (!chatLog || id == null) return;
  const line = chatLog.querySelector(`[data-id="${CSS.escape(String(id))}"]`);
  if (line) line.remove();
}

function formatChatTime(ts) {
  const date = new Date(Number(ts) || 0);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= 0) return '';
  const loc = getLang() === 'pt' ? 'pt-BR' : 'en-US';
  const now = new Date();
  const time = date.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return time;
  const sameYear = date.getFullYear() === now.getFullYear();
  const day = date.toLocaleDateString(loc, sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
  return `${day} ${time}`;
}

function chatAvatarUrl(row) {
  if (row && row.avatarUrl) return row.avatarUrl;
  const member = row && row.peerId ? roomMembers.get(row.peerId) : null;
  if (member && member.avatarUrl) return member.avatarUrl;
  if (row && myId && String(row.peerId) === String(myId) && accountUser && accountUser.avatarUrl) {
    return accountUser.avatarUrl;
  }
  return '';
}

function renderChatAvatar(row) {
  const el = document.createElement('span');
  el.className = 'chat-avatar';
  el.setAttribute('aria-hidden', 'true');
  const url = chatAvatarUrl(row);
  if (url) {
    const img = document.createElement('img');
    img.alt = '';
    img.src = url;
    img.addEventListener('error', () => {
      el.replaceChildren();
      el.textContent = letterFor(row && row.username);
    });
    el.append(img);
    return el;
  }
  el.textContent = letterFor(row && row.username);
  return el;
}

function syncChatDeleteLabels() {
  if (!chatLog) return;
  for (const btn of chatLog.querySelectorAll('.chat-delete')) {
    btn.setAttribute('aria-label', t('delete_message'));
  }
  for (const time of chatLog.querySelectorAll('.chat-time')) {
    const ts = Date.parse(time.dateTime || '');
    if (Number.isFinite(ts)) time.textContent = formatChatTime(ts);
  }
}

function appendChatMessage(row) {
  if (!chatLog || !row || row.id == null) return;
  const id = String(row.id);
  if (chatLog.querySelector(`[data-id="${CSS.escape(id)}"]`)) return;
  const line = document.createElement('div');
  line.className = 'chat-line';
  line.dataset.id = id;
  const content = document.createElement('div');
  content.className = 'chat-content';
  const meta = document.createElement('div');
  meta.className = 'chat-meta';
  const name = document.createElement('span');
  name.className = 'chat-name';
  name.textContent = row.username || '';
  name.style.color = hashNameColor(row.usernameKey || row.username);
  meta.append(name);
  const createdAt = Number(row.createdAt || 0);
  if (createdAt > 0) {
    const time = document.createElement('time');
    time.className = 'chat-time';
    time.dateTime = new Date(createdAt).toISOString();
    time.textContent = formatChatTime(createdAt);
    time.title = new Date(createdAt).toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US');
    meta.append(time);
  }
  const body = document.createElement('div');
  body.className = 'chat-body';
  body.textContent = row.body || '';
  content.append(meta, body);
  line.append(renderChatAvatar(row), content);
  if (iAmCreator) {
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'chat-delete';
    del.innerHTML = DELETE_SVG;
    del.setAttribute('aria-label', t('delete_message'));
    del.addEventListener('click', (event) => {
      event.stopPropagation();
      if (chatMod.deleteChat) chatMod.deleteChat(id);
      else if (chatSocket) chatSocket.emit('chat:delete', { id: String(id) });
    });
    line.append(del);
  }
  const stick = chatStickBottom || isChatNearBottom();
  chatLog.append(line);
  if (stick) {
    chatStickBottom = true;
    scrollChatIfNeeded();
  }
}

function setChatOpen(open, options = {}) {
  if (!chatBtn) return;
  if (activeChannel !== 'voice') {
    chatOpen = false;
    chatBtn.setAttribute('aria-expanded', 'false');
    applySidePanel();
    return;
  }
  chatOpen = Boolean(open);
  chatBtn.setAttribute('aria-expanded', chatOpen ? 'true' : 'false');
  applySidePanel();
  if (chatOpen) {
    chatStickBottom = true;
    scrollChatIfNeeded();
    if (chatInput) chatInput.focus();
    applyLayout();
    return;
  }
  if (options.restoreFocus !== false && roomView && !roomView.hidden) chatBtn.focus();
  applyLayout();
}

function disconnectChat() {
  chatMod.disconnectChat();
  chatSocket = null;
}

function connectChat() {
  chatSocket = chatMod.connectChat({
    onHistory(rows) {
      clearChatLog();
      for (const row of rows || []) appendChatMessage(row);
      chatStickBottom = true;
      scrollChatIfNeeded();
    },
    onMessage(row) {
      appendChatMessage(row);
    },
    onDeleted(id) {
      removeChatMessage(id);
    },
  });
}

function disconnectWatch() {
  chatMod.stopIo(watchSocket);
  watchSocket = null;
}

function applyIncomingWatch(state, action, serverAt) {
  applyWatchState(state, {
    action,
    serverAt,
    canManageWatch: iAmCreator || (state && (
      (state.hostPeerId && state.hostPeerId === myId)
      || (state.hostUserId && accountUser && String(state.hostUserId) === String(accountUser.id))
    )),
  });
}

function connectWatch() {
  disconnectWatch();
  const socketIo = window.io;
  if (typeof socketIo !== 'function') return;
  watchSocket = socketIo(chatMod.ioOptions('/watch.io'));
  watchSocket.on('watch:event', (msg) => {
    if (!msg) return;
    applyIncomingWatch(msg.state, msg.action, msg.serverAt);
  });
}

function emitWatchControl(action, extra = {}) {
  if (!watchSocket) return;
  const payload = {
    action,
    mediaTime: extra.mediaTime,
    paused: extra.paused,
    sentAt: Date.now(),
  };
  if (watchSocket.connected) {
    watchSocket.emit('watch:control', payload);
    return;
  }
  watchSocket.once('connect', () => {
    if (watchSocket) watchSocket.emit('watch:control', payload);
  });
}

function parseTwitchWatchUrl(raw) {
  try {
    const href = String(raw || '').trim();
    const url = new URL(/^[a-z]+:\/\//i.test(href) ? href : `https://${href}`);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);
    if (host === 'clips.twitch.tv' || url.searchParams.get('clip') || parts[0] === 'clip' || parts[1] === 'clip') {
      return 'clip';
    }
    if (
      host === 'twitch.tv'
      || host === 'm.twitch.tv'
      || host === 'player.twitch.tv'
    ) {
      if (url.searchParams.get('video') || parts[0] === 'videos' || parts[0] === 'video') return 'vod';
    }
    return '';
  } catch {
    return '';
  }
}

function setWatchError(message) {
  if (!watchError) return;
  if (!message) {
    watchError.hidden = true;
    watchError.textContent = '';
    return;
  }
  watchError.hidden = false;
  watchError.textContent = message;
}

function setWatchSheet(open) {
  if (!watchSheet) return;
  if (open) {
    setRoomModal(false);
    setPeopleOpen(false);
    setMicOpen(false);
    setWatchError('');
    if (watchUrlInput) watchUrlInput.value = (watchState && watchState.sourceUrl) || '';
  }
  setPopOpen(watchSheet, open);
  applyRoomChrome();
  if (open && watchUrlInput) watchUrlInput.focus();
}

function formatWatchTime(sec) {
  const total = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatWatchClock(time, duration) {
  const now = formatWatchTime(time);
  return duration > 0 ? `${now} / ${formatWatchTime(duration)}` : now;
}

function syncWatchMute() {
  const muted = watchVolumeValue === 0;
  if (watchMuteBtn) {
    watchMuteBtn.dataset.muted = muted ? 'true' : 'false';
    watchMuteBtn.setAttribute('aria-label', muted ? t('unmute') : t('mute'));
  }
}

function syncWatchFullscreen() {
  const on = Boolean(paneWatch && fullscreenElement() === paneWatch);
  if (watchFsBtn) {
    watchFsBtn.dataset.fs = on ? 'true' : 'false';
    watchFsBtn.setAttribute('aria-label', on ? t('exit_fullscreen') : t('fullscreen'));
  }
}

function twitchParents() {
  const host = location.hostname;
  const parents = new Set([host]);
  if (host === 'localhost' || host === '127.0.0.1') {
    parents.add('localhost');
    parents.add('127.0.0.1');
  }
  return [...parents];
}

function isTwitchLive(state) {
  return Boolean(state && state.sourceType === 'twitch');
}

function isHlsUrl(raw) {
  const href = String(raw || '');
  try {
    const url = new URL(href, location.origin);
    return /\.m3u8(\b|$)/i.test(`${url.pathname}${url.search}`);
  } catch {
    return /\.m3u8(\b|$)/i.test(href);
  }
}

function isHlsSource(state) {
  return Boolean(state && (state.sourceType === 'hls' || isHlsUrl(state.sourceUrl)));
}

function isWatchLiveHls() {
  return Boolean(watchPlayer && watchPlayer.kind === 'hls' && watchPlayer.live);
}

function watchSyncable(state) {
  return Boolean(state && (
    state.sourceType === 'youtube'
    || state.sourceType === 'media'
    || state.sourceType === 'hls'
    || isHlsSource(state)
  ));
}

function twitchEmbedSrc(state) {
  const parents = twitchParents().map((item) => `parent=${encodeURIComponent(item)}`).join('&');
  return `https://player.twitch.tv/?channel=${encodeURIComponent(state.videoId || '')}&${parents}&autoplay=true`;
}

function youtubeReady() {
  return Boolean(
    watchPlayer
    && watchPlayer.kind === 'youtube'
    && watchPlayer.ready
    && watchPlayer.yt
    && typeof watchPlayer.yt.getCurrentTime === 'function'
  );
}

let hlsApiPromise = null;

function loadHlsApi() {
  if (window.Hls) return Promise.resolve();
  if (hlsApiPromise) return hlsApiPromise;
  hlsApiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'hls-js';
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      hlsApiPromise = null;
      reject(new Error('hls'));
    };
    document.head.append(script);
  });
  return hlsApiPromise;
}

function loadYoutubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve();
    };
    if (!document.getElementById('yt-iframe-api')) {
      const script = document.createElement('script');
      script.id = 'yt-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('youtube'));
      document.head.append(script);
    }
    window.setTimeout(() => {
      if (window.YT && window.YT.Player) resolve();
    }, 50);
  });
}

function expectedWatchTime(state, serverAt) {
  if (!state) return 0;
  if (state.paused) return Number(state.mediaTime) || 0;
  const sent = Number(serverAt || state.updatedAt) || Date.now();
  return (Number(state.mediaTime) || 0) + Math.max(0, (Date.now() - sent) / 1000);
}

function readLocalWatchTime() {
  if (!watchPlayer) return 0;
  if (watchPlayer.kind === 'youtube') {
    if (!youtubeReady()) return 0;
    return Number(watchPlayer.yt.getCurrentTime()) || 0;
  }
  if (watchPlayer.el && Number.isFinite(watchPlayer.el.currentTime)) {
    return watchPlayer.el.currentTime;
  }
  return 0;
}

function readLocalWatchPaused() {
  if (!watchPlayer) return true;
  if (watchPlayer.kind === 'youtube') {
    if (!youtubeReady()) return true;
    return watchPlayer.yt.getPlayerState() !== 1;
  }
  if (watchPlayer.el) return watchPlayer.el.paused;
  return true;
}

function applyWatchVolume() {
  const vol = Math.round(watchVolumeValue * 100);
  if (watchVolume) watchVolume.value = String(vol);
  if (watchVolumeValue > 0) watchVolumeRestore = watchVolumeValue;
  syncWatchMute();
  if (!watchPlayer) return;
  if (youtubeReady()) {
    watchPlayer.yt.setVolume(vol);
    if (vol === 0 && watchPlayer.yt.mute) watchPlayer.yt.mute();
    else if (watchPlayer.yt.unMute) watchPlayer.yt.unMute();
  }
  if (watchPlayer.el && (watchPlayer.kind === 'media' || watchPlayer.kind === 'hls')) {
    watchPlayer.el.muted = watchVolumeValue === 0;
    watchPlayer.el.volume = watchVolumeValue;
  }
}

function destroyWatchPlayer() {
  if (watchTickTimer) {
    clearInterval(watchTickTimer);
    watchTickTimer = 0;
  }
  const yt = watchPlayer && watchPlayer.yt;
  const hls = watchPlayer && watchPlayer.hls;
  if (watchPlayer) watchPlayer.ready = false;
  watchPlayer = null;
  if (hls && typeof hls.destroy === 'function') {
    try { hls.destroy(); } catch { /* ignore */ }
  }
  if (yt && typeof yt.destroy === 'function') {
    try { yt.destroy(); } catch { /* ignore */ }
  }
  if (watchStage) watchStage.replaceChildren();
}

async function postWatch(body) {
  const res = await fetch('/api/watch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, t('watch_fail')));
  return res.json();
}

function readLocalWatchDuration() {
  if (!watchPlayer || isWatchLiveHls()) return 0;
  if (watchPlayer.kind === 'youtube' && youtubeReady() && watchPlayer.yt.getDuration) {
    return Number(watchPlayer.yt.getDuration()) || 0;
  }
  if (watchPlayer.el && Number.isFinite(watchPlayer.el.duration) && watchPlayer.el.duration > 0) {
    return watchPlayer.el.duration;
  }
  return 0;
}

function startWatchClock() {
  if (watchTickTimer) clearInterval(watchTickTimer);
  watchTickTimer = 0;
  if (!watchSyncable(watchState)) return;
  watchTickTimer = window.setInterval(() => {
    if (!watchSyncable(watchState)) return;
    if (isWatchLiveHls()) {
      if (watchTime) watchTime.textContent = t('watch_live');
      return;
    }
    const time = readLocalWatchTime();
    if (watchTime) watchTime.textContent = formatWatchClock(time, readLocalWatchDuration());
    if (watchSeek && iAmWatchHost()) {
      const duration = readLocalWatchDuration();
      if (duration > 0) {
        watchSeek.max = '1000';
        watchSeek.value = String(Math.round((time / duration) * 1000));
      }
    }
  }, 250);
}

function seekWatchLocal(seconds, paused, options = {}) {
  if (!watchPlayer) return;
  if (watchPlayer.kind === 'youtube' && !youtubeReady()) return;
  const shouldSeek = options.seek !== false && Number.isFinite(Number(seconds));
  watchApplying = true;
  if (watchPlayer.kind === 'youtube') {
    if (shouldSeek) watchPlayer.yt.seekTo(seconds, true);
    if (paused) watchPlayer.yt.pauseVideo();
    else watchPlayer.yt.playVideo();
  } else if (watchPlayer.el) {
    if (shouldSeek) watchPlayer.el.currentTime = seconds;
    if (paused) watchPlayer.el.pause();
    else watchPlayer.el.play().catch(() => {});
  }
  window.setTimeout(() => {
    watchApplying = false;
  }, 400);
}

function applyWatchEvent(state, serverAt, action) {
  if (!watchPlayer || !watchSyncable(state)) return;
  if (action === 'tick') return;
  if (isWatchLiveHls()) {
    const paused = action === 'pause' || (action !== 'play' && Boolean(state.paused));
    seekWatchLocal(0, paused, { seek: false });
    return;
  }
  const snapshot = action === 'set' || action === 'host' || !action;
  const target = snapshot
    ? expectedWatchTime(state, serverAt)
    : (Number(state.mediaTime) || 0);
  if (action === 'play') {
    seekWatchLocal(target, false);
    return;
  }
  if (action === 'pause') {
    seekWatchLocal(target, true);
    return;
  }
  seekWatchLocal(target, Boolean(state.paused));
}

function syncWatchControls() {
  const host = iAmWatchHost();
  const live = isTwitchLive(watchState);
  const liveHls = isWatchLiveHls();
  const media = watchSyncable(watchState);
  const seekable = media && !liveHls;
  if (paneWatch) {
    paneWatch.dataset.player = live ? 'twitch-live' : ((watchState && watchState.sourceType) || '');
  }
  if (watchControls) watchControls.hidden = !watchActive();
  if (watchTransport) watchTransport.hidden = !media;
  if (watchPlayBtn) {
    const paused = Boolean(watchState && watchState.paused);
    watchPlayBtn.hidden = !host || !media;
    watchPlayBtn.dataset.paused = paused ? 'true' : 'false';
    watchPlayBtn.setAttribute('aria-label', paused ? t('play') : t('pause'));
  }
  if (watchSeek) watchSeek.hidden = !host || !seekable;
  if (watchTime) {
    watchTime.hidden = !media;
    if (liveHls) {
      watchTime.textContent = t('watch_live');
    } else if (media) {
      watchTime.textContent = formatWatchClock(
        watchState ? watchState.mediaTime : 0,
        readLocalWatchDuration()
      );
    }
  }
  syncWatchMute();
  syncWatchFullscreen();
  if (watchStateLabel) {
    watchStateLabel.textContent = live
      ? t('watch_twitch')
      : (liveHls ? t('watch_live') : (host ? t('watch_now_host') : t('watch_host')));
  }
}

function mountWatchTwitchLive(state) {
  destroyWatchPlayer();
  if (!watchStage) return;
  const frame = document.createElement('iframe');
  frame.src = twitchEmbedSrc(state);
  frame.allowFullscreen = true;
  frame.setAttribute('allow', 'autoplay; fullscreen');
  watchStage.append(frame);
  watchPlayer = { kind: 'twitch', el: frame, ready: true, live: true, videoId: state.videoId };
}

function mountWatchTwitch(state) {
  if (/^v?\d+$/i.test(String(state.videoId || ''))) {
    destroyWatchPlayer();
    showRoomError(t('watch_vod'));
    return;
  }
  mountWatchTwitchLive(state);
}

function createWatchVideo(state, serverAt) {
  const video = document.createElement('video');
  video.playsInline = true;
  video.autoplay = !state.paused;
  video.addEventListener('error', () => {
    showRoomError(watchPlayer && watchPlayer.kind === 'hls' ? t('watch_hls_fail') : t('watch_media_fail'));
  });
  video.addEventListener('loadedmetadata', () => {
    if (watchPlayer && (!Number.isFinite(video.duration) || video.duration === Infinity)) {
      watchPlayer.live = true;
      syncWatchControls();
    }
    applyWatchEvent(state, serverAt, 'set');
  });
  video.addEventListener('canplay', () => {
    if (!watchPlayer || isWatchLiveHls()) return;
    applyWatchEvent(state, serverAt, 'set');
  }, { once: true });
  video.addEventListener('play', () => {
    if (watchApplying || !iAmWatchHost()) return;
    emitWatchControl('play', { mediaTime: video.currentTime });
  });
  video.addEventListener('pause', () => {
    if (watchApplying || !iAmWatchHost()) return;
    emitWatchControl('pause', { mediaTime: video.currentTime });
  });
  video.addEventListener('seeked', () => {
    if (watchApplying || !iAmWatchHost() || isWatchLiveHls()) return;
    emitWatchControl('seek', { mediaTime: video.currentTime, paused: video.paused });
  });
  return video;
}

function mountWatchMedia(state, serverAt) {
  destroyWatchPlayer();
  if (!watchStage) return;
  const video = createWatchVideo(state, serverAt);
  video.src = state.sourceUrl;
  watchStage.append(video);
  watchPlayer = { kind: 'media', el: video, url: state.sourceUrl };
  applyWatchVolume();
}

async function mountWatchHls(state, serverAt) {
  const seq = watchRenderSeq;
  destroyWatchPlayer();
  if (!watchStage) return;
  const video = createWatchVideo(state, serverAt);
  watchStage.append(video);
  watchPlayer = { kind: 'hls', el: video, url: state.sourceUrl, live: false, hls: null };
  applyWatchVolume();

  const native = Boolean(video.canPlayType('application/vnd.apple.mpegurl'));
  const useNative = () => {
    video.src = state.sourceUrl;
  };

  try {
    await loadHlsApi();
  } catch {
    if (native) {
      useNative();
      return;
    }
    showRoomError(t('watch_hls_fail'));
    return;
  }
  if (seq !== watchRenderSeq) return;
  if (!window.Hls || !window.Hls.isSupported()) {
    if (native) {
      useNative();
      return;
    }
    showRoomError(t('watch_hls_fail'));
    return;
  }

  const hls = new window.Hls({ enableWorker: true, backBufferLength: 90 });
  if (!watchPlayer || watchPlayer.kind !== 'hls') {
    hls.destroy();
    return;
  }
  watchPlayer.hls = hls;
  hls.on(window.Hls.Events.LEVEL_LOADED, (_evt, data) => {
    if (!watchPlayer || watchPlayer.hls !== hls) return;
    if (data.details && data.details.live) {
      watchPlayer.live = true;
      syncWatchControls();
    }
  });
  hls.on(window.Hls.Events.ERROR, (_evt, data) => {
    if (!data || !data.fatal || !watchPlayer || watchPlayer.hls !== hls) return;
    showRoomError(t('watch_media_fail'));
  });
  hls.attachMedia(video);
  hls.loadSource(state.sourceUrl);
}

async function mountWatchYoutube(state, serverAt) {
  const seq = watchRenderSeq;
  destroyWatchPlayer();
  if (!watchStage) return;
  await loadYoutubeApi();
  if (seq !== watchRenderSeq) return;
  const frame = document.createElement('iframe');
  frame.id = 'watch-yt-host';
  const params = new URLSearchParams({
    enablejsapi: '1',
    origin: location.origin,
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    controls: '0',
    autoplay: state.paused ? '0' : '1',
  });
  frame.src = `https://www.youtube.com/embed/${encodeURIComponent(state.videoId)}?${params}`;
  frame.setAttribute('allow', 'autoplay; fullscreen; encrypted-media');
  frame.allowFullscreen = true;
  watchStage.append(frame);
  watchPlayer = { kind: 'youtube', yt: null, ready: false, videoId: state.videoId };
  watchPlayer.yt = new window.YT.Player(frame, {
    host: 'https://www.youtube.com',
    events: {
      onReady: (event) => {
        if (!watchPlayer || watchPlayer.kind !== 'youtube') return;
        watchPlayer.ready = true;
        applyWatchVolume();
        applyWatchEvent(state, serverAt, 'set');
        if (event.target && typeof event.target.setPlaybackQuality === 'function') {
          event.target.setPlaybackQuality('hd1080');
        }
        startWatchClock();
      },
      onStateChange: (event) => {
        if (!youtubeReady() || watchApplying || !iAmWatchHost() || !event.target) return;
        const time = event.target.getCurrentTime();
        if (event.data === 1) {
          emitWatchControl('play', { mediaTime: time });
        } else if (event.data === 2) {
          emitWatchControl('pause', { mediaTime: time });
        }
      },
    },
  });
}

async function renderWatchPlayer(state, serverAt, action) {
  const seq = ++watchRenderSeq;
  if (!state) {
    destroyWatchPlayer();
    syncWatchControls();
    applyLayout();
    applyRoomChrome();
    return;
  }
  const same = watchPlayer && (
    (state.sourceType === 'youtube' && watchPlayer.kind === 'youtube' && watchPlayer.yt && watchPlayer.videoId === state.videoId)
    || (state.sourceType === 'twitch' && watchPlayer.kind === 'twitch' && watchPlayer.videoId === state.videoId)
    || (isHlsSource(state) && watchPlayer.kind === 'hls' && watchPlayer.url === state.sourceUrl)
    || (state.sourceType === 'media' && !isHlsSource(state) && watchPlayer.kind === 'media' && watchPlayer.url === state.sourceUrl)
  );
  if (!same) {
    if (state.sourceType === 'youtube') {
      await mountWatchYoutube(state, serverAt);
      if (watchPlayer) watchPlayer.videoId = state.videoId;
    } else if (state.sourceType === 'twitch') {
      mountWatchTwitch(state);
      if (watchPlayer) watchPlayer.videoId = state.videoId;
    } else if (isHlsSource(state)) {
      await mountWatchHls(state, serverAt);
    } else {
      mountWatchMedia(state, serverAt);
    }
    if (seq !== watchRenderSeq) return;
    applyLayout();
    applyRoomChrome();
    startWatchClock();
  } else if (!iAmWatchHost()) {
    applyWatchEvent(state, serverAt, action);
  }
  if (seq !== watchRenderSeq) return;
  syncWatchControls();
  if (iAmWatchHost()) startWatchClock();
}

function applyWatchState(state, extra = {}) {
  watchState = state || null;
  canManageWatch = Boolean(extra.canManageWatch) || iAmCreator || iAmWatchHost();
  renderWatchPlayer(
    watchState,
    extra.serverAt || (watchState && watchState.updatedAt),
    extra.action
  ).catch((err) => {
    console.error(err);
    showRoomError(t('watch_fail'));
  });
  if (extra.action !== 'tick') renderPeopleList();
}

async function startWatchFromForm() {
  let url = watchUrlInput ? watchUrlInput.value.trim() : '';
  setWatchError('');
  if (!url) {
    setWatchError(t('watch_bad_url'));
    return;
  }
  if (!/^[a-z]+:\/\//i.test(url)) url = `https://${url}`;
  const twitchKind = parseTwitchWatchUrl(url);
  if (twitchKind === 'clip') {
    setWatchError(t('watch_clip'));
    return;
  }
  if (twitchKind === 'vod') {
    setWatchError(t('watch_vod'));
    return;
  }
  if (watchStartBtn) watchStartBtn.disabled = true;
  try {
    const data = await postWatch({ action: 'set', url });
    applyWatchState(data.watch, { action: 'set', canManageWatch: true });
    setWatchSheet(false);
  } catch (err) {
    setWatchError(err && err.message ? err.message : t('watch_fail'));
  } finally {
    if (watchStartBtn) watchStartBtn.disabled = false;
  }
}

async function stopWatchParty() {
  try {
    await postWatch({ action: 'stop' });
    applyWatchState(null, { canManageWatch: iAmCreator });
    setWatchSheet(false);
  } catch (err) {
    setWatchError(err && err.message ? err.message : t('watch_fail'));
  }
}

async function makeWatchHost(peerId) {
  try {
    const data = await postWatch({ action: 'host', peerId });
    applyWatchState(data.watch, { canManageWatch: true, serverAt: Date.now() });
  } catch (err) {
    showRoomError(err && err.message ? err.message : t('watch_fail'));
  }
}

async function enterRoom(info) {
  leavingRoom = false;
  if (desktop) {
    mediaUnlocked = true;
    unlockMedia();
  }
  rememberLastRoom(info);
  if (info && info.username) setYouName(info.username);
  iAmCreator = Boolean(info && info.isCreator);
  canEditIcon = Boolean(info && info.canEditIcon);
  currentNameKey = (info && (info.id || info.roomId || info.nameKey)) || '';
  currentRoomId = currentNameKey;
  currentInviteCode = (info && info.inviteCode) || '';
  state.roomId = currentRoomId;
  state.inviteCode = currentInviteCode;
  state.visibility = (info && info.visibility) || 'public';
  requestsMod.renderInbox();
  if (info && info.channels) channelsMod.setChannels(info.channels);
  if (info && info.voiceChannelId) state.voiceChannelId = String(info.voiceChannelId);
  roomKind = info && info.kind === 'watchparty' ? 'watchparty' : 'screenshare';
  canManageWatch = Boolean(info && info.canManageWatch);
  applyWatchState(info && info.watch, { action: 'set', canManageWatch });
  rememberGuestPinMeta();
  setRoomLabel(info && (info.label || info.name));
  setRoomInviteUrl();
  setRoomIconButton(info);
  applyRoomChrome();
  const configRes = await fetch('/api/config', { credentials: 'same-origin' });
  if (configRes.ok) {
    const config = await configRes.json();
    if (Array.isArray(config.iceServers) && config.iceServers.length) {
      iceServers = config.iceServers;
    }
  }
  showView('room');
  floatBtn.hidden = !desktop;
  activeChannel = 'chat';
  inVoiceChannel = false;
  membersOpen = true;
  chatOpen = false;
  setMobilePane('main');
  roomMembers.clear();
  voicePeerIds.clear();
  if (micBtn) micBtn.disabled = true;
  setActiveChannel('chat');
  setLocalSharing(Boolean(localStream));
  setCameraLive(Boolean(cameraTrack()));
  setMicLive(micUnmuted);
  setPeerStatus();
  applyLayout();
  refreshRemoteMedia();
  await connectSocket();
  connectChat();
  connectWatch();
  loadMicSettings();
  syncMicControls();
  await loadAccount();
  renderAccountAvatar();
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

async function returnHome(options = {}) {
  const notifyServer = options.notifyServer !== false;
  if (options.forgetRoom !== false && (options.forgetRoom === true || notifyServer)) {
    clearLastRoom();
  }
  if (leavingRoom) return;
  leavingRoom = true;
  if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
  setPeopleOpen(false);
  setMicOpen(false);
  setChatOpen(false, { restoreFocus: false });
  inVoiceChannel = false;
  voicePeerIds.clear();
  roomMembers.clear();
  if (micBtn) micBtn.disabled = true;
  disconnectChat();
  disconnectWatch();
  clearChatLog();
  stopShare();
  stopCamera();
  stopMicCapture();
  closeVoiceCtx();
  disconnectSocket();
  closeAllPeers();
  setYouName('');
  setRoomLabel('');
  clearRoomInviteUrl();
  iAmCreator = false;
  canEditIcon = false;
  currentNameKey = '';
  currentRoomId = '';
  state.roomId = '';
  state.inviteCode = '';
  requestsMod.renderInbox();
  roomKind = 'screenshare';
  canManageWatch = false;
  applyWatchState(null);
  setWatchSheet(false);
  setRoomIconButton(null);
  applyRoomChrome();
  myId = null;
  if (notifyServer) {
    try {
      await fetch('/api/leave', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // Still return home if the network blips.
    }
  }
  showView('login');
  setHomeMode('join');
  setHomeStep('room');
  prefillJoinForm();
  usernameInput.value = '';
  renderPins();
  if (options.message) {
    loginError.textContent = options.message;
    loginError.hidden = false;
  }
  roomNameInput.focus();
}

async function leaveRoom() {
  return returnHome({ notifyServer: true });
}

async function kickPeer(id) {
  const targets = sessionsForPerson(id);
  try {
    for (const peerId of targets) {
      const res = await fetch('/api/kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: peerId }),
      });
      if (!res.ok) {
        showRoomError(await readError(res, t('kick_forbidden')));
        return;
      }
      removePeer(peerId);
    }
  } catch {
    showRoomError(t('could_not_reach'));
  }
}

async function readError(res, fallback) {
  try {
    const body = await res.json();
    if (body && body.code && t(body.code) !== body.code) return t(body.code);
    if (body && body.error) return body.error;
  } catch {
    // ignore
  }
  return fallback;
}

modeJoin.addEventListener('click', () => {
  setHomeMode('join');
  setHomeStep('room');
  roomNameInput.focus();
});

modeCreate.addEventListener('click', () => {
  setHomeMode('create');
  setHomeStep('kind');
});

if (homeKindScreenshare) homeKindScreenshare.addEventListener('click', () => setHomeKind('screenshare'));
if (homeKindWatchparty) homeKindWatchparty.addEventListener('click', () => setHomeKind('watchparty'));

if (homeBack) {
  homeBack.addEventListener('click', () => {
    setHomeStep('room');
    setHomeMode(homeMode);
  });
}
if (homeRoomBack) {
  homeRoomBack.addEventListener('click', () => {
    setHomeStep('kind');
    setHomeMode(homeMode);
  });
}

if (langEn) langEn.addEventListener('click', () => {
  setLang('en');
  applyUiLanguage();
});
if (langPt) langPt.addEventListener('click', () => {
  setLang('pt');
  applyUiLanguage();
});

if (membersToggle) {
  membersToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    if (isMobileRoom()) {
      setMobilePane(mobilePane === 'members' ? 'main' : 'members');
      return;
    }
    setMembersOpen(!membersOpen);
  });
}
if (channelsToggle) {
  channelsToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setMobilePane(mobilePane === 'channels' ? 'main' : 'channels');
  });
}
if (roomScrim) {
  roomScrim.addEventListener('click', () => {
    if (chatOpen) setChatOpen(false);
    setMobilePane('main');
  });
}
const mobileRoomMq = window.matchMedia(MOBILE_ROOM_MQ);
const onMobileRoomMq = () => {
  if (!isMobileRoom()) setMobilePane('main');
  else applySidePanel();
};
if (mobileRoomMq.addEventListener) mobileRoomMq.addEventListener('change', onMobileRoomMq);
else mobileRoomMq.addListener(onMobileRoomMq);

if (channelVoiceBtn) {
  channelVoiceBtn.addEventListener('click', () => {
    onVoiceChannelClick();
  });
}

if (channelChatBtn) {
  channelChatBtn.addEventListener('click', () => {
    setActiveChannel('chat');
  });
}

if (micBtn) {
  micBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (micBtn.disabled || !inVoiceChannel) return;
    setMicUnmuted(!micUnmuted);
  });
}

if (micToggle) {
  micToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setMicUnmuted(!micUnmuted);
  });
}

if (micDevice) {
  micDevice.addEventListener('change', async () => {
    const id = micDevice.value;
    micSettings.deviceId = id;
    saveMicSettings();
    if (!micRawStream) return;
    try {
      await openMicDevice(id);
    } catch (err) {
      console.error(err);
      showRoomError(t('mic_switch_fail'));
    }
  });
}

if (micGainSlider) {
  micGainSlider.addEventListener('input', () => {
    micSettings.gain = Number(micGainSlider.value) / 100;
    if (micInputGain) micInputGain.gain.value = micSettings.gain;
    saveMicSettings();
  });
}

if (micVadSlider) {
  micVadSlider.addEventListener('input', () => {
    micSettings.threshold = Number(micVadSlider.value) / 100;
    saveMicSettings();
  });
}

if (micPanel) micPanel.addEventListener('click', (event) => event.stopPropagation());

document.addEventListener('click', (event) => {
  const inPeople = event.target.closest('.member-panel, #people-list');
  const inAccount = event.target.closest('.pin-user, .channel-user-bar, .account-menu');
  if (isPopOpen(accountMenu) && !inAccount) setAccountMenu(false);
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
  if (!accountUser && (homeAuth === 'login' || homeAuth === 'register')) {
    await submitAccount();
    return;
  }
  if (homeStep === 'kind') {
    pendingHome = { ...pendingHome, kind: homeKind };
    setHomeStep('room');
    setHomeMode(homeMode);
    return;
  }
  if (homeStep === 'room') {
    const name = roomNameInput.value.trim();
    if (!name) {
      loginError.textContent = t('enter_fields');
      loginError.hidden = false;
      return;
    }
    if (homeMode === 'create' && !accountUser) {
      loginError.textContent = t('auth_required');
      loginError.hidden = false;
      setHomeAuth('login');
      return;
    }
    pendingHome = {
      name,
      inviteCode: homeMode === 'join' ? name : '',
      visibility: state.homeVisibility,
      kind: homeKind,
    };
    if (accountUser || homeMode === 'create') {
      loginBtn.disabled = true;
      const ok = await joinAccountRoom({
        name: pendingHome.name,
        inviteCode: pendingHome.inviteCode,
        create: homeMode === 'create',
        visibility: pendingHome.visibility,
        kind: pendingHome.kind,
        username: accountUser ? undefined : usernameInput.value.trim(),
        onError(message) {
          loginError.textContent = message;
          loginError.hidden = false;
        },
      });
      loginBtn.disabled = false;
      if (ok) return;
      return;
    }
    setHomeStep('user');
    setHomeMode(homeMode);
    return;
  }
  loginBtn.disabled = true;
  const ok = await joinAccountRoom({
    name: pendingHome.name || roomNameInput.value.trim(),
    inviteCode: pendingHome.inviteCode || roomNameInput.value.trim(),
    create: false,
    kind: pendingHome.kind || homeKind,
    username: usernameInput.value.trim(),
    onError(message) {
      loginError.textContent = message;
      loginError.hidden = false;
    },
  });
  loginBtn.disabled = false;
  if (ok) usernameInput.value = '';
});

document.addEventListener('click', () => {
  if (!mediaUnlocked) unlockMedia();
}, true);

paneYou.addEventListener('click', (event) => onPaneClick(event, paneYou));
bindPipButton(paneYou.querySelector('.pane-pip'), localVideo);

document.addEventListener('enterpictureinpicture', syncPipButtons);
document.addEventListener('leavepictureinpicture', syncPipButtons);

shareBtn.addEventListener('click', () => {
  if (isWatchpartyRoom() || !inVoiceChannel) return;
  if (localStream) stopShare();
  else startShare();
});

if (chatBtn) {
  chatBtn.addEventListener('click', () => {
    setChatOpen(!chatOpen);
  });
}

if (chatLog) {
  chatLog.addEventListener('scroll', () => {
    chatStickBottom = isChatNearBottom();
  });
}

if (chatForm && chatInput) {
  const fitChatInput = () => {
    chatInput.style.height = 'auto';
    chatInput.style.overflowY = 'hidden';
    const next = chatInput.scrollHeight;
    const max = Number.parseFloat(getComputedStyle(chatInput).maxHeight) || next;
    chatInput.style.height = `${Math.min(next, max)}px`;
    if (next > max + 1) chatInput.style.overflowY = 'auto';
  };
  chatInput.addEventListener('input', fitChatInput);
  chatInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    chatForm.requestSubmit();
  });
  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!chatSocket) return;
    const body = chatInput.value.trim();
    if (!body) return;
    chatMod.sendChat(body);
    chatInput.value = '';
    fitChatInput();
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isPopOpen(watchSheet)) {
    event.preventDefault();
    setWatchSheet(false);
    return;
  }
  if (event.key === 'Escape' && chatOpen) {
    if (isPopOpen(roomModal) || (cropper && !cropper.hidden)) return;
    event.preventDefault();
    setChatOpen(false);
  }
});

changeBtn.addEventListener('click', () => {
  changeScreen();
});

cameraBtn.addEventListener('click', () => {
  if (isWatchpartyRoom() || !inVoiceChannel) return;
  if (cameraStream) stopCamera();
  else startCamera();
});

floatBtn.addEventListener('click', () => {
  if (floatWin && !floatWin.closed) closeFloatWindow();
  else openFloatWindow();
});

leaveBtn.addEventListener('click', () => {
  if (leavingVoice || inVoiceChannel || state.voiceChannelId) {
    leaveVoiceChannel();
    return;
  }
  if (Date.now() - voiceLeaveAt < 800) return;
  leaveRoom();
});

if (roomLabel) {
  roomLabel.addEventListener('click', () => {
    copyRoomLink();
  });
}

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
  if (event.data && event.data.type === 'float-toggle-self-cam') setSelfCamFloat(!selfCamFloat);
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

if (modeTemporary) modeTemporary.addEventListener('click', () => setHomePermanent(false));
if (modePermanent) modePermanent.addEventListener('click', () => setHomePermanent(true));
if (modeGuest) modeGuest.addEventListener('click', () => setHomeAuth('guest'));
if (modeLogin) modeLogin.addEventListener('click', () => setHomeAuth('login'));
if (modeRegister) modeRegister.addEventListener('click', () => setHomeAuth('register'));
if (accountSubmit) accountSubmit.addEventListener('click', () => submitAccount());
if (accountAvatarBtn) {
  accountAvatarBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    hidePinTip();
    setAccountMenu(!isPopOpen(accountMenu));
  });
}
if (userSettingsBtn) {
  userSettingsBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    setAccountMenu(!isPopOpen(accountMenu));
  });
}
if (pinTip) {
  pinTip.addEventListener('pointerenter', () => {
    if (pinTipTimer) {
      clearTimeout(pinTipTimer);
      pinTipTimer = 0;
    }
  });
  pinTip.addEventListener('pointerleave', () => delayHidePinTip());
}
if (pinTipUnpin) {
  pinTipUnpin.addEventListener('click', (event) => {
    event.stopPropagation();
    if (pinTipKey && pinTipKey !== '__add__') unpinRoom(pinTipKey);
  });
}
if (pinTipPin) {
  pinTipPin.addEventListener('click', (event) => {
    event.stopPropagation();
    if (pinTipKey && pinTipKey !== '__add__') pinRoom(pinTipKey);
  });
}
if (pinAddBtn) {
  pinAddBtn.addEventListener('click', () => {
    hidePinTip();
    if (isPopOpen(roomModal)) setRoomModal(false);
    else openRoomModal();
  });
  pinAddBtn.addEventListener('pointerenter', () => {
    showPinTip(pinAddBtn, { nameKey: '__add__', label: t('join_room') }, { nameOnly: true });
  });
  pinAddBtn.addEventListener('pointerleave', () => delayHidePinTip());
}
if (roomModal) {
  roomModal.addEventListener('click', (event) => {
    if (event.target === roomModal) setRoomModal(false);
  });
}
if (roomModalClose) {
  roomModalClose.addEventListener('click', () => setRoomModal(false));
}
if (modalModeJoin) modalModeJoin.addEventListener('click', () => {
  setModalRoomError('');
  setModalRoomMode('join');
});
if (modalModeCreate) modalModeCreate.addEventListener('click', () => {
  setModalRoomError('');
  setModalRoomMode('create');
});
if (modalKindScreenshare) modalKindScreenshare.addEventListener('click', () => setModalKind('screenshare'));
if (modalKindWatchparty) modalKindWatchparty.addEventListener('click', () => setModalKind('watchparty'));
if (modalBack) {
  modalBack.addEventListener('click', () => {
    setModalRoomError('');
    setModalStep('room');
  });
}
if (modalModeTemporary) {
  modalModeTemporary.addEventListener('click', () => {
    setModalRoomError('');
    setModalPermanent(false);
  });
}
if (modalModePermanent) {
  modalModePermanent.addEventListener('click', () => {
    setModalRoomError('');
    setModalPermanent(true);
  });
}
if (roomModalForm) {
  roomModalForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setModalRoomError('');
    if (modalStep === 'kind') {
      pendingModal = { ...pendingModal, kind: modalKind };
      setModalStep('room');
      return;
    }
    if (modalStep === 'room') {
      const name = modalRoomName ? modalRoomName.value.trim() : '';
      if (!name) {
        setModalRoomError(t('enter_fields'));
        return;
      }
      if (modalRoomMode === 'create' && !accountUser) {
        setModalRoomError(t('auth_required'));
        return;
      }
      pendingModal = {
        name,
        inviteCode: modalRoomMode === 'join' ? name : '',
        visibility: state.modalVisibility,
        kind: modalKind,
      };
      if (!accountUser && modalRoomMode === 'join') {
        setModalStep('user');
        return;
      }
    }
    await joinAccountRoom({
      name: pendingModal.name || (modalRoomName && modalRoomName.value.trim()) || '',
      inviteCode: pendingModal.inviteCode || (modalRoomName && modalRoomName.value.trim()) || '',
      username: modalUsername ? modalUsername.value.trim() : '',
      create: modalRoomMode === 'create',
      visibility: pendingModal.visibility || state.modalVisibility,
      kind: pendingModal.kind || modalKind,
      onError: setModalRoomError,
      onBusy: (busy) => {
        if (modalRoomSubmit) modalRoomSubmit.disabled = busy;
      },
    });
  });
}
if (pinList) {
  pinList.addEventListener('scroll', () => hidePinTip());
}
window.addEventListener('resize', () => hidePinTip());
if (accountUploadBtn) {
  accountUploadBtn.addEventListener('click', () => {
    setAccountMenu(false);
    pickImage('avatar');
  });
}
if (accountLogoutBtn) accountLogoutBtn.addEventListener('click', () => logoutAccount());
if (accountDeleteBtn) accountDeleteBtn.addEventListener('click', () => deleteAccount());
if (roomIconBtn) {
  roomIconBtn.addEventListener('click', () => {
    if (!canEditIcon) return;
    pickImage('room');
  });
}
if (imageFile) {
  imageFile.addEventListener('change', async () => {
    const file = imageFile.files && imageFile.files[0];
    const kind = cropJob && cropJob.kind;
    if (!file || !kind) return;
    await startCropFromFile(file, kind);
  });
}
if (cropperCancel) cropperCancel.addEventListener('click', () => closeCropper());
if (cropperConfirm) {
  cropperConfirm.addEventListener('click', async () => {
    const kind = cropJob && cropJob.kind;
    const blob = await exportCropBlob();
    if (!blob || !kind) {
      loginError.textContent = t('image_invalid');
      loginError.hidden = false;
      return;
    }
    try {
      const data = await uploadCropped(kind, blob);
      closeCropper();
      if (kind === 'avatar' && data.user) {
        accountUser = { ...accountUser, ...data.user };
        renderPins();
        renderPeopleList();
      }
      if (kind === 'room' && data.iconUrl) {
        currentIconUrl = data.iconUrl;
        setRoomIconButton({ canEditIcon: true, iconUrl: data.iconUrl });
        await loadAccount();
      }
    } catch (err) {
      const message = err && err.message ? err.message : t('image_invalid');
      showRoomError(message);
      loginError.textContent = message;
      loginError.hidden = false;
    }
  });
}
if (cropperZoom) {
  cropperZoom.addEventListener('input', () => {
    if (!cropJob) return;
    cropJob.zoom = Number(cropperZoom.value) || 100;
    layoutCrop();
  });
}
if (cropperStage) {
  cropperStage.addEventListener('pointerdown', (event) => {
    if (!cropJob) return;
    cropJob.dragging = true;
    cropJob.lastX = event.clientX;
    cropJob.lastY = event.clientY;
    cropperStage.setPointerCapture(event.pointerId);
  });
  cropperStage.addEventListener('pointermove', (event) => {
    if (!cropJob || !cropJob.dragging) return;
    cropJob.x += event.clientX - cropJob.lastX;
    cropJob.y += event.clientY - cropJob.lastY;
    cropJob.lastX = event.clientX;
    cropJob.lastY = event.clientY;
    layoutCrop();
  });
  cropperStage.addEventListener('pointerup', () => {
    if (cropJob) cropJob.dragging = false;
  });
}

window.addEventListener('resize', () => {
  if (cropJob && cropper && !cropper.hidden) layoutCrop();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (cropper && !cropper.hidden) {
    event.preventDefault();
    closeCropper();
    return;
  }
  if (isPopOpen(watchSheet)) {
    event.preventDefault();
    setWatchSheet(false);
    return;
  }
  if (isPopOpen(roomModal)) {
    event.preventDefault();
    setRoomModal(false);
    return;
  }
  if (isMobileRoom() && mobilePane !== 'main') {
    event.preventDefault();
    setMobilePane('main');
  }
});

if (watchBtn) {
  watchBtn.addEventListener('click', () => {
    if (!canManageWatch && !watchActive()) return;
    setWatchSheet(!isPopOpen(watchSheet));
  });
}
if (watchSheet) {
  watchSheet.addEventListener('click', (event) => {
    if (event.target === watchSheet) setWatchSheet(false);
  });
}
if (watchSheetClose) watchSheetClose.addEventListener('click', () => setWatchSheet(false));
if (watchForm) {
  watchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    startWatchFromForm();
  });
}
if (watchStopBtn) watchStopBtn.addEventListener('click', () => stopWatchParty());
if (watchPlayBtn) {
  watchPlayBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!iAmWatchHost() || !watchState) return;
    const pause = !readLocalWatchPaused();
    seekWatchLocal(readLocalWatchTime(), pause, { seek: false });
    if (watchPlayBtn) {
      watchPlayBtn.dataset.paused = pause ? 'true' : 'false';
      watchPlayBtn.setAttribute('aria-label', pause ? t('play') : t('pause'));
    }
    emitWatchControl(pause ? 'pause' : 'play', { mediaTime: readLocalWatchTime() });
  });
}
if (watchMuteBtn) {
  watchMuteBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (watchVolumeValue > 0) {
      watchVolumeRestore = watchVolumeValue;
      watchVolumeValue = 0;
    } else {
      watchVolumeValue = watchVolumeRestore || 1;
    }
    applyWatchVolume();
  });
}
if (watchSeek) {
  watchSeek.addEventListener('pointerdown', (event) => event.stopPropagation());
  watchSeek.addEventListener('input', () => {
    if (!iAmWatchHost() || !watchPlayer) return;
    const max = readLocalWatchDuration();
    const next = (Number(watchSeek.value) / Number(watchSeek.max || 1000)) * max;
    seekWatchLocal(next, readLocalWatchPaused());
  });
  watchSeek.addEventListener('change', () => {
    if (!iAmWatchHost()) return;
    emitWatchControl('seek', {
      mediaTime: readLocalWatchTime(),
      paused: readLocalWatchPaused(),
    });
  });
}
if (watchVolume) {
  watchVolume.addEventListener('pointerdown', (event) => event.stopPropagation());
  watchVolume.addEventListener('input', () => {
    watchVolumeValue = Number(watchVolume.value) / 100;
    applyWatchVolume();
  });
}
if (watchFsBtn) {
  watchFsBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleFullscreen(paneWatch || stage);
  });
}
document.addEventListener('fullscreenchange', syncWatchFullscreen);
document.addEventListener('webkitfullscreenchange', syncWatchFullscreen);
if (paneWatch) {
  paneWatch.addEventListener('click', (event) => {
    if (event.target.closest('.watch-controls')) return;
    toggleFullscreen(paneWatch);
  });
}

hooks.applyLayout = () => applyLayout();
hooks.applySidePanel = () => applySidePanel();
hooks.onChannelActivated = () => {
  if (isMobileRoom()) setMobilePane('main');
};
hooks.showRoomError = (message) => showRoomError(message);
hooks.showJoinError = (message) => showJoinError(message);
hooks.connectVoicePeer = (member) => connectVoicePeer(member);
hooks.closeAllPeers = () => closeAllPeers();
hooks.startMicCapture = () => startMicCapture();
hooks.stopMicCapture = () => stopMicCapture();
hooks.switchChat = (channelId) => chatMod.switchChatChannel(channelId);
hooks.renderPeople = () => renderPeopleList();
hooks.renderVoiceRoster = () => renderVoiceRoster();
hooks.canEditChannels = () => iAmCreator;
hooks.onVoiceJoined = () => finishVoiceJoin();
hooks.onVoiceLeft = () => finishVoiceLeave();
hooks.enterRoom = (info) => enterRoom(info);
hooks.showView = (view) => showView(view);
hooks.setYouName = (name) => setYouName(name);
hooks.applyRoomChrome = () => applyRoomChrome();
hooks.setPeerStatus = () => setPeerStatus();
hooks.refreshRemoteMedia = () => refreshRemoteMedia();
hooks.upsertRoomMember = (item) => upsertRoomMember(item);
hooks.removePeer = (id) => removePeer(id);
hooks.setAccountMenu = (open) => setAccountMenu(open);
hooks.onJoinRequest = (request) => {
  if (!request || String(request.roomId || '') !== String(currentRoomId || state.roomId)) return;
  setMembersOpen(true);
};
hooks.onJoinApproved = async (request) => {
  try {
    const info = await homeMod.joinRoom({ inviteCode: request.inviteCode });
    await enterRoom(info);
  } catch {
    showJoinError(t('could_not_enter'));
  }
};

async function boot() {
  initLang();
  syncLangButtons();
  guestPins = pinsMod.loadGuestPins();
  setHomeKind(homeKind);
  setHomeMode('join');
  setHomeStep('room');
  homeMod.bindHomeChrome();
  channelsMod.bindChannels();
  requestsMod.bindRequests();
  prefillJoinForm();
  const invite = parseRoomInvite();
  if (invite) applyRoomInvite(invite);
  applyUiLanguage();
  await loadAuthConfig();
  await loadAccount();
  if (desktop) mediaUnlocked = true;
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (res.ok) {
      const info = await res.json();
      const sessionCode = info.inviteCode || '';
      if (!invite || !invite.inviteCode || invite.inviteCode === sessionCode) {
        await enterRoom(info);
        return;
      }
    } else if (res.status === 404) {
      clearLastRoom();
      showView('login');
      loginError.textContent = t('room_not_found');
      loginError.hidden = false;
      roomNameInput.focus();
      return;
    }
  } catch {
    // Try the last room next.
  }
  if (!invite && await resumeLastRoom()) return;
  showView('login');
  roomNameInput.focus();
}

boot();
