/* =====================================================================
   VINYL CALENDAR — app.js
   Auth, calendar, clip timeframe selection, audio playback, persistence
   ===================================================================== */

'use strict';

// ── Auth ───────────────────────────────────────────────────────────────
const AUTH_STORAGE_KEY = 'vinyl_auth_provider';
const AUTH_USER_KEY = 'vinyl_auth_user';
const SPOTIFY_TOKEN_KEY = 'vinyl_spotify_token';
const SPOTIFY_TOKEN_EXPIRY_KEY = 'vinyl_spotify_token_expiry';
const GOOGLE_TOKEN_KEY = 'vinyl_google_token';
const GOOGLE_TOKEN_EXPIRY_KEY = 'vinyl_google_token_expiry';

const authScreen = document.getElementById('authScreen');
const appWrap = document.getElementById('appWrap');
const userPillDot = document.getElementById('userPillDot');
const userPillLabel = document.getElementById('userPillLabel');
const logoutBtn = document.getElementById('logoutBtn');

const PROVIDER_META = {
  spotify: { label: 'spotify', dotClass: 'spotify', color: '#1DB954' },
  apple: { label: 'apple music', dotClass: 'apple', color: '#fc3c44' },
  youtube: { label: 'youtube music', dotClass: 'youtube', color: '#FF0000' },
  guest: { label: 'guest', dotClass: '', color: '' },
};

// ── Spotify OAuth PKCE Config ──────────────────────────────────────────
const SPOTIFY_CLIENT_ID = 'd1f234370a394629b77a8a9d54d7c22b';
const SPOTIFY_REDIRECT_URI = window.location.origin + window.location.pathname;
const SPOTIFY_SCOPES = 'user-read-private user-read-email';

// PKCE helpers
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
}

function base64urlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach(b => str += String.fromCharCode(b));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function startSpotifyLogin() {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64urlEncode(hashed);

  // Store verifier for the callback
  sessionStorage.setItem('spotify_code_verifier', codeVerifier);
  sessionStorage.setItem('vinyl_oauth_pending', 'spotify');

  const url = new URL('https://accounts.spotify.com/authorize');
  url.searchParams.set('client_id', SPOTIFY_CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', SPOTIFY_REDIRECT_URI);
  url.searchParams.set('scope', SPOTIFY_SCOPES);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('show_dialog', 'true');

  window.location.href = url.toString();
}

async function exchangeSpotifyCode(code) {
  const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
  if (!codeVerifier) return null;

  try {
    const resp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    if (!resp.ok) throw new Error('Token exchange failed');
    const data = await resp.json();

    localStorage.setItem(SPOTIFY_TOKEN_KEY, data.access_token);
    localStorage.setItem(SPOTIFY_TOKEN_EXPIRY_KEY, Date.now() + (data.expires_in * 1000));

    sessionStorage.removeItem('spotify_code_verifier');
    return data.access_token;
  } catch (e) {
    console.error('Spotify token exchange error:', e);
    return null;
  }
}

async function fetchSpotifyProfile(token) {
  try {
    const resp = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Spotify profile HTTP error:', resp.status, errText);
      throw new Error('Profile fetch failed: ' + resp.status);
    }
    const data = await resp.json();
    console.log('Spotify profile response:', data);
    return data;
  } catch (e) {
    console.error('Spotify profile error:', e);
    return null;
  }
}

function isSpotifyTokenValid() {
  const expiry = localStorage.getItem(SPOTIFY_TOKEN_EXPIRY_KEY);
  return expiry && Date.now() < parseInt(expiry);
}

// ── Google OAuth Implicit Flow (YouTube Music) ────────────────────────
const GOOGLE_CLIENT_ID = '914079723485-dj7tsibbth4hjhb1ifhgaq9jp9sslvmv.apps.googleusercontent.com';
const GOOGLE_REDIRECT_URI = window.location.origin + window.location.pathname;
const GOOGLE_SCOPES = 'openid profile email';

function startGoogleLogin() {
  sessionStorage.setItem('vinyl_oauth_pending', 'youtube');

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
  url.searchParams.set('scope', GOOGLE_SCOPES);
  url.searchParams.set('prompt', 'select_account');

  window.location.href = url.toString();
}

async function fetchGoogleProfile(token) {
  try {
    const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    if (!resp.ok) throw new Error('Google profile fetch failed');
    return await resp.json();
  } catch (e) {
    console.error('Google profile error:', e);
    return null;
  }
}

function isGoogleTokenValid() {
  const expiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
  return expiry && Date.now() < parseInt(expiry);
}

// ── Init Auth ──────────────────────────────────────────────────────────
async function initAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const pendingProvider = sessionStorage.getItem('vinyl_oauth_pending');

  // ── Google implicit flow: token in URL hash ──
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const hashToken = hashParams.get('access_token');
  const hashExpiresIn = hashParams.get('expires_in');

  if (hashToken && pendingProvider === 'youtube') {
    authScreen.style.display = 'flex';
    appWrap.style.display = 'none';

    localStorage.setItem(GOOGLE_TOKEN_KEY, hashToken);
    localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, Date.now() + ((parseInt(hashExpiresIn) || 3600) * 1000));

    // Clean URL
    history.replaceState(null, '', window.location.pathname);
    sessionStorage.removeItem('vinyl_oauth_pending');

    const profile = await fetchGoogleProfile(hashToken);
    const displayName = profile?.name || profile?.email || 'youtube user';
    localStorage.setItem(AUTH_STORAGE_KEY, 'youtube');
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
      provider: 'youtube',
      name: displayName,
      id: profile?.id,
      connectedAt: Date.now(),
    }));
    showApp('youtube');
    return;
  }

  // ── Spotify PKCE flow: code in URL params ──
  if (code && pendingProvider === 'spotify') {
    authScreen.style.display = 'flex';
    appWrap.style.display = 'none';

    const token = await exchangeSpotifyCode(code);
    history.replaceState(null, '', window.location.pathname);

    if (token) {
      const profile = await fetchSpotifyProfile(token);
      let displayName;
      if (profile) {
        displayName = (profile.display_name && profile.display_name.trim()) || profile.email?.split('@')[0] || profile.id || null;
      }
      // If profile fetch failed (e.g. no Premium), ask user for their name
      if (!displayName) {
        displayName = prompt('Welcome! Spotify requires Premium for auto-detection.\nPlease enter your display name:');
        if (!displayName || !displayName.trim()) displayName = 'music lover';
        displayName = displayName.trim();
      }
      localStorage.setItem(AUTH_STORAGE_KEY, 'spotify');
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
        provider: 'spotify',
        name: displayName,
        id: profile?.id || 'spotify',
        connectedAt: Date.now(),
      }));
      showApp('spotify');
      return;
    } else {
      sessionStorage.removeItem('vinyl_oauth_pending');
    }
  }

  // Check for existing session
  const saved = localStorage.getItem(AUTH_STORAGE_KEY);
  if (saved) {
    // If Spotify, check if token is still valid and refresh name
    if (saved === 'spotify' && isSpotifyTokenValid()) {
      // Only refresh name if profile fetch succeeds (requires Premium)
      const token = localStorage.getItem(SPOTIFY_TOKEN_KEY);
      const profile = await fetchSpotifyProfile(token);
      if (profile && (profile.display_name || profile.id)) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
          provider: 'spotify',
          name: (profile.display_name && profile.display_name.trim()) || profile.email?.split('@')[0] || profile.id,
          id: profile.id,
          connectedAt: Date.now(),
        }));
      }
      // If profile fails, keep the previously stored name
    }
    if (saved === 'youtube' && isGoogleTokenValid()) {
      const token = localStorage.getItem(GOOGLE_TOKEN_KEY);
      const profile = await fetchGoogleProfile(token);
      if (profile) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
          provider: 'youtube',
          name: profile.name || profile.email || 'youtube user',
          id: profile.id,
          connectedAt: Date.now(),
        }));
      }
    }
    showApp(saved);
  } else {
    authScreen.style.display = 'flex';
    appWrap.style.display = 'none';
  }
}

