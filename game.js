const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ===============================
   VIRTUAL SCREEN
================================ */
const VIRTUAL_WIDTH = 390;
const VIRTUAL_HEIGHT = 844;

let scale = 1;
let offsetX = 0;
let offsetY = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  scale = Math.min(
    canvas.width / VIRTUAL_WIDTH,
    canvas.height / VIRTUAL_HEIGHT
  );

  offsetX = (canvas.width - VIRTUAL_WIDTH * scale) / 2;
  offsetY = (canvas.height - VIRTUAL_HEIGHT * scale) / 2;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* ===============================
   PLAYER SELECTION
================================ */
const modal = document.getElementById("playerModal");
const teamButtons = document.getElementById("teamButtons");
const idSelect = document.getElementById("idSelect");
const selectRow = document.getElementById("selectRow");
const confirmBtn = document.getElementById("confirmPlayer");

let selectedTeam = null;
let selectedId = null;

const teamData = {
  W: [5,8,9,18,19,22,28,29,30,34,"A","B"],
  R: [1,4,6,7,11,13,20,21,27,31,40,"A","B"],
  G: [10,12,14,23,24,26,35,36,37,39,"A","B"],
  B: [2,3,15,16,17,25,32,33,38,41,"A","B"],
};

teamButtons.addEventListener("click", e => {
  if (!e.target.dataset.team) return;
  selectedTeam = e.target.dataset.team;
  selectedId = null;
  confirmBtn.disabled = true;
  idSelect.innerHTML = `<option value="">Select</option>`;
  selectRow.classList.remove("hidden");

  if (selectedTeam === "Guest") {
    addOption("0", "0");
  } else if (selectedTeam === "Admin") {
    addOption("G", "G");
    addOption("S", "S");
  } else {
    teamData[selectedTeam].forEach(id => {
      addOption(id, id === "A" || id === "B" ? `${id} (ALT)` : id);
    });
  }
});

function addOption(value, label) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  idSelect.appendChild(opt);
}

idSelect.addEventListener("change", () => {
  selectedId = idSelect.value;
  confirmBtn.disabled = !selectedId;
});

confirmBtn.onclick = () => {
  const pid = selectedTeam === "Guest" ? "Guest" : `${selectedTeam}-${selectedId}`;
  localStorage.setItem("playerId", pid);
  modal.style.display = "none";
};

/* ===============================
   ASSETS
================================ */
const kokkyImg = new Image();
kokkyImg.src = "kokky.png";

const woodImg = new Image();
woodImg.src = "wood.png";

const mountainsImg = new Image();
mountainsImg.src = "mountains.png";

const steamImg = new Image();
steamImg.src = "steam.png";

/* ===============================
   PLAYER
================================ */
const player = {
  x: 80,
  y: VIRTUAL_HEIGHT / 2,
  w: 48,
  h: 48,
  vy: 0
};

const GRAVITY = 0.5;
const JUMP = -8;

/* ===============================
   OBSTACLES
================================ */
let obstacles = [];
const OBSTACLE_WIDTH = 70;
const GAP = 170;
const SPEED = 2.5;
const SPAWN_DISTANCE = 270;
let spawnX = 0;

/* ===============================
   STATE
================================ */
let started = false;
let gameOver = false;
let score = 0;
let bestScore = Number(localStorage.getItem("bestScore")) || 0;

/* ===============================
   INPUT
================================ */
function jump() {
  if (!localStorage.getItem("playerId")) return;

  if (gameOver) {
    resetGame();
    return;
  }

  if (!started) {
    started = true;
    spawnX = VIRTUAL_WIDTH + OBSTACLE_WIDTH + 40;
  }

  player.vy = JUMP;
  hopSteam.push({ x: player.x - 10, y: player.y + player.h / 2, life: 12 });
}

window.addEventListener("keydown", e => {
  if (e.code === "Space") jump();
});
canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  jump();
});

/* ===============================
   HELPERS
================================ */
function spawnObstacle() {
  const minY = 100;
  const maxY = VIRTUAL_HEIGHT - GAP - 200;
  const gapY = Math.random() * (maxY - minY) + minY;
  obstacles.push({ x: spawnX, gapY, passed: false });
  spawnX += SPAWN_DISTANCE;
}

function hit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function resetGame() {
  player.y = VIRTUAL_HEIGHT / 2;
  player.vy = 0;
  obstacles = [];
  score = 0;
  started = false;
  gameOver = false;
}

