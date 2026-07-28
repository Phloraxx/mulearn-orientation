import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { TEAMS } from "../server/content.js";

const root = resolve(process.argv[2] ?? "generated-assets/mysteries");
for (const [teamIndex, team] of TEAMS.entries()) {
  const directory = resolve(root, team.slug, "tiles");
  await mkdir(directory, { recursive: true });
  const hue = (teamIndex * 43) % 360;
  const scene = `<rect width="700" height="640" fill="hsl(${hue} 72% 18%)"/>
    <circle cx="560" cy="110" r="85" fill="#facc15"/><path d="M0 480 Q170 400 350 500 T700 450 V640 H0Z" fill="#166534"/>
    <g stroke="#fff" stroke-width="16" stroke-linecap="round" fill="none"><circle cx="245" cy="225" r="54" fill="#ffcf9d"/>
    <path d="M245 280L220 420M220 335L120 295M224 345L345 300M220 420L130 535M220 420L330 520"/>
    <circle cx="450" cy="300" r="45" fill="#bfdbfe"/><path d="M450 345L485 455M470 390L570 345M475 450L410 550M480 452L565 530"/></g>`;
  await writeFile(resolve(root, team.slug, "source.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 640">${scene}</svg>`);
  for (let index = 0; index < 28; index++) {
    const x = (index % 7) * 100;
    const y = Math.floor(index / 7) * 160;
    await writeFile(resolve(directory, `${String(index).padStart(2, "0")}.svg`),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} 100 160" preserveAspectRatio="xMidYMid slice">${scene}</svg>`);
  }
  await writeFile(resolve(root, team.slug, "private-layout.json"), JSON.stringify({
    private: true, columns: 7, rows: 4, tileCount: 28,
    tiles: Array.from({ length: 28 }, (_, index) => ({ index, x: index % 7, y: Math.floor(index / 7) }))
  }, null, 2));
}
console.log(`Generated 20 placeholder mystery sources and 560 portrait tiles under ${root}.`);