function showApp(provider) {
  authScreen.style.display = 'none';
  appWrap.style.display = 'block';
  localStorage.setItem(AUTH_STORAGE_KEY, provider);

  const meta = PROVIDER_META[provider] || PROVIDER_META.guest;

  // Try to show real username
  const userInfo = JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null');
  if (userInfo && userInfo.name && userInfo.provider === provider) {
    userPillLabel.textContent = userInfo.name;
  } else {
    userPillLabel.textContent = meta.label;
  }
  userPillDot.className = 'user-pill-dot ' + meta.dotClass;

  if (provider === 'spotify') highlightAuthTab('spotify');
  if (provider === 'apple') highlightAuthTab('apple');
  if (provider === 'youtube') highlightAuthTab('youtube');

  renderCalendar();
}

function highlightAuthTab(provider) {
  state._defaultTab = provider;
}

// Wire up auth buttons
document.getElementById('authSpotify').addEventListener('click', () => {
  showAuthLoading('authSpotify');
  setTimeout(() => startSpotifyLogin(), 400);
});

document.getElementById('authApple').addEventListener('click', () => {
  showAuthLoading('authApple');
  setTimeout(() => showApp('apple'), 800);
});

document.getElementById('authYoutube').addEventListener('click', () => {
  showAuthLoading('authYoutube');
  setTimeout(() => startGoogleLogin(), 400);
});

document.getElementById('authSkip').addEventListener('click', () => showApp('guest'));

function showAuthLoading(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.add('auth-btn-loading');
  btn.disabled = true;
  const originalHTML = btn.innerHTML;
  btn.dataset.originalHtml = originalHTML;

  const spinner = document.createElement('span');
  spinner.className = 'auth-spinner';
  btn.innerHTML = '';
  btn.appendChild(spinner);
  const txt = document.createElement('span');
  txt.textContent = 'Connecting…';
  btn.appendChild(txt);
}

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(SPOTIFY_TOKEN_KEY);
  localStorage.removeItem(SPOTIFY_TOKEN_EXPIRY_KEY);
  localStorage.removeItem(GOOGLE_TOKEN_KEY);
  localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
  appWrap.style.display = 'none';
  authScreen.style.display = 'flex';
  // Reset any loading states on auth buttons
  ['authSpotify', 'authApple', 'authYoutube'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn && btn.dataset.originalHtml) {
      btn.innerHTML = btn.dataset.originalHtml;
      btn.disabled = false;
      btn.classList.remove('auth-btn-loading');
    }
  });
});

// ── State ─────────────────────────────────────────────────────────────
const state = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(), // 0-indexed
  memories: loadMemories(),
  activeDate: null,
  selectedColor: '#e8d5b7',
  selectedFile: null,
  isPlaying: false,
  activeMemory: null,
  _defaultTab: 'file',

  // File clip state
  fileClipStart: 0,   // 0–100 percentage
  fileClipEnd: 100,
  fileDuration: 0,
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NUMBERS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const TODAY = new Date();
const TODAY_KEY = dateKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());

// ── DOM refs ───────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// Calendar
const monthNameEl = $('monthName');
const yearNameEl = $('yearName');
const monthNumLeft = $('monthNumberLeft');
const monthNameLeft = $('monthNameLeft');
const totalMemories = $('totalMemories');
const totalDaysEl = $('totalDays');
const daysGrid = $('daysGrid');

// Add modal
const addModal = $('addModal');
const addModalPanel = $('addModalPanel');
const addModalClose = $('addModalClose');
const modalDateBadge = $('modalDateBadge');
const songTitleInput = $('songTitleInput');
const songNoteInput = $('songNoteInput');
const fileDropZone = $('fileDropZone');
const audioFileInput = $('audioFileInput');
const fileSelected = $('fileSelected');
const fileNameEl = $('fileName');
const fileRemoveBtn = $('fileRemove');
const spotifyInput = $('spotifyInput');
const appleInput = $('appleInput');
const youtubeInput = $('youtubeInput');
const colorSwatches = $('colorSwatches');
const saveMemoryBtn = $('saveMemoryBtn');
const vpLabel = addModal.querySelector('.vp-label');

// Play modal
const playModal = $('playModal');
const playModalClose = $('playModalClose');
const playerVinyl = $('playerVinyl');
const playerLabel = $('playerLabel');
const playerLabelText = $('playerLabelText');
const playerDate = $('playerDate');
const playerTitleEl = $('playModalTitle');
const playerNote = $('playerNote');
const tonearm = $('tonearm');
const audioPlayer = $('audioPlayer');
const progressBg = $('progressBg');
const progressFill = $('progressFill');
const progressClipOverlay = $('progressClipOverlay');
const currentTimeEl = $('currentTime');
const totalTimeEl = $('totalTime');
const playPauseBtn = $('playPauseBtn');
const restartBtn = $('restartBtn');
const muteBtn = $('muteBtn');
const externalLinkArea = $('externalLinkArea');
const externalLinkBtn = $('externalLinkBtn');
const externalLinkLabel = $('externalLinkLabel');
const externalLinkIcon = $('externalLinkIcon');
const deleteMemoryBtn = $('deleteMemoryBtn');
const clipBadge = $('clipBadge');
const clipBadgeText = $('clipBadgeText');

