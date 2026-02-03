import { db, auth, authReady } from "./firebase-init.js";

import {
  doc,
  getDocFromServer,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* =====================================================
   CANVAS + DPR SETUP (LOCKED)
===================================================== */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let DPR = 1;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 2);

  // internal resolution
  canvas.width = Math.round(rect.width * DPR);
  canvas.height = Math.round(rect.height * DPR);

  // draw in CSS-pixel coordinates
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // resize-dependent visuals
  initBackground();
}

function gameWidth()  { return canvas.width / DPR; }
function gameHeight() { return canvas.height / DPR; }

let stars = [];
let snow = [];
let shootingStars = [];

const player = {
  x: 80,
  y: 200,
  w: 48,
  h: 48,
  vy: 0
};

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* =====================================================
   PLAY BUTTON
===================================================== */
const overlay = document.getElementById("playerOverlay");
const playBtn = document.getElementById("playBtn");

let hasPlayer = false;

/* =====================================================
   GAME STATE
===================================================== */
let started = false;
let gameOver = false;

let score = 0;
let bestScore = Number(localStorage.getItem("bestScore") || 0);
let runStartBest = bestScore;

let lastSpeedLevel = 0;

let obstacles = [];
let spawnX = 0;

let mountainX = 0;
let steamX = 0;

let hopSteam = [];
let squash = 1;
let squashSpeed = 0;

let banner = null;
let lastRankShown = null;

let deathFade = 0;
let submittedThisDeath = false;

/* =====================================================
   RANKS (LOCKED)
===================================================== */
const RANKS = [
  { score: 25,   name: "Steam Hopper" },
  { score: 50,   name: "Onsen Ace" },
  { score: 75,   name: "Steam Master" },
  { score: 100,  name: "Onsen Overlord" },
  { score: 250,  name: "King of the Onsen" },
  { score: 500,  name: "Onsen Legend" },
  { score: 1000, name: "Onsen God" }
];

function getRankForScore(score) {
  let best = null;
  for (const r of RANKS) {
    if (score >= r.score) best = r.name;
  }
  return best;
}

/* =====================================================
   TITLE OVERLAY CONTROL
===================================================== */
function showOverlayOnLoad() {
  hasPlayer = false;
  started = false;
  gameOver = false;

  score = 0;
  obstacles = [];
  spawnX = 0;

  player.vy = 0;
  player.y = 200;

  overlay.classList.remove("hidden");
}

showOverlayOnLoad();

playBtn.addEventListener("click", () => {
  runStartBest = bestScore;

  hasPlayer = true;
  overlay.classList.add("hidden");

  player.vy = 0;
  player.y = 200;
});


/* =====================================================
   GAME CONSTANTS (LOCKED)
===================================================== */
const GRAVITY = 0.55;
const JUMP = -8;
const GAP = 150;
let SPEED = 2.5;
const SPAWN_DISTANCE = 270;

const OB_W = 80;

/* =====================================================
   ASSETS
===================================================== */
const kokkyImg = new Image(); kokkyImg.src = "kokky.png";
const bambooImg = new Image(); bambooImg.src = "bamboo.png";   // NEW
const mountainsImg = new Image(); mountainsImg.src = "mountains.png";
const steamImg = new Image();     steamImg.src     = "steam.png";

/* =====================================================
   BACKGROUND (stars + snow) init (size dependent)
===================================================== */

function initBackground() {
  const W = gameWidth();
  const H = gameHeight();

// twinkling stars (visible but calm)
stars = Array.from({ length: 35 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H * 0.6,
  r: Math.random() * 1.6 + 0.8,
  c: Math.random() < 0.65 ? "#ffd966" : "#ffffff",

  baseAlpha: Math.random() * 0.45 + 0.35,
  phase: Math.random() * Math.PI * 2,
  twinkleSpeed: Math.random() * 0.02 + 0.006
}));

  // layered snow
snow = Array.from({ length: 45 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,

  r: Math.random() * 2.5 + 0.8,      // size variation
  vy: Math.random() * 0.4 + 0.3,     // fall speed
  vx: Math.random() * 0.3 - 0.15,    // wind drift

  alpha: Math.random() * 0.5 + 0.4,  // softness
  sway: Math.random() * Math.PI * 2, // side-to-side motion
  swaySpeed: Math.random() * 0.01 + 0.005
}));

  // keep player in bounds after resize
  player.y = Math.min(Math.max(player.y, 0), H - player.h);
}
initBackground();

