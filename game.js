/* =====================================================
   CANVAS + DPR SETUP (LOCKED)
===================================================== */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let DPR = 1;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  DPR = window.devicePixelRatio || 1;

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
   PLAYER SELECT OVERLAY (LOCKED)
===================================================== */
const overlay = document.getElementById("playerOverlay");
const teamButtons = document.querySelectorAll(".teamBtn");
const idSection = document.getElementById("idSection");
const idList = document.getElementById("idList");
const preview = document.getElementById("playerPreview");
const playBtn = document.getElementById("playBtn");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const playerIdLabel = document.getElementById("playerIdLabel");
const changePlayerBtn = document.getElementById("changePlayerBtn");

// restore player label on reload
const savedPlayer = localStorage.getItem("playerId");
if (savedPlayer) {
  playerIdLabel.textContent = "Player: " + savedPlayer;
}

let selectedTeam = null;
let selectedId = null;
let hasPlayer = false;

const TEAM_IDS = {
  W: ["5","8","9","18","19","22","28","29","30","34","A","B"],
  R: ["1","4","6","7","11","13","20","21","27","31","40","A","B"],
  G: ["10","12","14","23","24","26","35","36","37","39","A","B"],
  B: ["2","3","15","16","17","25","32","33","38","41","A","B"],
  Guest: ["0"],
  Admin: ["G","S"]
};

/* =====================================================
   GAME STATE
===================================================== */
let started = false;
let gameOver = false;

let score = 0;
let bestScore = 0;

let obstacles = [];
let spawnX = 0;

let mountainX = 0;
let steamX = 0;

let hopSteam = [];

let banner = null;
let lastRankShown = null;

/* ===== PLAYER SETTER ===== */
function setPlayer(playerId) {
  localStorage.setItem("playerId", playerId);
  playerIdLabel.textContent = "Player: " + playerId;

// load best score
  const savedBoard = JSON.parse(localStorage.getItem("scoreboard") || "[]");
  const entry = savedBoard.find(e => e.id === playerId);
  bestScore = entry ? entry.score : 0;

}

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
   PLAYER SELECT OVERLAY CONTROL
===================================================== */
function showOverlayOnLoad() {
  // Always force player selection on page load
  hasPlayer = false;
  started = false;
  gameOver = false;

  // HARD RESET GAME STATE
  score = 0;
  obstacles = [];
  spawnX = 0;

  player.vy = 0;
  player.y = 200;

  overlay.classList.remove("hidden");

  // reset overlay UI
  preview.textContent = "";
  playBtn.classList.add("hidden");
}

// Run once on page load
showOverlayOnLoad();



teamButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    teamButtons.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");

    selectedTeam = btn.dataset.team;
    selectedId = null;

    preview.textContent = "";
    playBtn.classList.add("hidden");

    idList.innerHTML = "";
    idSection.classList.remove("hidden");

    TEAM_IDS[selectedTeam].forEach(id => {
      const b = document.createElement("button");

      // label rules
      if (selectedTeam === "Guest") b.textContent = "Guest";
      else if (id === "A" || id === "B") b.textContent = `${id} (ALT)`;
      else b.textContent = id;

      b.addEventListener("click", () => {
        [...idList.children].forEach(x => x.classList.remove("selected"));
        b.classList.add("selected");

        selectedId = id;
        if (selectedTeam === "Guest") {
  preview.textContent = "Guest";
} else if (id === "A" || id === "B") {
  preview.textContent = `${selectedTeam}-${id} (ALT)`;
} else {
  preview.textContent = `${selectedTeam}-${id}`;
}
        playBtn.classList.remove("hidden");
      });

      idList.appendChild(b);
    });
  });
});

playBtn.addEventListener("click", () => {
  let pid;

  if (selectedTeam === "Guest") {
    pid = "Guest";
  } else if (selectedId === "A" || selectedId === "B") {
    pid = `${selectedTeam}-${selectedId} (ALT)`;
  } else {
    pid = `${selectedTeam}-${selectedId}`;
  }

  setPlayer(pid);      // ✅ ONLY place that saves + updates label
  hasPlayer = true;

  player.vy = 0;
  player.y = 200;

  overlay.classList.add("hidden");
});


/* =====================================================
   CHANGE BUTTON
===================================================== */
changePlayerBtn.addEventListener("click", () => {
  // show overlay
  overlay.classList.remove("hidden");

  // HARD RESET GAME STATE
  hasPlayer = false;
  started = false;
  gameOver = false;

  score = 0;
  player.vy = 0;
  player.y = 200;

  obstacles = [];
  spawnX = 0;

  // reset overlay UI
  preview.textContent = "";
  playBtn.classList.add("hidden");
});

/* =====================================================
   GAME CONSTANTS (LOCKED)
===================================================== */
const GRAVITY = 0.5;
const JUMP = -8;
const GAP = 170;
const SPEED = 2.5;
const SPAWN_DISTANCE = 270;

const OB_W = 70;

/* =====================================================
   ASSETS (LOCKED filenames)
===================================================== */
const kokkyImg = new Image(); kokkyImg.src = "kokky.png";
const woodImg = new Image(); woodImg.src = "wood.png";
const mountainsImg = new Image(); mountainsImg.src = "mountains.png";
const steamImg = new Image(); steamImg.src = "steam.png";

let woodPattern = null;
woodImg.onload = () => {
  woodPattern = ctx.createPattern(woodImg, "repeat");
};

/* =====================================================
   BACKGROUND (stars + snow) init (size dependent)
===================================================== */