// File clip elements
const fileClipSection = $('fileClipSection');
const fileWaveformBars = $('fileWaveformBars');
const fileClipSelection = $('fileClipSelection');
const fileStartHandle = $('fileStartHandle');
const fileEndHandle = $('fileEndHandle');
const fileClipStartLabel = $('fileClipStartLabel');
const fileClipEndLabel = $('fileClipEndLabel');
const fileClipDuration = $('fileClipDuration');

// External clip elements
const spotifyStartMin = $('spotifyStartMin');
const spotifyStartSec = $('spotifyStartSec');
const spotifyEndMin = $('spotifyEndMin');
const spotifyEndSec = $('spotifyEndSec');
const spotifyClipInfo = $('spotifyClipInfo');

const appleStartMin = $('appleStartMin');
const appleStartSec = $('appleStartSec');
const appleEndMin = $('appleEndMin');
const appleEndSec = $('appleEndSec');
const appleClipInfo = $('appleClipInfo');

const ytStartMin = $('ytStartMin');
const ytStartSec = $('ytStartSec');
const ytEndMin = $('ytEndMin');
const ytEndSec = $('ytEndSec');
const youtubeClipInfo = $('youtubeClipInfo');

// Toast
const toast = $('toast');
let toastTimeout = null;

// ── Storage ────────────────────────────────────────────────────────────
function loadMemories() {
  try { return JSON.parse(localStorage.getItem('vinyl_memories') || '{}'); }
  catch { return {}; }
}

function saveMemories() {
  localStorage.setItem('vinyl_memories', JSON.stringify(state.memories));
}

