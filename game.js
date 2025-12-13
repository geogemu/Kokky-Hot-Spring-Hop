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

function showOverlayIfNeeded() {
  if (localStorage.getItem("playerId")) {
    hasPlayer = true;
    overlay.classList.add("hidden");
  } else {
    hasPlayer = false;
    overlay.classList.remove("hidden");
  }
}
showOverlayIfNeeded();

const savedPlayer = localStorage.getItem("playerId");
if (savedPlayer) {
  playerIdLabel.textContent = "Player: " + savedPlayer;
}

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
        preview.textContent = (selectedTeam === "Guest") ? "Guest" : `${selectedTeam}-${id}`;
        playBtn.classList.remove("hidden");
      });

      idList.appendChild(b);
    });
  });
});

playBtn.addEventListener("click", () => {
  const pid = (selectedTeam === "Guest") ? "Guest" : `${selectedTeam}-${selectedId}`;
  localStorage.setItem("playerId", pid);
  hasPlayer = true;
  overlay.classList.add("hidden");

playerIdLabel.textContent = "Player: " + pid;
   
});

/* =====================================================
   CHANGE BUTTON
===================================================== */
changePlayerBtn.addEventListener("click", () => {
  overlay.classList.remove("hidden");
  hasPlayer = false;
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
   GAME STATE
===================================================== */
let started = false;
let gameOver = false;

let score = 0;
let bestScore = Number(localStorage.getItem("bestScore")) || 0;

let obstacles = [];
let spawnX = 0;

let mountainX = 0;
let steamX = 0;

let hopSteam = [];

/* =====================================================
   BACKGROUND (stars + snow) init (size dependent)
===================================================== */

function initBackground() {
  const W = gameWidth();
  const H = gameHeight();

  // fixed stars (recreated on resize only)
  stars = Array.from({ length: 60 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H * 0.6,
    r: Math.random() * 1.4 + 0.6,
    c: Math.random() < 0.7 ? "#ffd966" : "#ffffff"
  }));

  // bigger snow (recreated on resize only)
  snow = Array.from({ length: 35 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    s: Math.random() * 0.4 + 0.3,
    r: Math.random() * 1.5 + 1
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

  // restart behavior: on game over, next tap resets and starts
  if (gameOver) {
    resetGame();
    started = true;
    spawnX = gameWidth() + OB_W + 40;
  }

  // first start
  if (!started) {
    started = true;
    spawnX = gameWidth() + OB_W + 40;
  }

  player.vy = JUMP;

  // hop steam near foot, more transparent
  hopSteam.push({
    x: player.x + player.w * 0.55,
    y: player.y + player.h - 3,
    life: 14
  });
}

window.addEventListener("keydown", e => {
  if (e.code === "Space") doJump();
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

  // stars (fixed)
  for (const s of stars) {
    ctx.fillStyle = s.c;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
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

  // snow (bigger, slow)
  for (const f of snow) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
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

/* =====================================================
   MAIN LOOP
===================================================== */
function loop() {
  const W = gameWidth();
  const H = gameHeight();

  // clear in CSS pixel coords
  ctx.clearRect(0, 0, W, H);

  // background layers
  drawSkyAndMoon();

  // update snow only if not frozen
  if (!gameOver) {
    for (const f of snow) {
      f.y += f.s;
      if (f.y > H) f.y = 0;
    }
  }

  // update parallax layers
  if (!gameOver) {
    mountainX -= 0.15;
    if (mountainX <= -W) mountainX = 0;

    steamX -= 0.15;
    if (steamX <= -W) steamX = 0;
  }

  // gravity active once player selected (no floating after Play!)
  if (hasPlayer && !gameOver) {
    player.vy += GRAVITY;
    player.y += player.vy;
  }

  // spawn obstacles only after the first jump
  if (started && !gameOver) {
    if (obstacles.length === 0 ||
        spawnX - obstacles[obstacles.length - 1].x >= SPAWN_DISTANCE) {
      spawnObstacle();
    }
  }

  // move + draw obstacles, scoring, collision
  for (const obs of obstacles) {
    if (!gameOver) obs.x -= SPEED;

    drawObstacle(obs);

    // scoring: passed obstacle
    if (!obs.passed && obs.x + OB_W < player.x) {
      obs.passed = true;
      score++;
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
      }
    }

    // collision (slightly smaller hitbox)
    const hitBox = {
      x: player.x + 6,
      y: player.y + 6,
      w: player.w - 12,
      h: player.h - 12
    };

    const inX = hitBox.x < obs.x + OB_W && hitBox.x + hitBox.w > obs.x;
    if (!gameOver && inX) {
      const hitsTop = hitBox.y < obs.gapY;
      const hitsBottom = (hitBox.y + hitBox.h) > (obs.gapY + GAP);
      if (hitsTop || hitsBottom) gameOver = true;
       saveScore();
    }
  }

  // floor/ceiling freeze
  if (!gameOver && hasPlayer) {
    if (player.y < 0 || player.y + player.h > H) gameOver = true;
     saveScore();
  }

  // mountains + steam (draw after obstacles? mountains should be behind obstacles)
  // mountains behind obstacles is already achieved because we draw them here AFTER sky but BEFORE steam + player
  // but obstacles are currently drawn before mountains; that would put mountains on top.
  // So: draw mountains + steam AFTER sky, BEFORE obstacles? We already drew obstacles.
  // Fix: draw mountains now, but it should be behind obstacles. We'll redraw steam only after obstacles.
  // To keep it simple and correct visually: draw mountains earlier next frame by ordering below.
  // (We will handle ordering by drawing mountains + steam after sky AND BEFORE obstacles next frame)
  // For this frame, do it correctly by drawing mountains first next:
  // -> we already drew obstacles, so we won't redraw mountains now. Instead, we draw mountains+steam BEFORE obstacles every frame.
  // We'll implement correct ordering by moving calls: easiest is to call drawMountainsAndSteam BEFORE obstacle loop.
  // (Already done below with a second pass: drawMountainsAndSteam now will overlay mountains on obstacles, so we do NOT do that.)
  // We'll handle layering properly by drawing mountains and steam BEFORE obstacles:
  // (See adjusted ordering below)

  // === Correct ordering pass ===
  // Redraw everything with correct layer order (fast enough for this simple game)
  ctx.clearRect(0, 0, W, H);
  drawSkyAndMoon();
  // snow already drawn; ok
  // mountains
  const mountainH = 160;
  const mountainY = H - 260;
  ctx.drawImage(mountainsImg, mountainX, mountainY, W, mountainH);
  ctx.drawImage(mountainsImg, mountainX + W, mountainY, W, mountainH);

  // obstacles (on top of mountains)
  for (const obs of obstacles) drawObstacle(obs);

  // hop steam (closer to foot, transparent)
  hopSteam.forEach(p => {
    ctx.fillStyle = `rgba(255,255,255,${p.life / 24})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    p.life--;
  });
  hopSteam = hopSteam.filter(p => p.life > 0);

  // bottom steam on top
  ctx.globalAlpha = 0.55;
  const steamY = H - 120;
  ctx.drawImage(steamImg, steamX, steamY);
  ctx.drawImage(steamImg, steamX + W, steamY);
  ctx.globalAlpha = 1;

  // player
  ctx.drawImage(kokkyImg, player.x, player.y, player.w, player.h);

   // TOP UI (HTML)
scoreEl.textContent = "Score: " + score;
bestEl.textContent = "Best: " + bestScore;
   
  requestAnimationFrame(loop);

}

loop();

function saveScore() {
  const playerId = localStorage.getItem("playerId");
  if (!playerId) return;

  let board = JSON.parse(localStorage.getItem("scoreboard") || "[]");

  const rank = "—"; // rank system comes later

  const existing = board.find(e => e.id === playerId);

  if (existing) {
    if (score > existing.score) {
      existing.score = score;
      existing.rank = rank;
    }
  } else {
    board.push({
      id: playerId,
      score: score,
      rank: rank
    });
  }

  localStorage.setItem("scoreboard", JSON.stringify(board));
}
