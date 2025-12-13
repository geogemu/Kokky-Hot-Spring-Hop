const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ---------- Modal Elements ---------- */
const modal = document.getElementById("playerModal");
const teamButtons = document.getElementById("teamButtons");
const idSelect = document.getElementById("idSelect");
const selectRow = document.getElementById("selectRow");
const confirmBtn = document.getElementById("confirmPlayer");

/* ---------- Player Selection ---------- */
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
      if (id === "A" || id === "B") {
        addOption(id, `${id} (ALT)`);
      } else {
        addOption(id, id);
      }
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
  const playerId =
    selectedTeam === "Guest"
      ? "Guest"
      : `${selectedTeam}-${selectedId}`;

  localStorage.setItem("playerId", playerId);
  modal.style.display = "none";
};

/* ---------- Canvas ---------- */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* ---------- Player ---------- */
const kokkyImg = new Image();
kokkyImg.src = "kokky.png";

const player = {
  x: 80,
  y: canvas.height / 2,
  w: 48,
  h: 48,
  vy: 0
};

const GRAVITY = 0.6;
const JUMP = -10;

/* ---------- Obstacles ---------- */
const woodImg = new Image();
woodImg.src = "wood.png";

let obstacles = [];
const OBSTACLE_WIDTH = 70;
const GAP = 160;
const SPEED = 2.5;
const SPAWN_DISTANCE = 260;
let spawnX = 0;

/* ---------- Game State ---------- */
let started = false;
let score = 0;
let bestScore = Number(localStorage.getItem("bestScore")) || 0;

/* ---------- Input ---------- */
function jump() {
  if (!localStorage.getItem("playerId")) return;

  if (!started) {
    started = true;
    spawnX = canvas.width + 200;
  }
  player.vy = JUMP;
}

window.addEventListener("keydown", e => {
  if (e.code === "Space") jump();
});

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  jump();
});

/* ---------- Obstacles ---------- */
function spawnObstacle() {
  const minY = 80;
  const maxY = canvas.height - GAP - 120;
  const gapY = Math.random() * (maxY - minY) + minY;

  obstacles.push({ x: spawnX, gapY, passed: false });
  spawnX += SPAWN_DISTANCE;
}

/* ---------- Collision ---------- */
function hit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/* ---------- Reset ---------- */
function resetGame() {
  player.y = canvas.height / 2;
  player.vy = 0;
  obstacles = [];
  score = 0;
  started = false;
}

/* ---------- Draw ---------- */
function drawObstacle(obs) {
  ctx.drawImage(woodImg, obs.x, 0, OBSTACLE_WIDTH, obs.gapY);
  ctx.drawImage(
    woodImg,
    obs.x,
    obs.gapY + GAP,
    OBSTACLE_WIDTH,
    canvas.height - (obs.gapY + GAP)
  );
}

/* ---------- Loop ---------- */
function loop() {
  ctx.fillStyle = "#02040b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (started) {
    player.vy += GRAVITY;
    player.y += player.vy;
  }

  if (started) {
    if (
      obstacles.length === 0 ||
      spawnX - obstacles[obstacles.length - 1].x >= SPAWN_DISTANCE
    ) {
      spawnObstacle();
    }
  }

  for (let obs of obstacles) {
    obs.x -= SPEED;
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
      h: canvas.height
    };

    if (hit(hitBox, topBox) || hit(hitBox, botBox)) {
      resetGame();
    }
  }

  if (player.y < 0 || player.y + player.h > canvas.height) {
    resetGame();
  }

  ctx.drawImage(kokkyImg, player.x, player.y, player.w, player.h);

  ctx.fillStyle = "#fff";
  ctx.font = "20px Handjet";
  ctx.textAlign = "center";
  ctx.fillText(`Score: ${score}  Best: ${bestScore}`, canvas.width / 2, 30);

  requestAnimationFrame(loop);
}

loop();