// ── Date helpers ───────────────────────────────────────────────────────
function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatDisplayDate(key) {
  const [y, m, d] = key.split('-');
  return `${MONTH_NAMES[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

function formatTime(sec) {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function mmssToSeconds(min, sec) {
  return (parseInt(min) || 0) * 60 + (parseInt(sec) || 0);
}

// ── Calendar rendering ─────────────────────────────────────────────────
function renderCalendar() {
  const y = state.currentYear;
  const m = state.currentMonth;

  monthNameEl.textContent = MONTH_NAMES[m];
  yearNameEl.textContent = y;
  monthNumLeft.textContent = MONTH_NUMBERS[m];
  monthNameLeft.textContent = MONTH_NAMES[m].toUpperCase();

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  totalDaysEl.textContent = daysInMonth;
  const monthPrefix = `${y}-${MONTH_NUMBERS[m]}`;
  const count = Object.keys(state.memories).filter(k => k.startsWith(monthPrefix)).length;
  totalMemories.textContent = count;

  daysGrid.innerHTML = '';

  const firstDay = new Date(y, m, 1).getDay();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const prevLast = new Date(y, m, 0).getDate();

  for (let i = firstDay - 1; i >= 0; i--) {
    daysGrid.appendChild(createDayCell(y, m - 1, prevLast - i, true));
  }
  for (let d = 1; d <= lastDay; d++) {
    daysGrid.appendChild(createDayCell(y, m, d, false));
  }
  const totalCells = Math.ceil((firstDay + lastDay) / 7) * 7;
  const nextFill = totalCells - firstDay - lastDay;
  for (let d = 1; d <= nextFill; d++) {
    daysGrid.appendChild(createDayCell(y, m + 1, d, true));
  }
}

function createDayCell(y, m, d, otherMonth) {
  const key = otherMonth ? null : dateKey(y, m, d);
  const memory = key ? state.memories[key] : null;

  const cell = document.createElement('div');
  cell.className = 'day-cell' +
    (otherMonth ? ' other-month' : '') +
    (key === TODAY_KEY ? ' today' : '');
  cell.setAttribute('data-key', key || '');

  const num = document.createElement('span');
  num.className = 'day-number';
  num.textContent = d;
  cell.appendChild(num);

  if (memory) {
    const wrap = document.createElement('div');
    wrap.className = 'mini-vinyl-wrap';
    const vinyl = document.createElement('div');
    const hasClip = (memory.clipStart != null && memory.clipEnd != null);
    vinyl.className = 'mini-vinyl' + (hasClip ? ' has-clip' : '');

    const grooves = document.createElement('div');
    grooves.className = 'mini-grooves';

    const label = document.createElement('div');
    label.className = 'mini-label';
    label.style.background = memory.color || '#e8d5b7';

    const hole = document.createElement('div');
    hole.className = 'mini-hole';

    label.appendChild(hole);
    vinyl.appendChild(grooves);
    vinyl.appendChild(label);
    wrap.appendChild(vinyl);
    cell.appendChild(wrap);

    const title = document.createElement('div');
    title.className = 'mini-title';
    title.textContent = memory.title || 'Untitled';
    cell.appendChild(title);

    cell.addEventListener('click', () => openPlayModal(key));
  } else if (!otherMonth) {
    const hint = document.createElement('div');
    hint.className = 'day-add-hint';
    hint.textContent = '+';
    cell.appendChild(hint);
    cell.addEventListener('click', () => openAddModal(key));
  }

  return cell;
}

// ── ADD modal ─────────────────────────────────────────────────────────
function openAddModal(key) {
  state.activeDate = key;
  state.selectedFile = null;
  state.selectedColor = '#e8d5b7';
  state.fileClipStart = 0;
  state.fileClipEnd = 100;
  state.fileDuration = 0;

  songTitleInput.value = '';
  songNoteInput.value = '';
  spotifyInput.value = '';
  appleInput.value = '';
  youtubeInput.value = '';
  fileSelected.style.display = 'none';
  fileDropZone.style.display = 'flex';
  fileClipSection.style.display = 'none';

  resetClipInputs();

  const defaultTab = state._defaultTab || 'file';
  switchTab(defaultTab);

  $$('.swatch').forEach(s => s.classList.remove('active'));
  document.querySelector('.swatch[data-color="#e8d5b7"]').classList.add('active');
  vpLabel.style.background = '#e8d5b7';

  modalDateBadge.textContent = formatDisplayDate(key);
  addModal.classList.add('open');
  setTimeout(() => songTitleInput.focus(), 300);
}

function closeAddModal() {
  addModal.classList.remove('open');
  state.activeDate = null;
  audioPlayer.pause();
}

function resetClipInputs() {
  spotifyStartMin.value = 0; spotifyStartSec.value = 0;
  spotifyEndMin.value = 3; spotifyEndSec.value = 30;
  updateExternalClipInfo('spotify');

  appleStartMin.value = 0; appleStartSec.value = 0;
  appleEndMin.value = 3; appleEndSec.value = 30;
  updateExternalClipInfo('apple');

  ytStartMin.value = 0; ytStartSec.value = 0;
  ytEndMin.value = 3; ytEndSec.value = 30;
  updateExternalClipInfo('youtube');

  fileStartHandle.value = 0;
  fileEndHandle.value = 100;
  updateFileClipUI();
}

// ── PLAY modal ────────────────────────────────────────────────────────

// ─── Embedded player state ────────────────────────────────────────────
let _spotifyIFrameAPI = null;  // Set by Spotify SDK callback
let _spotifyController = null;
let _ytPlayer = null;
let _ytClipTimer = null;
let _embedType = null;  // 'spotify' | 'youtube' | 'apple' | null

// Spotify IFrame API fires this global when their SDK loads (see <script> in <head>)
window.onSpotifyIframeApiReady = (IFrameAPI) => {
  _spotifyIFrameAPI = IFrameAPI;
};

// Extract Spotify track ID from any Spotify URL / URI
function extractSpotifyId(url) {
  const m = url.match(/track[/:]([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

// Extract YouTube video ID from any YouTube URL
function extractYouTubeId(url) {
  const m = url.match(/(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|e\/)|(?:(?:watch)?\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*/);
  return m ? m[1] : null;
}

// Called by embedded players when playback starts
function onEmbedPlaying() {
  if (!state.isPlaying) {
    state.isPlaying = true;
    playerVinyl.classList.add('playing');
    playerVinyl.classList.remove('lifting');
    tonearm.classList.add('playing');
    const h = vinylPlayHint ? vinylPlayHint.querySelector('.vinyl-hint-icon') : null;
    if (h) h.textContent = '⏸';
    playPauseBtn.innerHTML = '<span class="pp-icon">⏸</span>';
    playPauseBtn.classList.add('playing');
  }
}

// Called by embedded players when playback pauses/stops
function onEmbedPaused() {
  if (state.isPlaying) {
    state.isPlaying = false;
    playerVinyl.classList.remove('playing');
    playerVinyl.classList.add('lifting');
    tonearm.classList.remove('playing');
    const h = vinylPlayHint ? vinylPlayHint.querySelector('.vinyl-hint-icon') : null;
    if (h) h.textContent = '▶';
    playPauseBtn.innerHTML = '<span class="pp-icon">▶</span>';
    playPauseBtn.classList.remove('playing');
    setTimeout(() => playerVinyl.classList.remove('lifting'), 600);
  }
}

// Destroy any running embedded player
function destroyEmbed() {
  if (_spotifyController) {
    try { _spotifyController.destroy(); } catch (e) { }
    _spotifyController = null;
  }
  if (_ytPlayer) {
    try { _ytPlayer.destroy(); } catch (e) { }
    _ytPlayer = null;
  }
  if (_ytClipTimer) { clearInterval(_ytClipTimer); _ytClipTimer = null; }
  _embedType = null;

  const wrap = $('embeddedPlayerWrap');
  const container = $('embeddedPlayerContainer');
  const linkRow = $('embedOpenLinkRow');
  if (wrap) wrap.style.display = 'none';
  if (container) container.innerHTML = '';
  if (linkRow) linkRow.innerHTML = '';

  // Restore regular controls for file-based audio
  const ctrl = $('playerControls');
  if (ctrl) ctrl.style.display = 'block';
  externalLinkArea.style.display = 'none';
}

// ── Spotify inline embed with IFrame API ──────────────────────────────
function setupSpotifyEmbed(trackId, clipStart, clipEnd) {
  _embedType = 'spotify';
  const wrap = $('embeddedPlayerWrap');
  const container = $('embeddedPlayerContainer');
  const linkRow = $('embedOpenLinkRow');

  wrap.style.display = 'block';
  $('playerControls').style.display = 'none';

  linkRow.innerHTML = `
    <a class="embed-open-link" href="https://open.spotify.com/track/${trackId}" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="#1DB954" width="11" height="11"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
      Open full track in Spotify
    </a>`;

  const doCreate = () => {
    container.innerHTML = '<div id="spotifyEmbedTarget"></div>';
    try {
      _spotifyIFrameAPI.createController(
        document.getElementById('spotifyEmbedTarget'),
        { uri: `spotify:track:${trackId}`, width: '100%', height: 80 },
        (ctrl) => {
          _spotifyController = ctrl;

          ctrl.addListener('ready', () => {
            if (clipStart > 0) ctrl.seek(clipStart);
          });

          ctrl.addListener('playback_update', (e) => {
            const posSec = e.data.position / 1000;
            const paused = e.data.isPaused;

            paused ? onEmbedPaused() : onEmbedPlaying();

            if (!paused && clipEnd != null && posSec >= clipEnd) {
              ctrl.pause();
              onEmbedPaused();
              setTimeout(() => ctrl.seek(clipStart ?? 0), 80);
            }
          });
        }
      );
    } catch (err) {
      console.error("Spotify embed error:", err);
      container.innerHTML = '<p class="embed-clip-note" style="color:#c07070;">Failed to load Spotify player. The link might be invalid.</p>';
    }
  };

  if (_spotifyIFrameAPI) {
    doCreate();
  } else {
    // API not loaded yet — show basic iframe, then upgrade when API arrives
    container.innerHTML = `
      <iframe
        src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0"
        width="100%" height="80" frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy" class="spotify-embed-iframe">
      </iframe>`;

    let tries = 0;
    const poll = setInterval(() => {
      tries++;
      if (_spotifyIFrameAPI) {
        clearInterval(poll);
        doCreate();
      }
      if (tries > 30) clearInterval(poll);
    }, 500);
  }
}

// ── YouTube inline embed with IFrame Player API ───────────────────────
function setupYouTubeEmbed(videoId, clipStart, clipEnd, originalLink) {
  _embedType = 'youtube';
  const wrap = $('embeddedPlayerWrap');
  const container = $('embeddedPlayerContainer');
  const linkRow = $('embedOpenLinkRow');

  wrap.style.display = 'block';
  $('playerControls').style.display = 'none';

  // Use original link for the "Open" button, fallback to constructed URL
  const ytUrl = originalLink || `https://www.youtube.com/watch?v=${videoId}${clipStart > 0 ? '&t=' + Math.floor(clipStart) : ''}`;
  linkRow.innerHTML = `
    <a class="embed-open-link" href="${ytUrl}" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="#FF0000" width="11" height="11"><path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm4.8 12.96l-6.72 3.84A1.08 1.08 0 018.64 15.84V8.16a1.08 1.08 0 011.44-1.014l6.72 3.84a1.08 1.08 0 010 1.974z"/></svg>
      Open on YouTube
    </a>`;

  // Show a nice fallback UI when embedding is blocked
  const showEmbedFallback = () => {
    container.innerHTML = `
      <div style="text-align:center; padding: 1.5rem 1rem;">
        <p style="color: var(--ink-secondary); font-size: 0.8rem; margin-bottom: 1rem; line-height: 1.5;">
          This track can't be embedded inline — the uploader has restricted it.<br>
          Click below to listen directly!
        </p>
        <a href="${ytUrl}" target="_blank" rel="noopener"
           style="display: inline-flex; align-items: center; gap: 8px; padding: 0.7rem 1.5rem;
                  background: #FF0000; color: #fff; border-radius: 50px; font-family: var(--font-sans);
                  font-size: 0.85rem; font-weight: 500; text-decoration: none;
                  transition: transform 0.2s, box-shadow 0.2s;"
           onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 20px rgba(255,0,0,0.3)'"
           onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
          <svg viewBox="0 0 24 24" fill="#fff" width="16" height="16"><path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm4.8 12.96l-6.72 3.84A1.08 1.08 0 018.64 15.84V8.16a1.08 1.08 0 011.44-1.014l6.72 3.84a1.08 1.08 0 010 1.974z"/></svg>
          Listen on YouTube
        </a>
      </div>`;
  };

  container.innerHTML = '<div id="ytEmbedTarget"></div>';

  const doCreate = () => {
    try {
      _ytPlayer = new window.YT.Player('ytEmbedTarget', {
        width: '100%',
        height: 155,
        videoId: videoId,
        playerVars: {
          start: Math.floor(clipStart ?? 0),
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          origin: window.location.origin,
          iv_load_policy: 3,
        },
        events: {
          onStateChange(event) {
            const S = window.YT.PlayerState;
            if (event.data === S.PLAYING) {
              onEmbedPlaying();
              if (clipEnd != null) {
                if (_ytClipTimer) clearInterval(_ytClipTimer);
                _ytClipTimer = setInterval(() => {
                  if (!_ytPlayer) { clearInterval(_ytClipTimer); return; }
                  if (_ytPlayer.getCurrentTime() >= clipEnd) {
                    _ytPlayer.pauseVideo();
                    _ytPlayer.seekTo(clipStart ?? 0, true);
                    clearInterval(_ytClipTimer);
                    _ytClipTimer = null;
                    onEmbedPaused();
                  }
                }, 300);
              }
            } else if (event.data === S.PAUSED || event.data === S.ENDED) {
              if (_ytClipTimer) { clearInterval(_ytClipTimer); _ytClipTimer = null; }
              onEmbedPaused();
            }
          },
          onError(event) {
            console.warn("YouTube embed error:", event.data);
            showEmbedFallback();
          }
        }
      });
    } catch (err) {
      console.error("YouTube embed error:", err);
      showEmbedFallback();
    }
  };

  if (window.YT && window.YT.Player) {
    doCreate();
  } else {
    if (!document.getElementById('ytIframeApiScript')) {
      const s = document.createElement('script');
      s.id = 'ytIframeApiScript';
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      if (document.getElementById('ytEmbedTarget')) doCreate();
    };
  }
}