function initBackground() {
  const W = gameWidth();
  const H = gameHeight();

// twinkling stars (visible but calm)
stars = Array.from({ length: 70 }, () => ({
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

   lastRankShown = null;

     // ✨ NEW SKY EVERY GAME
  initBackground();
}

function spawnObstacle() {
  const W = gameWidth();
  const H = gameHeight();

  const minY = 120;
  const maxY = H - GAP - 220;
  const gapY = Math.random() * (maxY - minY) + minY;

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

// stars (twinkling with glow – magical)
for (const s of stars) {
  s.phase += s.twinkleSpeed;

  const alpha =
    s.baseAlpha + Math.sin(s.phase) * 0.4; // stronger shimmer

  ctx.save();
  ctx.globalAlpha = alpha;

  // stronger, softer glow
  ctx.shadowColor = s.c;
  ctx.shadowBlur = 10;

  ctx.fillStyle = s.c;
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

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
  ctx.shadowColor = "rgba(255,255,255,0.6)";
  ctx.shadowBlur = f.r * 2;

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

  // farther mountains (smaller + lower)
  const mountainH = 160;
  const mountainY = H - 260; // leaves room for steam layer

  ctx.drawImage(mountainsImg, mountainX, mountainY, W, mountainH);
  ctx.drawImage(mountainsImg, mountainX + W, mountainY, W, mountainH);

  // bottom steam
  ctx.globalAlpha = 0.55;
  const steamY = H - 120;
  ctx.drawImage(steamImg, steamX, steamY);
  ctx.drawImage(steamImg, steamX + W, steamY);
  ctx.globalAlpha = 1;
}

/* =====================================================
   DRAW: OBSTACLES (tiled texture, not stretched)
===================================================== */
function drawObstacle(obs) {
  const H = gameHeight();

  if (woodPattern) {
    ctx.save();
    ctx.fillStyle = woodPattern;

    // top
    ctx.translate(obs.x, 0);
    ctx.fillRect(0, 0, OB_W, obs.gapY);

    // bottom
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // restore DPR transform
    ctx.translate(obs.x, obs.gapY + GAP);
    ctx.fillRect(0, 0, OB_W, H - (obs.gapY + GAP));

    ctx.restore();
  } else {
    // fallback until wood loads
    ctx.drawImage(woodImg, obs.x, 0, OB_W, obs.gapY);
    ctx.drawImage(woodImg, obs.x, obs.gapY + GAP, OB_W, H - (obs.gapY + GAP));
  }
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
    life: 180,   // ~3 seconds
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
console.log("loop running", hasPlayer, score);
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
if (Math.random() < 0.003) { // rarity control
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
  ctx.shadowBlur = 12;

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

    steamX -= 0.15;
    if (steamX <= -W) steamX = 0;
  }

  // ================= PHYSICS =================
  if (hasPlayer && !gameOver) {
    player.vy += GRAVITY;
    player.y += player.vy;
  }

  // ================= MOUNTAINS (behind obstacles) =================
  const mountainH = 160;
  const mountainY = H - 260;
  ctx.drawImage(mountainsImg, mountainX, mountainY, W, mountainH);
  ctx.drawImage(mountainsImg, mountainX + W, mountainY, W, mountainH);

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

    // scoring
    if (!obs.passed && obs.x + OB_W < player.x) {
      obs.passed = true;
      score++;
      checkRankUnlock();
      if (score > bestScore) {
        bestScore = score;
      }
    }

    // collision
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
        saveScore();
      }
    }
  }

  // ================= FLOOR / CEILING =================
  if (!gameOver && hasPlayer) {
    if (player.y < 0 || player.y + player.h > H) {
      gameOver = true;
      saveScore();
    }
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

  // ================= PLAYER =================
  ctx.drawImage(kokkyImg, player.x, player.y, player.w, player.h);

  // ================= BANNER =================
   
drawBanner();
   
  // ================= BOTTOM STEAM =================
  ctx.globalAlpha = 0.55;
  const steamY = H - 120;
  ctx.drawImage(steamImg, steamX, steamY);
  ctx.drawImage(steamImg, steamX + W, steamY);
  ctx.globalAlpha = 1;
   
  requestAnimationFrame(loop);
}

loop();

/* =====================================================
   DRAW: RANK BANNER (CARD STYLE – POLISHED)
===================================================== */
function drawBanner() {
  if (!banner) return;

  const W = gameWidth();

  // target position (near moon height)
  const targetY = 70;

  // slide down gently
  if (banner.y < targetY) {
    banner.y += 2.5;
  }

  // fade out during last second (~60 frames)
  if (banner.life < 60) {
    banner.alpha = banner.life / 60;
  }

  const cardW = 260;
  const cardH = 64;
  const x = (W - cardW) / 2;
  const y = banner.y;

  ctx.save();
  ctx.globalAlpha = banner.alpha ?? 1;

  /* === SOFT GOLD GLOW === */
  ctx.shadowColor = "rgba(245, 215, 110, 0.6)";
  ctx.shadowBlur = 18;

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


// === STATIC SPARKLES (ELEGANT GLOW) ===
banner.sparkles.forEach(s => {
  s.pulse += 0.04; // slow shimmer
  const alpha = s.a + Math.sin(s.pulse) * 0.15;

  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
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

/* =====================================================
   SCORE SAVE
===================================================== */

function saveScore() {
  const playerId = localStorage.getItem("playerId");
  if (!playerId) return;

  let board = JSON.parse(localStorage.getItem("scoreboard") || "[]");

  const rank = getRankForScore(score) || "—";

  const existing = board.find(e => e.id === playerId);

if (existing) {
  // update high score if beaten
  if (score > existing.score) {
    existing.score = score;
  }

  // ALWAYS update best rank (rank never downgrades)
  existing.rank = getRankForScore(existing.score) || "—";

} else {
  board.push({
    id: playerId,
    score: score,
    rank: getRankForScore(score) || "—"
  });
}

  localStorage.setItem("scoreboard", JSON.stringify(board));
}