/* =====================================================
   INPUT
===================================================== */
function doJump() {
  // must pick player first
  if (!hasPlayer) return;

  // first jump starts the game
  if (!started) {
    started = true;
    spawnX = gameWidth() + OB_W + 40;
  }

  // restart after game over
  if (gameOver) {
    resetGame();
    started = true;
    spawnX = gameWidth() + OB_W + 40;
  }

  player.vy = JUMP;

  // hop steam near foot
  hopSteam.push({
    x: player.x + player.w * 0.55,
    y: player.y + player.h - 3,
    life: 14
  });

   // trigger hop squash
squash = 0.88;
squashSpeed = 0.04;
   
}

window.addEventListener("keydown", e => {
  if (e.code === "Space") doJump();
});

// Mouse click (desktop)
canvas.addEventListener("mousedown", e => {
  e.preventDefault();
  doJump();
});

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  doJump();
}, { passive: false });

/* =====================================================
   HELPERS
===================================================== */
function resetGame() {
  player.y = 200;
  player.vy = 0;
  obstacles = [];
  score = 0;
  started = false;
  gameOver = false;
SPEED = 2.5;
lastSpeedLevel = 0;
deathFade = 0;
submittedThisDeath = false;

   lastRankShown = null;

     // ✨ NEW SKY EVERY GAME
  initBackground();
}