// ── Apple Music inline embed ──────────────────────────────────────────
function setupAppleEmbed(appleUrl, clipStart) {
  _embedType = 'apple';
  const wrap = $('embeddedPlayerWrap');
  const container = $('embeddedPlayerContainer');
  const linkRow = $('embedOpenLinkRow');

  wrap.style.display = 'block';
  $('playerControls').style.display = 'none';

  linkRow.innerHTML = `
    <a class="embed-open-link" href="${appleUrl}" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="#fc3c44" width="11" height="11"><path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.048-2.31-2.18-3.043a6.926 6.926 0 00-1.87-.837 12.51 12.51 0 00-2.306-.35c-.032 0-.063-.007-.095-.01H6.699C6.661 0 6.621 0 6.581 0A11.4 11.4 0 005.32.11a6.34 6.34 0 00-2.21.643 6.944 6.944 0 00-2.168 1.878A6.586 6.586 0 00.5 4.6a12.048 12.048 0 00-.35 2.282c-.01.282-.013.563-.013.846v9.535c0 .282.003.562.013.846.038.982.17 1.937.462 2.86.364 1.12 1.006 2.048 1.917 2.79.81.657 1.733 1.027 2.726 1.197a12.754 12.754 0 002.29.354c.038.003.076.007.114.007H17.345c.038 0 .076-.004.114-.007a12.754 12.754 0 002.29-.354c1.15-.196 2.152-.62 3.013-1.377.824-.725 1.38-1.619 1.69-2.664.217-.742.342-1.504.373-2.276.008-.21.012-.423.012-.634 0-.034 0-.066-.003-.1V6.97c0-.283-.003-.564-.013-.846zM12 2.93c2.16 0 3.91 1.75 3.91 3.91 0 .27-.03.534-.085.791l-7.65 4.456a3.912 3.912 0 01-.087-.791C8.088 4.68 9.84 2.93 12 2.93zM19.1 17.61L12 21.7l-7.1-4.09V8.79L12 4.7l7.1 4.09v8.82z"/></svg>
      Open in Apple Music
    </a>`;

  const embedUrl = appleUrl.replace('music.apple.com', 'embed.music.apple.com');
  container.innerHTML = `
    <iframe
      src="${embedUrl}"
      width="100%" height="150" frameBorder="0"
      allow="autoplay; encrypted-media; fullscreen; clipboard-write; picture-in-picture"
      class="apple-embed-iframe">
    </iframe>`;

  if (clipStart > 0) {
    const note = document.createElement('p');
    note.className = 'embed-clip-note';
    note.textContent = `▶ Seek to ${formatTime(clipStart)} in the Apple Music player above`;
    container.appendChild(note);
  }
}

