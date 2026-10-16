"use strict";

// Demo-only telemetry. No network calls and no hardware commands.
const nodes = [
  { id: "0x01", name: "Head", detail: "Yaw / Pitch", icon: "◎", online: true },
  { id: "0x02", name: "Cooling", detail: "Fans / RPM", icon: "❄", online: true },
  { id: "0x03", name: "Eyes", detail: "Vision servos", icon: "◉", online: false },
  { id: "0x04", name: "Arms", detail: "Actuator group", icon: "⌁", online: false },
  { id: "0x05", name: "Base", detail: "Drive system", icon: "⬡", online: false },
];
const byId = (id) => document.getElementById(id);
const time = () => new Date().toLocaleTimeString("en-GB", { hour12: false });
const random = (min, max) => Math.random() * (max - min) + min;
const hex = (n, pad = 2) => n.toString(16).toUpperCase().padStart(pad, "0");
const history = [];
let frames = 0;
let running = true;

function renderNodes() {
  const grid = byId("node-grid");
  grid.replaceChildren();
  for (const node of nodes) {
    const card = document.createElement("article");
    card.className = "node panel";
    card.innerHTML = `<div class="node-top"><span class="node-symbol"></span><span class="node-id"></span></div><div class="node-name"></div><div class="node-desc"></div><div class="node-status"><span class="dot"></span><span></span></div>`;
    card.querySelector(".node-symbol").textContent = node.icon;
    card.querySelector(".node-id").textContent = node.id;
    card.querySelector(".node-name").textContent = node.name;
    card.querySelector(".node-desc").textContent = node.detail;
    const status = card.querySelector(".node-status");
    if (!node.online) status.classList.add("offline");
    status.lastElementChild.textContent = node.online ? "SIMULATED ONLINE" : "NOT CONNECTED";
    grid.append(card);
  }
}
function addEvent(title, level = "info") {
  const entry = document.createElement("div");
  entry.className = "event";
  entry.innerHTML = '<span class="event-bullet"></span><div><div class="event-title"></div><div class="event-time"></div></div>';
  entry.querySelector(".event-bullet").classList.add(level);
  entry.querySelector(".event-title").textContent = title;
  entry.querySelector(".event-time").textContent = time() + " · demo session";
  const list = byId("event-list");
  list.prepend(entry);
  while (list.children.length > 6) list.lastElementChild.remove();
}
function addFrame() {
  const id = Math.random() > 0.35 ? 1 : 2;
  const dlc = Math.floor(random(2, 9));
  const data = Array.from({ length: dlc }, () => hex(Math.floor(random(0, 256)))).join(" ");
  const direction = Math.random() > 0.5 ? "RX" : "TX";
  const row = document.createElement("tr");
  for (const value of [time(), "0x" + hex(id, 3), direction, String(dlc), data]) {
    const cell = document.createElement("td");
    cell.textContent = value;
    if (value === direction) cell.className = direction.toLowerCase();
    row.append(cell);
  }
  const body = byId("traffic-body");
  body.prepend(row);
  while (body.children.length > 7) body.lastElementChild.remove();
  byId("frames").textContent = (++frames).toLocaleString("en-US");
}
function tick() {
  byId("clock").textContent = time();
  if (!running) return;
  const cpu = Math.round(random(14, 41));
  const memory = random(2.8, 4.2);
  const temp = Math.round(random(41, 56));
  byId("cpu").textContent = cpu;
  byId("memory").textContent = memory.toFixed(1);
  byId("temp").textContent = temp;
  byId("cpu-bar").style.width = cpu + "%";
  byId("memory-bar").style.width = (memory / 16 * 100) + "%";
  byId("temp-bar").style.width = temp + "%";
  addFrame();
  if (Math.random() < 0.12) addEvent("Simulated CAN frame received", "info");
}
renderNodes();
addEvent("Observatory demo session initialized", "info");
addEvent("Physical CAN transport not connected", "warning");
tick();
setInterval(tick, 1500);
byId("toggle-demo").addEventListener("click", () => {
  running = !running;
  byId("toggle-demo").textContent = running ? "Ⅱ Pause demo" : "▶ Resume demo";
  addEvent(running ? "Demo telemetry resumed" : "Demo telemetry paused", "info");
});