function spawnObstacle() {
  const W = gameWidth();
  const H = gameHeight();

const minY = 80;                 // allow higher gaps
const maxY = H - GAP - 180;      // allow lower gaps

let gapY = Math.random() * (maxY - minY) + minY;

// sometimes force extreme top/bottom gaps
if (Math.random() < 0.25) {
  if (Math.random() < 0.5) {
    gapY = minY + Math.random() * 40;           // near top
  } else {
    gapY = maxY - Math.random() * 40;           // near bottom
  }
}


  obstacles.push({
    x: spawnX,
    gapY,
    passed: false
  });

  spawnX += SPAWN_DISTANCE;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/* =====================================================
   DRAW: SKY + MOON (your code)
===================================================== */
function drawSkyAndMoon() {
  const W = gameWidth();
  const H = gameHeight();

  // gradient sky
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0A1633");
  grad.addColorStop(1, "#000814");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

// stars (static, calm – no twinkle, no glow)
for (const s of stars) {
  ctx.globalAlpha = s.baseAlpha;
  ctx.fillStyle = s.c;

  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
  ctx.fill();
}
ctx.globalAlpha = 1;

  // moon with warm color + slight texture (YOUR CODE)
  ctx.save();
  const moonX = W - 80;
  const moonY = 80;
  const moonR = 26;
  const moonGrad = ctx.createRadialGradient(
    moonX-8, moonY-8, 4,
    moonX, moonY, moonR+6
  );
  moonGrad.addColorStop(0, "#fff9d9");
  moonGrad.addColorStop(1, "#bba86a");
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI*2);
  ctx.fill();

  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#d8c78a";
  ctx.beginPath();
  ctx.arc(moonX-8, moonY-6, 6, 0, Math.PI*2);
  ctx.arc(moonX+5, moonY+4, 4, 0, Math.PI*2);
  ctx.arc(moonX+10, moonY-10, 3, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // soft snow
for (const f of snow) {
  ctx.save();

  ctx.globalAlpha = f.alpha;
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.ellipse(
    f.x,
    f.y,
    f.r,
    f.r * 0.7,   // slightly oval = snowflake feel
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.restore();
}
}

/* =====================================================
   DRAW: MOUNTAINS + STEAM
===================================================== */
function drawMountainsAndSteam() {
  const W = gameWidth();
  const H = gameHeight();

  // --- TUNING (only change these later) ---
  const MOUNTAIN_H = 160;
  const MOUNTAIN_Y = H - 240;   // a bit higher than before

  const STEAM_DRAW_H = 180;     // baseline (try 160–220)
  const STEAM_ALPHA  = 0.65;    // baseline (0.55–0.75)
  const STEAM_OVERLAP = 18;     // overlap mountains a bit (10–30)
  // ---------------------------------------

  // mountains (background)
  ctx.drawImage(mountainsImg, mountainX,     MOUNTAIN_Y, W, MOUNTAIN_H);
  ctx.drawImage(mountainsImg, mountainX + W, MOUNTAIN_Y, W, MOUNTAIN_H);

  // steam/onsen (foreground) - tile using real width
  ctx.globalAlpha = STEAM_ALPHA;

  const scale = STEAM_DRAW_H / steamImg.height;
  const tileW = steamImg.width * scale;

  // anchor to bottom, then lift a bit to overlap mountains
  const steamY = H - STEAM_DRAW_H;

  let startX = steamX % tileW;
  if (startX > 0) startX -= tileW;

  for (let x = startX; x < W + tileW; x += tileW) {
    ctx.drawImage(steamImg, x, steamY, tileW, STEAM_DRAW_H);
  }

  ctx.globalAlpha = 1;
}

/* =====================================================
   DRAW: OBSTACLES
===================================================== */
function drawObstacle(obs) {
  const H = gameHeight();

  // top
  ctx.drawImage(bambooImg, obs.x, 0, OB_W, obs.gapY);

  // bottom
  ctx.drawImage(
    bambooImg,
    obs.x,
    obs.gapY + GAP,
    OB_W,
    H - (obs.gapY + GAP)
  );
}

function checkRankUnlock() {
  let currentRank = null;

  // find the highest rank the score qualifies for
  for (const r of RANKS) {
    if (score >= r.score) {
      currentRank = r;
    }
  }

  // no rank unlocked yet
  if (!currentRank) return;

  // already shown this rank during this run
  if (lastRankShown === currentRank.score) return;

  // trigger banner ONCE
  lastRankShown = currentRank.score;

  banner = {
    text: currentRank.name,
    y: -60,
    life: 120,   // ~2 seconds
    alpha: 1,
    sparkles: createBannerSparkles()
  };
}

/* =====================================================
   BANNER SPARKLE HELPER
===================================================== */
function createBannerSparkles(count = 12) {
  return Array.from({ length: count }, () => ({
    x: Math.random(),          // 0–1 (relative position)
    y: Math.random(),
    r: Math.random() * 1.5 + 0.5,
    alpha: Math.random() * 0.4 + 0.4,
    pulse: Math.random() * Math.PI * 2
  }));
}

/* =====================================================
   MAIN LOOP
===================================================== */
function loop() {
   // ===== ALWAYS UPDATE TOP UI =====
document.getElementById("scoreValue").textContent = score;
document.getElementById("bestValue").textContent = bestScore;

  // Stop game simulation until player is chosen
  if (!hasPlayer) {
    ctx.clearRect(0, 0, gameWidth(), gameHeight());
    requestAnimationFrame(loop);
    return;
  }

  const W = gameWidth();
  const H = gameHeight();

// ================= BACKGROUND =================
drawSkyAndMoon();
drawMountainsAndSteam();

 // update snow (always active)
for (const f of snow) {
  f.sway += f.swaySpeed;

  f.x += f.vx + Math.sin(f.sway) * 0.2;
  f.y += f.vy;

  if (f.y > H + 10) {
    f.y = -10;
    f.x = Math.random() * W;
  }
}

   // ================= SHOOTING STARS =================
if (Math.random() < 0.001) { // rarity control
  spawnShootingStar();
}

shootingStars.forEach(s => {
  s.x += s.vx;
  s.y += s.vy;
  s.life--;

  ctx.save();
  ctx.globalAlpha = Math.min(s.life / 20, 1);

  // glow trail
  ctx.strokeStyle = "#fff2b0";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#ffd966";
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x - s.vx * 3, s.y - s.vy * 3);
  ctx.stroke();

  ctx.restore();
});

// remove dead stars
shootingStars = shootingStars.filter(s => s.life > 0);

// ================= PARALLAX =================
if (!gameOver) {
  mountainX -= 0.15;
  if (mountainX <= -W) mountainX = 0;

  // MUST match STEAM_DRAW_H in drawMountainsAndSteam()
  const STEAM_DRAW_H = 180;
  const scale = STEAM_DRAW_H / steamImg.height;
  const tileW = steamImg.width * scale;

  steamX -= 0.15;
  if (steamX <= -tileW) steamX += tileW;
}

  // ================= PHYSICS =================
  if (hasPlayer && !gameOver) {
    player.vy += GRAVITY;
    player.y += player.vy;
  }

// ================= OBSTACLES =================
if (started && !gameOver) {
  if (
    obstacles.length === 0 ||
    spawnX - obstacles[obstacles.length - 1].x >= SPAWN_DISTANCE
  ) {
    spawnObstacle();
  }
}

for (const obs of obstacles) {
  if (!gameOver) obs.x -= SPEED;

  drawObstacle(obs);

  // ===== scoring =====
  if (!obs.passed && obs.x + OB_W < player.x) {
    obs.passed = true;
    score++;
    checkRankUnlock();

    // speed increase every 50 points, cap at 3.5
    const speedLevel = Math.floor(score / 50);

    if (speedLevel > lastSpeedLevel && SPEED < 3.5) {
      SPEED = Math.min(2.5 + speedLevel * 0.1, 3.5);
      lastSpeedLevel = speedLevel;
    }

    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem("bestScore", String(bestScore));
    }
  }

  // ===== collision =====
  const hitBox = {
    x: player.x + 6,
    y: player.y + 6,
    w: player.w - 12,
    h: player.h - 12
  };

  const inX =
    hitBox.x < obs.x + OB_W &&
    hitBox.x + hitBox.w > obs.x;

  if (!gameOver && inX) {
    const hitsTop = hitBox.y < obs.gapY;
    const hitsBottom =
      hitBox.y + hitBox.h > obs.gapY + GAP;

    if (hitsTop || hitsBottom) {
      gameOver = true;

if (score > runStartBest && !submittedThisDeath) {
  submittedThisDeath = true;
  askName3().then(name3 => {
    saveBestOnlinePublic(name3, score);
  });
}

    }
  }
}

// remove obstacles that are far off-screen (prevents lag)
obstacles = obstacles.filter(o => o.x > -OB_W - 100);

// ================= FLOOR / CEILING =================
if (!gameOver && hasPlayer) {
  if (player.y < 0 || player.y + player.h > H) {
    gameOver = true;

if (score > runStartBest && !submittedThisDeath) {
  submittedThisDeath = true;
  askName3().then(name3 => {
    saveBestOnlinePublic(name3, score);
  });
}

  }
}

// ================= DEATH FADE =================
if (gameOver && deathFade < 0.5) {
  deathFade += 0.01;
}

  // ================= HOP STEAM =================
  hopSteam.forEach(p => {
    ctx.fillStyle = `rgba(255,255,255,${p.life / 24})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    p.life--;
  });
  hopSteam = hopSteam.filter(p => p.life > 0);

   // recover squash back to normal
if (squash < 1) {
  squash += squashSpeed;
  if (squash > 1) squash = 1;
}

  // ================= PLAYER =================
ctx.save();

const drawW = player.w;
const drawH = player.h * squash;

// keep feet in same place
const offsetY = player.h - drawH;

ctx.drawImage(
  kokkyImg,
  player.x,
  player.y + offsetY,
  drawW,
  drawH
);

ctx.restore();


  // ================= BANNER =================
   
drawBanner();   

  // ================= DEATH FADE =================
  if (deathFade > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${deathFade})`;
    ctx.fillRect(0, 0, gameWidth(), gameHeight());
    ctx.restore();
  }

  requestAnimationFrame(loop);
}

/* =====================================================
   3-CHAR NAME PROMPT
===================================================== */
function askName3() {
  return new Promise(resolve => {
    const modal = document.getElementById("nameModal");
    const input = document.getElementById("nameInput");
    const saveBtn = document.getElementById("nameSaveBtn");
    const err = document.getElementById("nameError");

    modal.classList.remove("hidden");
    err.classList.add("hidden");
    input.value = "";
    input.focus();

    function clean(s) {
      return (s || "").toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
    }

    function validateAndSave() {
      const name = clean(input.value);

      if (!/^[A-Z0-9]{3}$/.test(name)) {
        err.classList.remove("hidden");
        input.focus();
        input.select();
        return; // DO NOT CLOSE
      }

      // success
      modal.classList.add("hidden");
      err.classList.add("hidden");

      // remove listeners to avoid duplicates
      saveBtn.onclick = null;
      input.oninput = null;
      input.onkeydown = null;

      resolve(name);
    }

    // live cleanup while typing (keeps it 0-3 chars, A-Z/0-9 only)
    input.oninput = () => {
      const cleaned = clean(input.value).slice(0, 3);
      if (input.value !== cleaned) input.value = cleaned;
      if (!err.classList.contains("hidden")) err.classList.add("hidden");
    };

    // Enter submits
    input.onkeydown = (e) => {
      if (e.key === "Enter") validateAndSave();
    };

    // Save button submits
    saveBtn.onclick = validateAndSave;
  });
}

/* =====================================================
   PUBLIC DEVICE KEY
===================================================== */
let publicKey = localStorage.getItem("publicKey");
if (!publicKey) {
  publicKey = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
  localStorage.setItem("publicKey", publicKey);
}

/* =====================================================
   ONLINE SAVE (PUBLIC MODE)
===================================================== */
async function saveBestOnlinePublic(name3, scoreValue) {
  try {
    await authReady;
    if (!auth.currentUser) throw new Error("No auth user; cannot write to scores_public.");

    const ref = doc(db, "scores_public", publicKey);
    const snap = await getDocFromServer(ref);
    const prev = snap.exists() ? (snap.data().score || 0) : 0;

    // only update if improved
    if (scoreValue <= prev) return;

    await setDoc(ref, {
      name: name3,
      score: scoreValue,
      updatedAt: Date.now()
    }, { merge: true });

    // TEMP: confirm success on iPhone
    alert(`✅ Online save OK: ${name3} ${scoreValue}`);

  } catch (err) {
    console.error("saveBestOnlinePublic error:", err);

    // TEMP: show real failure reason on iPhone
    alert(`❌ Online save FAILED: ${err.message || err}`);
  }
}

loop();

/* =====================================================
   DRAW: RANK BANNER (CARD STYLE – POLISHED)
===================================================== */
function drawBanner() {
  if (!banner) return;

  const W = gameWidth();

  // target position (near moon height)
  const targetY = 40;

  // slide down gently
  if (banner.y < targetY) {
    banner.y += 2.5;
  }

  // fade out (~35 frames)
  if (banner.life < 35) {
  banner.alpha = banner.life / 35;
}

  const cardW = 220;
  const cardH = 64;
  const x = (W - cardW) / 2;
  const y = banner.y;

  ctx.save();
  ctx.globalAlpha = banner.alpha ?? 1;

  /* === SOFT GOLD GLOW === */
  ctx.shadowColor = "rgba(245, 215, 110, 0.6)";
  ctx.shadowBlur = 0;

  /* === GOLD GRADIENT CARD === */
  const grad = ctx.createLinearGradient(
    x,
    y,
    x,
    y + cardH
  );
  grad.addColorStop(0, "#fff2b0");
  grad.addColorStop(1, "#d6a94d");

  ctx.fillStyle = grad;
  roundRect(ctx, x, y, cardW, cardH, 14);
  ctx.fill();

  // remove glow for text & sparkles
  ctx.shadowBlur = 0;

  /* === TEXT === */
  ctx.fillStyle = "#0A1633"; // navy (sky color)
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "18px Handjet";
ctx.fillText("Rank Up", W / 2, y + 26);

ctx.font = "24px Handjet";
ctx.fillText(banner.text, W / 2, y + 46);


// === STATIC SPARKLES (removed shimmer) ===
banner.sparkles.forEach(s => {
  ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
  ctx.beginPath();
  ctx.arc(
    x + s.x * cardW,
    y + s.y * cardH,
    s.r,
    0,
    Math.PI * 2
  );
  ctx.fill();
});

  ctx.restore();

  banner.life--;
  if (banner.life <= 0) banner = null;
}

/* =====================================================
   HELPER: ROUNDED RECTANGLE
===================================================== */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* =====================================================
   HELPER: SHOOTING STARS
===================================================== */
function spawnShootingStar() {
  const W = gameWidth();
  const H = gameHeight();

  shootingStars.push({
    x: Math.random() * W * 0.8,
    y: Math.random() * H * 0.4,
    vx: Math.random() * 4 + 3,
    vy: Math.random() * 2 + 1,
    life: 40 + Math.random() * 20
  });
}