function openPlayModal(key) {
  const memory = state.memories[key];
  if (!memory) return;

  try { destroyEmbed(); } catch (e) { console.error('destroyEmbed error:', e); }

  state.activeMemory = key;
  state.isPlaying = false;

  if (playerDate) playerDate.textContent = formatDisplayDate(key);
  if (playerTitleEl) playerTitleEl.textContent = memory.title || 'Untitled';
  if (playerNote) playerNote.textContent = memory.note || '';
  if (playerLabel) playerLabel.style.background = memory.color || '#e8d5b7';
  if (playerLabelText) playerLabelText.textContent = (memory.title || '').toUpperCase().slice(0, 12);

  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  }
  if (progressFill) progressFill.style.width = '0%';
  if (currentTimeEl) currentTimeEl.textContent = '0:00';
  if (totalTimeEl) totalTimeEl.textContent = '0:00';
  setPlayState(false);
  if (progressClipOverlay) progressClipOverlay.style.display = 'none';

  // Clip badge
  if (clipBadge && clipBadgeText) {
    if (memory.clipStart != null && memory.clipEnd != null) {
      clipBadgeText.textContent = `Favourite moment: ${formatTime(memory.clipStart)} – ${formatTime(memory.clipEnd)}`;
      clipBadge.style.display = 'inline-flex';
    } else {
      clipBadge.style.display = 'none';
    }
  }

  const ctrl = $('playerControls');
  if (memory.audioData) {
    if (audioPlayer) audioPlayer.src = memory.audioData;
    if (externalLinkArea) externalLinkArea.style.display = 'none';
    if (ctrl) ctrl.style.display = 'block';

  } else if (memory.link) {
    if (audioPlayer) audioPlayer.src = '';
    if (externalLinkArea) externalLinkArea.style.display = 'none';

    const isSpotify = memory.link.includes('spotify');
    const isYT = memory.link.includes('youtube') || memory.link.includes('youtu.be');
    const isApple = memory.link.includes('music.apple');
    const cs = memory.clipStart ?? 0;
    const ce = memory.clipEnd ?? null;

    if (isSpotify) {
      const id = extractSpotifyId(memory.link);
      if (id) setupSpotifyEmbed(id, cs, ce);
      else showToast('Could not parse Spotify track ID');
    } else if (isYT) {
      const id = extractYouTubeId(memory.link);
      if (id) setupYouTubeEmbed(id, cs, ce, memory.link);
      else showToast('Could not parse YouTube video ID');
    } else if (isApple) {
      setupAppleEmbed(memory.link, cs);
    } else {
      if (externalLinkArea) externalLinkArea.style.display = 'flex';
      if (externalLinkIcon) externalLinkIcon.innerHTML = '';
      if (externalLinkLabel) externalLinkLabel.textContent = 'Open Link';
      if (externalLinkBtn) externalLinkBtn.href = memory.link;
      if (ctrl) ctrl.style.display = 'none';
    }

  } else {
    // No audio and no link
    if (audioPlayer) audioPlayer.src = '';
    if (externalLinkArea) externalLinkArea.style.display = 'none';
    if (ctrl) ctrl.style.display = 'block';
  }

  if (playModal) playModal.classList.add('open');
}

function closePlayModal() {
  if (audioPlayer) audioPlayer.pause();
  try { destroyEmbed(); } catch (e) { }
  state.isPlaying = false;
  setPlayState(false);
  if (playModal) playModal.classList.remove('open');
  // Delay clearing activeMemory slightly to ensure deleteMemory can grab it if clicked simultaneously
  setTimeout(() => { state.activeMemory = null; }, 50);
}


// ── Play state helper (updates vinyl + tonearm) ─────────────────────────
const vinylPlayHint = document.getElementById('vinylPlayHint');

function setPlayState(playing) {
  state.isPlaying = playing;
  const hintIcon = vinylPlayHint ? vinylPlayHint.querySelector('.vinyl-hint-icon') : null;

  if (playing) {
    playerVinyl.classList.add('playing');
    playerVinyl.classList.remove('lifting');
    tonearm.classList.add('playing');
    playPauseBtn.innerHTML = '<span class="pp-icon">⏸</span>';
    playPauseBtn.classList.add('playing');
    if (hintIcon) hintIcon.textContent = '⏸';
  } else {
    playerVinyl.classList.remove('playing');
    playerVinyl.classList.add('lifting');
    tonearm.classList.remove('playing');
    playPauseBtn.innerHTML = '<span class="pp-icon">▶</span>';
    playPauseBtn.classList.remove('playing');
    if (hintIcon) hintIcon.textContent = '▶';
    setTimeout(() => playerVinyl.classList.remove('lifting'), 600);
  }
}

// Keyboard accessibility for vinyl
playerVinyl.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    togglePlayPause();
  }
});

// ── Tab switching ──────────────────────────────────────────────────────
function switchTab(name) {
  $$('.upload-tab').forEach(t => t.classList.remove('active'));
  $$('.tab-content').forEach(t => t.classList.remove('active'));
  const tabBtn = document.querySelector(`.upload-tab[data-tab="${name}"]`);
  const tabContent = $(`tabContent${name.charAt(0).toUpperCase() + name.slice(1)}`);
  if (tabBtn) tabBtn.classList.add('active');
  if (tabContent) tabContent.classList.add('active');
}

