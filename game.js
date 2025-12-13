/* =====================================================
   CANVAS + DPR SETUP (LOCKED)
===================================================== */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* =====================================================
   PLAYER SELECTION OVERLAY (LOCKED)
===================================================== */
const overlay = document.getElementById("playerOverlay");
const teamButtons = document.querySelectorAll(".teamBtn");
const idSection = document.getElementById("idSection");
const idList = document.getElementById("idList");
const preview = document.getElementById("playerPreview");
const playBtn = document.getElementById("playBtn");

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

if (localStorage.getItem("playerId")) {
  hasPlayer = true;
  overlay.classList.add("hidden");
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
      b.textContent =
        selectedTeam === "Guest" ? "Guest" :
        (id === "A" || id === "B") ? `${id} (ALT)` : id;

      b.onclick = () => {
        [...idList.children].forEach(x => x.classList.remove("selected"));
        b.classList.add("selected");
        selectedId = id;
        preview.textContent =
          selectedTeam === "Guest" ? "Guest" : `${selectedTeam}-${id}`;
        playBtn.classList.remove("hidden");
      };
      idList.appendChild(b);
    });
  });
});

playBtn.onclick = () => {
  const pid =
    selectedTeam === "Guest" ? "Guest" : `${selectedTeam}-${selectedId}`;
  localStorage.setItem("playerId", pid);
  hasPlayer = true;
  overlay.classList.add("hidden");
};

/* =====================================================
   GAME CONSTANTS
===================================================== */
const GRAVITY = 0.5;
const JUMP = -8;
const GAP = 170;
const SPEED = 2.5;
const SPAWN_DISTANCE = 270;

/* =====================================================
   ASSETS
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

const player = {
  x: 80,
  y: 200,
  w: 48,
  h: 48,
  vy: 0
};

let obstacles = [];
let spawnX = 0;

/* =====================================================
   VISUAL ELEMENTS
===================================================== */
const stars = Array.from({ length: 60 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height * 0.6,
  r: Math.random() * 1.4 + 0.6,
  c: Math.random() < 0.7 ? "#ffd966" : "#ffffff"
}));

const snow = Array.from({ length: 35 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  s: Math.random() * 0.4 + 0.3,
  r: Math.random() * 1.5 + 1
}));

let mountainX = 0;
let steamX = 0;
let hopSteam = [];

/* =====================================================
   INPUT
===================================================== */
function jump() {
  if (!hasPlayer) return;

  if (gameOver) {
    resetGame();
    started = true;
    spawnX = canvas.width + 100;
  }

  if (!started) {
    started = true;
    spawnX = canvas.width + 100;
  }

  player.vy = JUMP;
  hopSteam.push({
    x: player.x + player.w * 0.55,
    y: player.y + player.h - 3,
    life: 14
  });
}

window.addEventListener("keydown", e => {
  if (e.code === "Space") jump();
});

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  jump();
}, { passive: false });

/* =====================================================
   HELPERS
===================================================== */
function spawnObstacle() {
  const minY = 120;
  const maxY = canvas.height - GAP - 220;
  const gapY = Math.random() * (maxY - minY) + minY;
  obstacles.push({ x: spawnX, gapY, passed: false });
  spawnX += SPAWN_DISTANCE;
}

function resetGame() {
  player.y = 200;
  player.vy = 0;
  obstacles = [];
  score = 0;
  started = false;
  gameOver = false;
}

/* =====================================================
   DRAW HELPERS
===================================================== */
function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#0A1633");
  grad.addColorStop(1, "#000814");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawMoon() {
  ctx.save();
  const moonX = canvas.width - 80;
  const moonY = 80;
  const moonR = 26;

  const moonGrad = ctx.createRadialGradient(
    moonX - 8, moonY - 8, 4,
    moonX, moonY, moonR + 6
  );
  moonGrad.addColorStop(0, "#fff9d9");
  moonGrad.addColorStop(1, "#bba86a");

  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#d8c78a";
  ctx.beginPath();
  ctx.arc(moonX - 8, moonY - 6, 6, 0, Math.PI * 2);
  ctx.arc(moonX + 5, moonY + 4, 4, 0, Math.PI * 2);
  ctx.arc(moonX + 10, moonY - 10, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* =====================================================
   MAIN LOOP
===================================================== */
function loop() {
  drawSky();

  // stars
  stars.forEach(s => {
    ctx.fillStyle = s.c;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });

  drawMoon();

  // snow
  snow.forEach(f => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
    if (!gameOver) {
      f.y += f.s;
      if (f.y > canvas.height) f.y = 0;
    }
  });

  // mountains (far)
  ctx.drawImage(mountainsImg, mountainX, canvas.height - 260, canvas.width, 160);
  ctx.drawImage(mountainsImg, mountainX + canvas.width, canvas.height - 260, canvas.width, 160);
  if (!gameOver) {
    mountainX -= 0.15;
    if (mountainX <= -canvas.width) mountainX = 0;
  }

  // gravity
  if (hasPlayer && !gameOver) {
    player.vy += GRAVITY;
    player.y += player.vy;
  }

  // obstacles
  if (started && !gameOver) {
    if (
      obstacles.length === 0 ||
      spawnX - obstacles[obstacles.length - 1].x >= SPAWN_DISTANCE
    ) {
      spawnObstacle();
    }
  }

  obstacles.forEach(obs => {
    if (!gameOver) obs.x -= SPEED;

    if (woodPattern) {
      ctx.save();
      ctx.fillStyle = woodPattern;
      ctx.translate(obs.x, 0);
      ctx.fillRect(0, 0, 70, obs.gapY);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(obs.x, obs.gapY + GAP);
      ctx.fillRect(0, 0, 70, canvas.height);
      ctx.restore();
    }

    if (!obs.passed && obs.x + 70 < player.x) {
      obs.passed = true;
      score++;
      bestScore = Math.max(bestScore, score);
      localStorage.setItem("bestScore", bestScore);
    }

    const hitBox = {
      x: player.x + 6,
      y: player.y + 6,
      w: player.w - 12,
      h: player.h - 12
    };

    if (
      !gameOver &&
      (hitBox.x < obs.x + 70 &&
       hitBox.x + hitBox.w > obs.x &&
       (hitBox.y < obs.gapY ||
        hitBox.y + hitBox.h > obs.gapY + GAP))
    ) {
      gameOver = true;
    }
  });

  // hop steam
  hopSteam.forEach(p => {
    ctx.fillStyle = `rgba(255,255,255,${p.life / 24})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    p.life--;
  });
  hopSteam = hopSteam.filter(p => p.life > 0);

  // bottom steam
  ctx.globalAlpha = 0.55;
  ctx.drawImage(steamImg, steamX, canvas.height - 120);
  ctx.drawImage(steamImg, steamX + canvas.width, canvas.height - 120);
  ctx.globalAlpha = 1;
  if (!gameOver) {
    steamX -= 0.15;
    if (steamX <= -canvas.width) steamX = 0;
  }

  // player
  ctx.drawImage(kokkyImg, player.x, player.y, player.w, player.h);

  // UI
  ctx.fillStyle = "#fff";
  ctx.font = "20px Handjet";
  ctx.textAlign = "center";
  ctx.fillText(`Score: ${score}  Best: ${bestScore}`, canvas.width / 2, 30);

  requestAnimationFrame(loop);
}

loop();
