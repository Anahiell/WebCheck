"use strict";
const byId = id => document.getElementById(id);
let polling = true, busy = false;
const show = (id, value) => { byId(id).textContent = value ?? "—"; };
function unavailable(message) {
  for (const id of ["cpu", "memory", "temp", "frames"]) show(id, "—");
  for (const id of ["cpu-bar", "memory-bar", "temp-bar"]) byId(id).style.width = "0%";
  show("snapshot-state", message);
}
const number = v => typeof v === "number" && Number.isFinite(v) ? v : null;
async function refresh() {
  if (!polling || busy) return;
  busy = true;
  try {
    const response = await fetch("/api/status", {cache: "no-store", signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error("Snapshot unavailable");
    const data = await response.json(), age = Date.now() - Date.parse(data.generated_at);
    if (data.schema !== 1 || !Number.isFinite(age) || age > 60000 || age < -30000) throw new Error("Snapshot stale");
    if (!polling) return;
    const h = data.host, r = data.repository;
    show("cpu", number(h.cpu_percent)); show("memory", number(h.memory_used_gib));
    show("memory-total", number(h.memory_total_gib)); show("temp", number(h.temperature_c)); show("frames", "—");
    for (const [id, value] of [["cpu-bar", h.cpu_percent], ["memory-bar", h.memory_used_gib / h.memory_total_gib * 100], ["temp-bar", h.temperature_c]]) {
      byId(id).style.width = Math.max(0, Math.min(100, number(value) ?? 0)) + "%";
    }
    show("snapshot-state", "Host snapshot: " + new Date(data.generated_at).toLocaleString() + " · uptime " + Math.floor(h.uptime_seconds / 3600) + " h");
    show("repo-state", r.sha ? `${r.name} · ${r.branch} · ${r.sha.slice(0,12)} · ${r.stale ? "CACHED / STALE" : "GitHub snapshot"} · ${r.committed_at}` : "Repository data unavailable");
    show("repo-checks", (r.checks || []).map(c => `${c.name}: ${c.conclusion || c.status}`).join(" · ") || "No workflow runs reported for this commit");
  } catch (error) {
    unavailable(error.message === "Snapshot stale" ? "Snapshot stale — host values hidden" : "Snapshot unavailable — host values hidden");
    show("repo-state", "Repository snapshot unavailable"); show("repo-checks", "—");
  } finally { busy = false; }
}
for (const [name, detail] of [["Head", "Neck bench prototype"], ["Cooling", "Fan bench prototype"], ["Eyes", "Planned"], ["Arms", "Planned"], ["Base", "Planned"]]) {
  const card = document.createElement("article"); card.className = "node panel";
  for (const [cls, text] of [["node-name", name], ["node-desc", detail], ["node-status offline", "HARDWARE STATUS UNKNOWN"]]) {
    const item = document.createElement("div"); item.className = cls; item.textContent = text; card.append(item);
  }
  byId("node-grid").append(card);
}
byId("toggle-demo").addEventListener("click", () => {
  polling = !polling; byId("toggle-demo").textContent = polling ? "Pause updates" : "Resume updates";
  if (polling) refresh(); else unavailable("Updates paused — resume for current values");
});
setInterval(() => { show("clock", new Date().toLocaleTimeString()); refresh(); }, 15000);
refresh();