// ── Save memory ────────────────────────────────────────────────────────
async function saveMemory() {
  const key = state.activeDate;
  const title = songTitleInput.value.trim();
  const note = songNoteInput.value.trim();

  if (!title) {
    showToast('Please give this memory a title ♩');
    songTitleInput.focus();
    return;
  }

  const activeTab = document.querySelector('.upload-tab.active')?.dataset.tab;

  const memory = {
    title,
    note,
    color: state.selectedColor,
    savedAt: Date.now(),
    provider: activeTab,
    audioData: null,
    link: null,
    clipStart: null,
    clipEnd: null,
  };

  if (activeTab === 'file' && state.selectedFile) {
    try {
      memory.audioData = await readFileAsDataURL(state.selectedFile);
      if (state.fileDuration > 0) {
        memory.clipStart = (state.fileClipStart / 100) * state.fileDuration;
        memory.clipEnd = (state.fileClipEnd / 100) * state.fileDuration;
        if (memory.clipStart <= 0 && memory.clipEnd >= state.fileDuration - 0.5) {
          memory.clipStart = null;
          memory.clipEnd = null;
        }
      }
    } catch {
      showToast('Could not read the audio file.');
      return;
    }
  } else if (activeTab === 'spotify' && spotifyInput.value.trim()) {
    memory.link = spotifyInput.value.trim();
    memory.clipStart = mmssToSeconds(spotifyStartMin.value, spotifyStartSec.value);
    memory.clipEnd = mmssToSeconds(spotifyEndMin.value, spotifyEndSec.value);
    if (memory.clipEnd <= memory.clipStart) { memory.clipStart = null; memory.clipEnd = null; }
  } else if (activeTab === 'apple' && appleInput.value.trim()) {
    memory.link = appleInput.value.trim();
    memory.clipStart = mmssToSeconds(appleStartMin.value, appleStartSec.value);
    memory.clipEnd = mmssToSeconds(appleEndMin.value, appleEndSec.value);
    if (memory.clipEnd <= memory.clipStart) { memory.clipStart = null; memory.clipEnd = null; }
  } else if (activeTab === 'youtube' && youtubeInput.value.trim()) {
    memory.link = youtubeInput.value.trim();
    memory.clipStart = mmssToSeconds(ytStartMin.value, ytStartSec.value);
    memory.clipEnd = mmssToSeconds(ytEndMin.value, ytEndSec.value);
    if (memory.clipEnd <= memory.clipStart) { memory.clipStart = null; memory.clipEnd = null; }
  }

  state.memories[key] = memory;
  saveMemories();
  renderCalendar();
  closeAddModal();
  showToast('Memory pressed into wax ◎');
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Delete memory ──────────────────────────────────────────────────────
function deleteMemory() {
  const key = state.activeMemory;
  if (!key) return;
  if (!confirm('Remove this memory? This cannot be undone.')) return;
  try {
    delete state.memories[key];
    saveMemories();
    renderCalendar();
  } catch (e) {
    console.error('Delete error', e);
  }
  closePlayModal();
  showToast('Memory removed');
}

// ── Audio player ───────────────────────────────────────────────────────

// Click on vinyl disc itself → play/pause with arm animation
playerVinyl.addEventListener('click', () => {
  // Embedded player (Spotify / YouTube / Apple)
  if (_embedType === 'spotify' && _spotifyController) {
    _spotifyController.togglePlay();
    return;
  }
  if (_embedType === 'youtube' && _ytPlayer) {
    const S = window.YT?.PlayerState;
    if (state.isPlaying) {
      _ytPlayer.pauseVideo();
    } else {
      const memory = state.memories[state.activeMemory];
      if (memory?.clipStart != null) {
        const pos = _ytPlayer.getCurrentTime();
        if (pos < memory.clipStart - 0.5 || pos >= (memory.clipEnd ?? 99999) - 0.1) {
          _ytPlayer.seekTo(memory.clipStart, true);
        }
      }
      _ytPlayer.playVideo();
    }
    return;
  }
  if (_embedType === 'apple') {
    // Apple has no external JS API to trigger play automatically. 
    // Show a pulsing animation to direct their eyes to the player!
    const appleIframe = document.querySelector('.apple-embed-iframe');
    if (appleIframe) {
      appleIframe.style.outline = "2px solid #fc3c44";
      appleIframe.style.boxShadow = "0 0 15px rgba(252, 60, 68, 0.4)";
      setTimeout(() => {
        appleIframe.style.outline = "none";
        appleIframe.style.boxShadow = "none";
      }, 800);
    }

    if (!state.isPlaying) {
      onEmbedPlaying();
      showToast('Sign in to Apple Music first, then press Play inside the player ↓');
    } else {
      onEmbedPaused();
    }
    return;
  }

  // File-based memory — direct HTML audio play/pause
  if (audioPlayer.src && audioPlayer.src !== window.location.href) {
    togglePlayPause();
    return;
  }

  // No source at all
  playerVinyl.classList.add('vinyl-nudge');
  setTimeout(() => playerVinyl.classList.remove('vinyl-nudge'), 400);
  showToast('No audio source for this memory');
});

function togglePlayPause() {
  // Route through embedded player controls if active
  if (_embedType) {
    playerVinyl.click(); // Delegate to the vinyl click handler
    return;
  }

  const memory = state.memories[state.activeMemory];

  if (!audioPlayer.src || audioPlayer.src === window.location.href) {
    showToast('No audio source for this memory');
    return;
  }

  if (state.isPlaying) {
    audioPlayer.pause();
    setPlayState(false);
  } else {
    // Snap to clip start if outside range
    if (memory?.clipStart != null) {
      if (audioPlayer.currentTime < memory.clipStart - 0.5 ||
        audioPlayer.currentTime >= (memory.clipEnd ?? audioPlayer.duration) - 0.1) {
        audioPlayer.currentTime = memory.clipStart;
      }
    } else if (audioPlayer.currentTime >= audioPlayer.duration - 0.1) {
      audioPlayer.currentTime = 0;
    }

    // Arm swings in 300ms before audio starts — satisfying mechanical feel
    tonearm.classList.add('playing');
    setTimeout(() => {
      audioPlayer.play().then(() => {
        setPlayState(true);
      }).catch(() => {
        tonearm.classList.remove('playing');
        showToast('Cannot play this file');
      });
    }, 300);
  }
}

audioPlayer.addEventListener('ended', () => {
  setPlayState(false);
  progressFill.style.width = '0%';
  audioPlayer.currentTime = 0;
});

audioPlayer.addEventListener('timeupdate', () => {
  if (!audioPlayer.duration) return;
  const memory = state.memories[state.activeMemory];

  // Stop at clip end
  if (memory?.clipEnd != null && audioPlayer.currentTime >= memory.clipEnd) {
    audioPlayer.pause();
    setPlayState(false);
    // Reset to clip start for next play
    audioPlayer.currentTime = memory.clipStart ?? 0;
    progressFill.style.width = ((memory.clipStart ?? 0) / audioPlayer.duration * 100) + '%';
    currentTimeEl.textContent = formatTime(memory.clipStart ?? 0);
    return;
  }

  const pct = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  progressFill.style.width = pct + '%';
  currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
});

audioPlayer.addEventListener('loadedmetadata', () => {
  totalTimeEl.textContent = formatTime(audioPlayer.duration);

  const memory = state.memories[state.activeMemory];
  if (memory?.clipStart != null && memory?.clipEnd != null && audioPlayer.duration) {
    const startPct = (memory.clipStart / audioPlayer.duration) * 100;
    const endPct = (memory.clipEnd / audioPlayer.duration) * 100;
    progressClipOverlay.style.left = startPct + '%';
    progressClipOverlay.style.width = (endPct - startPct) + '%';
    progressClipOverlay.style.display = 'block';

    // Jump to clip start immediately
    audioPlayer.currentTime = memory.clipStart;
    progressFill.style.width = startPct + '%';
    currentTimeEl.textContent = formatTime(memory.clipStart);
  }
});

// Progress bar click
progressBg.addEventListener('click', e => {
  if (!audioPlayer.duration) return;
  const rect = progressBg.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  const newTime = pct * audioPlayer.duration;

  // Constrain to clip range if set
  const memory = state.memories[state.activeMemory];
  if (memory?.clipStart != null) {
    audioPlayer.currentTime = Math.max(memory.clipStart, Math.min(memory.clipEnd ?? audioPlayer.duration, newTime));
  } else {
    audioPlayer.currentTime = newTime;
  }
});

let muted = false;
muteBtn.addEventListener('click', () => {
  muted = !muted;
  audioPlayer.muted = muted;
  muteBtn.textContent = muted ? '🔇' : '♪';
  muteBtn.style.color = muted ? '#c07070' : '';
});

restartBtn.addEventListener('click', () => {
  const memory = state.memories[state.activeMemory];
  audioPlayer.currentTime = memory?.clipStart ?? 0;
  if (!state.isPlaying) togglePlayPause();
});

// ── File Waveform & Clip ─────────────────────────────────────────────-
function generateWaveformBars(count = 48) {
  fileWaveformBars.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const bar = document.createElement('div');
    bar.className = 'waveform-bar';
    const h = 20 + Math.abs(Math.sin(i * 1.3 + 2) * 55) + Math.abs(Math.sin(i * 0.7) * 25);
    bar.style.height = h + '%';
    fileWaveformBars.appendChild(bar);
  }
}

