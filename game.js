const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

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
  let playerId =
    selectedTeam === "Guest"
      ? "Guest"
      : `${selectedTeam}-${selectedId}`;

  localStorage.setItem("playerId", playerId);
  modal.style.display = "none";
};

// TEMP draw
function draw() {
  ctx.fillStyle = "#02040b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pid = localStorage.getItem("playerId");
  if (pid) {
    ctx.fillStyle = "#fff";
    ctx.font = "20px Handjet";
    ctx.textAlign = "center";
    ctx.fillText(`Player: ${pid}`, canvas.width / 2, canvas.height / 2);
  }

  requestAnimationFrame(draw);
}
draw();