/* ===============================
   VISUALS
================================ */
// stars
const stars = Array.from({ length: 60 }, () => ({
  x: Math.random() * VIRTUAL_WIDTH,
  y: Math.random() * VIRTUAL_HEIGHT * 0.6,
  r: Math.random() * 1.5 + 0.5,
  c: Math.random() < 0.7 ? "#ffd966" : "#ffffff"
}));

// snow
const snow = Array.from({ length: 40 }, () => ({
  x: Math.random() * VIRTUAL_WIDTH,
  y: Math.random() * VIRTUAL_HEIGHT,
  s: Math.random() * 0.5 + 0.3
}));

// hop steam
let hopSteam = [];

// mountains scroll
let mountainX = 0;

// steam scroll
let steamX = 0;

/* ===============================
   DRAW HELPERS
================================ */
function drawMoon() {
  const x = 300, y = 120, r = 36;
  const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.4);
  g.addColorStop(0, "rgba(255,245,210,0.9)");
  g.addColorStop(1, "rgba(255,245,210,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f6e9b8";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawObstacle(obs) {
  ctx.drawImage(woodImg, obs.x, 0, OBSTACLE_WIDTH, obs.gapY);
  ctx.drawImage(
    woodImg,
    obs.x,
    obs.gapY + GAP,
    OBSTACLE_WIDTH,
    VIRTUAL_HEIGHT - (obs.gapY + GAP)
  );
}

/* ===============================
   MAIN LOOP
================================ */
function loop() {
  // background
  ctx.fillStyle = "#02040b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // stars
  stars.forEach(s => {
    ctx.fillStyle = s.c;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // moon
  drawMoon();

  // snow
  snow.forEach(f => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(f.x, f.y, 1, 1);
    if (!gameOver) {
      f.y += f.s;
      if (f.y > VIRTUAL_HEIGHT) f.y = 0;
    }
  });

  // mountains
  ctx.drawImage(mountainsImg, mountainX, 420);
  ctx.drawImage(mountainsImg, mountainX + VIRTUAL_WIDTH, 420);
  if (!gameOver) {
    mountainX -= 0.3;
    if (mountainX <= -VIRTUAL_WIDTH) mountainX = 0;
  }

  // physics
  if (started && !gameOver) {
    player.vy += GRAVITY;
    player.y += player.vy;
  }

  // obstacles
  if (started && !gameOver) {
    if (obstacles.length === 0 ||
        spawnX - obstacles[obstacles.length - 1].x >= SPAWN_DISTANCE) {
      spawnObstacle();
    }
  }

  obstacles.forEach(obs => {
    if (!gameOver) obs.x -= SPEED;
    drawObstacle(obs);

    if (!obs.passed && obs.x + OBSTACLE_WIDTH < player.x) {
      obs.passed = true;
      score++;
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
      }
    }

    const hitBox = {
      x: player.x + 6,
      y: player.y + 6,
      w: player.w - 12,
      h: player.h - 12
    };

    const topBox = { x: obs.x, y: 0, w: OBSTACLE_WIDTH, h: obs.gapY };
    const botBox = {
      x: obs.x,
      y: obs.gapY + GAP,
      w: OBSTACLE_WIDTH,
      h: VIRTUAL_HEIGHT
    };

    if (!gameOver && (hit(hitBox, topBox) || hit(hitBox, botBox))) {
      gameOver = true;
    }
  });

  // hop steam
  hopSteam.forEach(p => {
    ctx.fillStyle = `rgba(255,255,255,${p.life / 12})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    p.life--;
  });
  hopSteam = hopSteam.filter(p => p.life > 0);

  // steam bottom
  ctx.globalAlpha = 0.6;
  ctx.drawImage(steamImg, steamX, VIRTUAL_HEIGHT - 120);
  ctx.drawImage(steamImg, steamX + VIRTUAL_WIDTH, VIRTUAL_HEIGHT - 120);
  ctx.globalAlpha = 1;
  if (!gameOver) {
    steamX -= 0.2;
    if (steamX <= -VIRTUAL_WIDTH) steamX = 0;
  }

  // player
  ctx.drawImage(kokkyImg, player.x, player.y, player.w, player.h);

  // UI
  ctx.fillStyle = "#fff";
  ctx.font = "20px Handjet";
  ctx.textAlign = "center";
  ctx.fillText(`Score: ${score}  Best: ${bestScore}`, VIRTUAL_WIDTH / 2, 30);

  ctx.restore();
  requestAnimationFrame(loop);
}

loop();