function updateFileClipUI() {
  const start = parseFloat(fileStartHandle.value);
  const end = parseFloat(fileEndHandle.value);
  const dur = state.fileDuration;

  fileClipSelection.style.left = start + '%';
  fileClipSelection.style.width = (end - start) + '%';

  const bars = fileWaveformBars.querySelectorAll('.waveform-bar');
  bars.forEach((bar, i) => {
    const pct = (i / bars.length) * 100;
    bar.classList.toggle('in-clip', pct >= start && pct <= end);
  });

  if (dur > 0) {
    const startSec = (start / 100) * dur;
    const endSec = (end / 100) * dur;
    fileClipStartLabel.textContent = formatTime(startSec);
    fileClipEndLabel.textContent = formatTime(endSec);
    const clipDur = endSec - startSec;
    fileClipDuration.textContent =
      (start <= 0 && end >= 99.5) ? 'full song' : formatTime(clipDur);
  }

  state.fileClipStart = start;
  state.fileClipEnd = end;
}

fileStartHandle.addEventListener('input', () => {
  const s = parseFloat(fileStartHandle.value);
  const e = parseFloat(fileEndHandle.value);
  if (s >= e - 2) fileStartHandle.value = e - 2;
  fileStartHandle.style.zIndex = '4';
  fileEndHandle.style.zIndex = '3';
  updateFileClipUI();
});

fileEndHandle.addEventListener('input', () => {
  const s = parseFloat(fileStartHandle.value);
  const e = parseFloat(fileEndHandle.value);
  if (e <= s + 2) fileEndHandle.value = s + 2;
  fileStartHandle.style.zIndex = '3';
  fileEndHandle.style.zIndex = '4';
  updateFileClipUI();
});

// ── External clip info ─────────────────────────────────────────────────
function updateExternalClipInfo(provider) {
  let startMin, startSec, endMin, endSec, infoEl;
  if (provider === 'spotify') {
    startMin = spotifyStartMin; startSec = spotifyStartSec;
    endMin = spotifyEndMin; endSec = spotifyEndSec;
    infoEl = spotifyClipInfo;
  } else if (provider === 'apple') {
    startMin = appleStartMin; startSec = appleStartSec;
    endMin = appleEndMin; endSec = appleEndSec;
    infoEl = appleClipInfo;
  } else {
    startMin = ytStartMin; startSec = ytStartSec;
    endMin = ytEndMin; endSec = ytEndSec;
    infoEl = youtubeClipInfo;
  }

  const start = mmssToSeconds(startMin.value, startSec.value);
  const end = mmssToSeconds(endMin.value, endSec.value);
  const dur = end - start;

  if (dur <= 0) {
    infoEl.textContent = 'End time must be after start time';
    infoEl.style.color = '#c07070';
  } else {
    infoEl.textContent = `Saving ${formatTime(dur)} of the track (${formatTime(start)} – ${formatTime(end)})`;
    infoEl.style.color = '';
  }
}

['spotifyStartMin', 'spotifyStartSec', 'spotifyEndMin', 'spotifyEndSec'].forEach(id => {
  $(id).addEventListener('input', () => updateExternalClipInfo('spotify'));
});
['appleStartMin', 'appleStartSec', 'appleEndMin', 'appleEndSec'].forEach(id => {
  $(id).addEventListener('input', () => updateExternalClipInfo('apple'));
});
['ytStartMin', 'ytStartSec', 'ytEndMin', 'ytEndSec'].forEach(id => {
  $(id).addEventListener('input', () => updateExternalClipInfo('youtube'));
});

// ── File handling ────────────────────────────────────────────────────-
fileDropZone.addEventListener('dragover', e => {
  e.preventDefault();
  fileDropZone.classList.add('drag-over');
});

fileDropZone.addEventListener('dragleave', () => {
  fileDropZone.classList.remove('drag-over');
});

fileDropZone.addEventListener('drop', e => {
  e.preventDefault();
  fileDropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('audio/')) setFile(file);
  else showToast('Please drop an audio file ♩');
});

fileDropZone.addEventListener('click', () => audioFileInput.click());

audioFileInput.addEventListener('change', () => {
  const file = audioFileInput.files[0];
  if (file) setFile(file);
});

function setFile(file) {
  state.selectedFile = file;
  fileNameEl.textContent = file.name;
  fileDropZone.style.display = 'none';
  fileSelected.style.display = 'flex';
  fileClipSection.style.display = 'block';
  generateWaveformBars();
  fileStartHandle.value = 0;
  fileEndHandle.value = 100;

  const tempAudio = new Audio();
  const objURL = URL.createObjectURL(file);
  tempAudio.src = objURL;
  tempAudio.addEventListener('loadedmetadata', () => {
    state.fileDuration = tempAudio.duration;
    updateFileClipUI();
    URL.revokeObjectURL(objURL);
  });
}

fileRemoveBtn.addEventListener('click', () => {
  state.selectedFile = null;
  state.fileDuration = 0;
  audioFileInput.value = '';
  fileDropZone.style.display = 'flex';
  fileSelected.style.display = 'none';
  fileClipSection.style.display = 'none';
});

// ── Color selection ────────────────────────────────────────────────────
colorSwatches.addEventListener('click', e => {
  const swatch = e.target.closest('.swatch');
  if (!swatch) return;
  $$('.swatch').forEach(s => s.classList.remove('active'));
  swatch.classList.add('active');
  state.selectedColor = swatch.dataset.color;
  vpLabel.style.background = state.selectedColor;
});

// ── Tab buttons ────────────────────────────────────────────────────────
$$('.upload-tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── Nav buttons ────────────────────────────────────────────────────────
$('prevMonthBtn').addEventListener('click', () => {
  state.currentMonth--;
  if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
  renderCalendar();
});

$('nextMonthBtn').addEventListener('click', () => {
  state.currentMonth++;
  if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
  renderCalendar();
});

// ── Modal close ────────────────────────────────────────────────────────
addModalClose.addEventListener('click', closeAddModal);
playModalClose.addEventListener('click', closePlayModal);
saveMemoryBtn.addEventListener('click', saveMemory);
playPauseBtn.addEventListener('click', togglePlayPause);
deleteMemoryBtn.addEventListener('click', deleteMemory);

addModal.addEventListener('click', e => { if (e.target === addModal) closeAddModal(); });
playModal.addEventListener('click', e => { if (e.target === playModal) closePlayModal(); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (addModal.classList.contains('open')) closeAddModal();
    if (playModal.classList.contains('open')) closePlayModal();
  }
  if (e.key === ' ' && playModal.classList.contains('open')) {
    e.preventDefault();
    togglePlayPause();
  }
});

// ── Toast ─────────────────────────────────────────────────────────────
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── Init ───────────────────────────────────────────────────────────────
initAuth();
