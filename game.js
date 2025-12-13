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
console.log("Canvas size:", canvas.width, canvas.height);
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

      b.addEventListener("click", () => {
        [...idList.children].forEach(x => x.classList.remove("selected"));
        b.classList.add("selected");

        selectedId = id;
        preview.textContent =
          selectedTeam === "Guest" ? "Guest" : `${selectedTeam}-${id}`;

        playBtn.classList.remove("hidden");
      });

      idList.appendChild(b);
    });
  });
});

playBtn.addEventListener("click", () => {
  const pid =
    selectedTeam === "Guest" ? "Guest" : `${selectedTeam}-${selectedId}`;

  localStorage.setItem("playerId", pid);
  hasPlayer = true;
  overlay.classList.add("hidden");
});

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
  const maxY = canvas.height / (window.devicePixelRatio || 1) - GAP - 220;
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
   MAIN LOOP (LOGIC ONLY — VISUALS OMITTED FOR BREVITY)
===================================================== */
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (hasPlayer && !gameOver) {
    player.vy += GRAVITY;
    player.y += player.vy;
  }

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

    if (!obs.passed && obs.x + 70 < player.x) {
      obs.passed = true;
      score++;
      bestScore = Math.max(bestScore, score);
      localStorage.setItem("bestScore", bestScore);
    }
  });

  requestAnimationFrame(loop);
}

loop();
