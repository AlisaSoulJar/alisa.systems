import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
const RAIZ = "Q:/alisa_project/alisa/World/Synthesis/Web/alisa-systems";
const P = 8939;
const srv = spawn("python", ["servir.py", String(P)], { cwd: RAIZ, stdio: "ignore" });
await new Promise(r => setTimeout(r, 1800));
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await (await b.newContext({ viewport: { width: 1100, height: 660 } })).newPage();
const errs = [];
p.on("pageerror", e => errs.push(String(e.message).slice(0,80)));
p.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0,80)); });
await p.goto(`http://127.0.0.1:${P}/arcade/snake.html?semilla=7`, { waitUntil: "load" });
await p.waitForTimeout(4500);
console.log(await p.evaluate(() => {
  const botones = [...document.querySelectorAll(".mesa-jugada")].map(b => b.textContent.trim());
  return `  .mesa-jugada: ${botones.length} -> ${botones.join(", ")}\n  #alisa-verbos existe: ${!!document.getElementById("alisa-verbos")}`;
}));
if (errs.length) console.log("  errores: " + [...new Set(errs)].slice(0,2).join(" | "));
await b.close(); srv.kill();