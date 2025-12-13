const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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

  obstacles.push({
    x: spawnX,
    gapY,
    passed: false
  });

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
  // TOP
  ctx.drawImage(
    woodImg,
    obs.x,
    0,
    OBSTACLE_WIDTH,
    obs.gapY
  );

  // BOTTOM
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

  // Player physics
  if (started) {
    player.vy += GRAVITY;
    player.y += player.vy;
  }

  // Spawn obstacles
  if (started) {
    if (obstacles.length === 0 || spawnX - obstacles[obstacles.length - 1].x >= SPAWN_DISTANCE) {
      spawnObstacle();
    }
  }

  // Move & draw obstacles
  for (let obs of obstacles) {
    obs.x -= SPEED;

    drawObstacle(obs);

    // Score
    if (!obs.passed && obs.x + OBSTACLE_WIDTH < player.x) {
      obs.passed = true;
      score++;
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
      }
    }

    // Collision
    const topBox = { x: obs.x, y: 0, w: OBSTACLE_WIDTH, h: obs.gapY };
    const botBox = {
      x: obs.x,
      y: obs.gapY + GAP,
      w: OBSTACLE_WIDTH,
      h: canvas.height
    };

    const hitBox = {
      x: player.x + 6,
      y: player.y + 6,
      w: player.w - 12,
      h: player.h - 12
    };

    if (hit(hitBox, topBox) || hit(hitBox, botBox)) {
      resetGame();
      return requestAnimationFrame(loop);
    }
  }

  // Ground / ceiling
  if (player.y < 0 || player.y + player.h > canvas.height) {
    resetGame();
  }

  // Player
  ctx.drawImage(kokkyImg, player.x, player.y, player.w, player.h);

  // UI (TEMP)
  ctx.fillStyle = "#fff";
  ctx.font = "20px Handjet";
  ctx.textAlign = "center";
  ctx.fillText(`Score: ${score}  Best: ${bestScore}`, canvas.width / 2, 30);

  requestAnimationFrame(loop);
}

loop();
