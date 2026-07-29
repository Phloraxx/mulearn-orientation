import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { TEAMS } from "../server/content.js";

const root = resolve(process.argv[2] ?? "content/generated-assets/mysteries");
const iconRoot = resolve("content/mystery-icons");
const W = 1960;
const H = 1960;

const ICONS: Record<string, string> = {};
for (const code of ["1f996","1f431","1f427","1f992","1f428","1f43b","1f43a","1f430","1f989","1f40a","1f988","1f42c","1f99c","1f98d","1f998"]) {
  ICONS[code] = (await readFile(resolve(iconRoot, `${code}.svg`))).toString("base64");
}

const icon = (code:string,x:number,y:number,size:number,rotate=0) =>
  `<image href="data:image/svg+xml;base64,${ICONS[code]}" x="${x-size/2}" y="${y-size/2}" width="${size}" height="${size}" transform="rotate(${rotate} ${x} ${y})"/>`;

const bg = (top:string,bottom:string,ground:string) => `<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
</defs><rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="1630" cy="260" r="120" fill="#ffe28a" opacity=".8"/>
<path d="M0 1500 Q350 1360 710 1510 T1430 1480 T1960 1520 V1960 H0Z" fill="${ground}" opacity=".62"/>`;

const motion = (x:number,y:number,flip=false) => `<g stroke="#bc6c25" stroke-width="22" stroke-linecap="round" opacity=".75" transform="${flip?`translate(${2*x} 0) scale(-1 1)`:``}">
  <path d="M${x} ${y}h-170"/><path d="M${x+35} ${y+70}h-240"/><path d="M${x+10} ${y+140}h-125"/></g>`;
const person = (x:number,y:number,shirt:string,pose:"stand"|"run"|"panic"|"point"|"sit"|"carry"="stand",scale=1) => {
  const sw=22*scale, r=56*scale, body=235*scale;
  const arms = pose === "point"
    ? `<path d="M${x} ${y+115*scale} L${x+165*scale} ${y+55*scale}"/><path d="M${x} ${y+125*scale} L${x-70*scale} ${y+180*scale}"/>`
    : pose === "panic"
    ? `<path d="M${x} ${y+115*scale} L${x-90*scale} ${y+15*scale} M${x} ${y+115*scale} L${x+90*scale} ${y+15*scale}"/>`
    : pose === "run"
    ? `<path d="M${x} ${y+120*scale} L${x-120*scale} ${y+65*scale} M${x} ${y+120*scale} L${x+115*scale} ${y+155*scale}"/>`
    : pose === "carry"
    ? `<path d="M${x} ${y+115*scale} L${x-90*scale} ${y+90*scale} M${x} ${y+115*scale} L${x+90*scale} ${y+90*scale}"/>`
    : `<path d="M${x} ${y+120*scale} L${x-75*scale} ${y+175*scale} M${x} ${y+120*scale} L${x+75*scale} ${y+175*scale}"/>`;
  const legs = pose === "run"
    ? `<path d="M${x} ${y+body} L${x-125*scale} ${y+365*scale} M${x} ${y+body} L${x+140*scale} ${y+330*scale}"/>`
    : pose === "sit"
    ? `<path d="M${x} ${y+body} L${x+105*scale} ${y+285*scale} L${x+145*scale} ${y+390*scale}"/>`
    : `<path d="M${x} ${y+body} L${x-70*scale} ${y+390*scale} M${x} ${y+body} L${x+70*scale} ${y+390*scale}"/>`;
  return `<g fill="none" stroke="#17221a" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="${x}" cy="${y}" r="${r}" fill="#d9a57e"/><path d="M${x} ${y+r} L${x} ${y+body}" stroke="${shirt}" stroke-width="${90*scale}"/>
    ${arms}${legs}</g>`;
};

const paper = (x:number,y:number,w=190,h=250,rotate=0) => `<g transform="rotate(${rotate} ${x+w/2} ${y+h/2})">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#fffdf3" stroke="#283618" stroke-width="10"/>
  <path d="M${x+35} ${y+55}h${w-70} M${x+35} ${y+105}h${w-70} M${x+35} ${y+155}h${w-90}" stroke="#94a3b8" stroke-width="10"/>
  <path d="M${x+35} ${y+205}l18 18 35-42" fill="none" stroke="#3f8f4f" stroke-width="12"/></g>`;

const book = (x:number,y:number,w=270,h=330,rotate=0) => `<g transform="rotate(${rotate} ${x+w/2} ${y+h/2})">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="#9d174d" stroke="#17221a" stroke-width="13"/>
  <rect x="${x+34}" y="${y+38}" width="${w-68}" height="${h-76}" rx="10" fill="#fff7dc"/>
  <path d="M${x+65} ${y+105}h${w-125} M${x+65} ${y+165}h${w-125} M${x+65} ${y+225}h${w-150}" stroke="#64748b" stroke-width="12"/></g>`;
const desk = (x:number,y:number,w=650) => `<g><rect x="${x}" y="${y}" width="${w}" height="70" rx="18" fill="#8b5a2b"/>
  <rect x="${x+55}" y="${y+70}" width="55" height="310" fill="#6b3f1d"/><rect x="${x+w-110}" y="${y+70}" width="55" height="310" fill="#6b3f1d"/></g>`;
const printer = (x:number,y:number) => `<g stroke="#17221a" stroke-width="14"><rect x="${x}" y="${y}" width="430" height="300" rx="40" fill="#d9dde5"/>
  <rect x="${x+65}" y="${y+45}" width="300" height="95" rx="12" fill="#fff"/><rect x="${x+92}" y="${y+190}" width="246" height="62" rx="10" fill="#4b5563"/>
  <circle cx="${x+370}" cy="${y+60}" r="15" fill="#22c55e"/></g>`;
const laptop = (x:number,y:number,w=310) => `<g stroke="#17221a" stroke-width="12"><rect x="${x}" y="${y}" width="${w}" height="${w*.62}" rx="22" fill="#dbeafe"/>
  <path d="M${x-35} ${y+w*.62+20}h${w+70}" stroke-width="25"/><path d="M${x+65} ${y+75}l55 55 105-120" fill="none" stroke="#22c55e" stroke-width="18"/></g>`;
const socket = (x:number,y:number) => `<g stroke="#17221a" stroke-width="14"><rect x="${x}" y="${y}" width="270" height="330" rx="42" fill="#f7f7f2"/>
  <circle cx="${x+90}" cy="${y+120}" r="20" fill="#17221a"/><circle cx="${x+180}" cy="${y+120}" r="20" fill="#17221a"/><rect x="${x+110}" y="${y+205}" width="50" height="75" rx="15" fill="#17221a"/></g>`;
const plate = (x:number,y:number,r=110) => `<g><ellipse cx="${x}" cy="${y}" rx="${r*1.4}" ry="${r}" fill="#f5f5f4" stroke="#17221a" stroke-width="12"/>
  <ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*.62}" fill="#d97706"/><circle cx="${x-35}" cy="${y-15}" r="22" fill="#facc15"/><circle cx="${x+35}" cy="${y+20}" r="20" fill="#ef4444"/></g>`;
const phone = (x:number,y:number,w=300,h=500) => `<g stroke="#17221a" stroke-width="14"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="55" fill="#111827"/>
  <rect x="${x+25}" y="${y+55}" width="${w-50}" height="${h-110}" rx="32" fill="#dcfce7"/>
  <path d="M${x+75} ${y+150}q70-80 140 0 q-70 80-140 0 M${x+70} ${y+280}h150 M${x+70} ${y+340}h110" fill="none" stroke="#22c55e" stroke-width="20"/></g>`;
const clock = (x:number,y:number,r=170) => `<g stroke="#17221a" stroke-width="16"><circle cx="${x}" cy="${y}" r="${r}" fill="#fef3c7"/>
  <path d="M${x} ${y}v-${r*.55} M${x} ${y}l${r*.42} ${r*.22}"/><circle cx="${x}" cy="${y}" r="18" fill="#17221a"/></g>`;
const podium = (x:number,y:number) => `<g><path d="M${x} ${y}h330l-55 390h-220z" fill="#8b5a2b" stroke="#17221a" stroke-width="14"/>
  <rect x="${x+65}" y="${y+90}" width="200" height="130" rx="20" fill="#fefae0"/><path d="M${x+105} ${y+155}h120" stroke="#606c38" stroke-width="16"/></g>`;
function scene(slug:string, accent:string) {
  let s = bg("#fefae0", "#f3c98b", accent);
  switch (slug) {
    case "lion":
      s += `${motion(640,890)}${icon("1f996",780,1030,620,-10)}${person(805,560,"#283618","stand",.82)}${person(1450,1040,"#9d174d","run",.72)}${person(1640,960,"#2563eb","run",.65)}${paper(1370,650,150,210,-15)}${paper(1600,620,150,210,15)}${paper(1510,790,150,210,5)}`; break;
    case "tiger":
      s += `${motion(720,940)}${person(780,900,"#2563eb","run",.95)}${book(680,760,250,310,-12)}${person(1450,930,"#9d174d","run",.9)}${paper(1310,640,130,180,18)}${paper(1600,760,130,180,-12)}`; break;
    case "panda":
      s += `${desk(650,980,700)}${icon("1f431",1000,760,430)}${person(460,1120,"#2563eb","sit",.62)}${person(1530,1110,"#ea580c","panic",.62)}${paper(400,930,120,170,-8)}${paper(1480,920,120,170,10)}`; break;
    case "zebra":
      s += `${person(500,1030,"#264653","point",.85)}${printer(1180,850)}${paper(790,920,220,300,72)}<path d="M720 1110 Q980 860 1270 1050" fill="none" stroke="#f8fafc" stroke-width="70"/><path d="M720 1110 Q980 860 1270 1050" fill="none" stroke="#17221a" stroke-width="7" stroke-dasharray="28 22"/>`; break;
    case "penguin":
      s += `${podium(1180,720)}${icon("1f427",1350,610,420)}${person(420,1210,"#2563eb","sit",.56)}${person(760,1220,"#9d174d","sit",.56)}${person(1030,1280,"#606c38","sit",.5)}${laptop(520,760,340)}<path d="M585 875l60-70 65 55 70-110" fill="none" stroke="#ef4444" stroke-width="18"/>`; break;
  }
  return s;
}

function scenePartTwo(slug:string) {
  let s = "";
  switch (slug) {
    case "fox":
      s += `${phone(760,560,420,700)}${person(440,1180,"#283618","point",.62)}${person(1510,1260,"#ea580c","panic",.56)}${person(1690,1280,"#2563eb","panic",.5)}<path d="M520 1150 Q860 760 980 970" fill="none" stroke="#17221a" stroke-width="18"/><path d="M520 1150 Q860 760 980 970" fill="none" stroke="#a3ff12" stroke-width="8" stroke-dasharray="30 20"/>`; break;
    case "monkey":
      s += `${clock(650,820,230)}<rect x="500" y="1060" width="360" height="420" rx="100" fill="#dbeafe" stroke="#17221a" stroke-width="18"/>${person(840,1110,"#9d174d","run",.62)}${paper(1110,900,180,250,12)}${person(1530,1070,"#283618","point",.64)}${motion(960,1180)}`; break;
    case "elephant":
      s += `${book(760,760,430,540,-6)}${person(500,1210,"#2563eb","carry",.55)}${person(1450,1210,"#ea580c","carry",.55)}${person(980,520,"#606c38","panic",.5)}${paper(590,1060,120,170,-20)}${paper(1310,1050,120,170,18)}`; break;
    case "giraffe":
      s += `${icon("1f992",1360,790,620,8)}${plate(900,1110,150)}${person(490,1190,"#2563eb","panic",.6)}${person(720,1280,"#9d174d","panic",.5)}<path d="M1280 870 Q1110 960 960 1060" fill="none" stroke="#d6a54b" stroke-width="120" stroke-linecap="round"/>`; break;
    case "koala":
      s += `${socket(830,760)}${icon("1f428",1000,1120,420,-4)}<path d="M1000 1110 Q1060 980 970 900" fill="none" stroke="#111827" stroke-width="28"/>${person(450,1220,"#2563eb","point",.58)}${person(1510,1220,"#ea580c","point",.58)}${motion(1450,1040,true)}`; break;
  }
  return s;
}
function scenePartThree(slug:string) {
  let s = "";
  switch (slug) {
    case "bear":
      s += `${desk(610,1010,740)}${icon("1f43b",980,760,450)}${plate(980,1020,150)}${person(390,1240,"#2563eb","point",.55)}${person(1510,1240,"#9d174d","point",.55)}${person(1710,1300,"#606c38","panic",.48)}`; break;
    case "wolf":
      s += `${paper(500,930,900,470,-8)}${person(940,760,"#283618","stand",.58)}${person(1540,1110,"#ea580c","run",.58)}${motion(1450,1030)}${paper(1370,780,130,180,18)}`; break;
    case "rabbit":
      s += `${icon("1f430",1260,1050,480,-8)}${person(700,1080,"#2563eb","run",.7)}${paper(560,850,180,250,-14)}${clock(1530,570,170)}${motion(970,1010)}`; break;
    case "owl":
      s = `<rect width="${W}" height="${H}" fill="#17223b"/><circle cx="1570" cy="260" r="160" fill="#fff7bd"/>${desk(650,990,700)}${icon("1f989",1000,730,430)}${person(450,1240,"#2563eb","sit",.55)}${person(1510,1240,"#9d174d","sit",.55)}${clock(360,430,130)}`; break;
    case "crocodile":
      s += `${icon("1f40a",1120,1050,690,-5)}${plate(920,1070,150)}${person(430,1200,"#2563eb","run",.56)}${person(1570,1200,"#ea580c","run",.56)}${motion(720,1100)}${motion(1450,1100,true)}`; break;
  }
  return s;
}
function scenePartFour(slug:string) {
  let s = "";
  switch (slug) {
    case "shark":
      s = `<rect width="${W}" height="${H}" fill="#d9f4ff"/>${desk(590,1030,780)}${icon("1f988",850,780,500)}${person(1450,900,"#283618","sit",.68)}${paper(1310,700,150,210,5)}${laptop(730,1130,300)}`; break;
    case "dolphin":
      s = `<rect width="${W}" height="${H}" fill="#e5fbff"/>${icon("1f42c",590,870,480,-6)}${laptop(850,850,420)}${person(1460,930,"#283618","point",.62)}${person(1630,1190,"#9d174d","stand",.5)}<path d="M980 1000l70-80 70 55 80-120" fill="none" stroke="#22c55e" stroke-width="22"/>`; break;
    case "parrot":
      s += `${icon("1f99c",980,600,430,8)}${person(570,1240,"#2563eb","panic",.56)}${person(1400,1240,"#9d174d","panic",.56)}${paper(620,720,170,240,-20)}${paper(900,850,170,240,15)}${paper(1190,720,170,240,-8)}${paper(1420,880,170,240,20)}`; break;
    case "gorilla":
      s += `${icon("1f98d",880,1010,620,-4)}${laptop(1040,840,420)}${person(1530,1150,"#2563eb","point",.58)}<path d="M1120 1010l70 90 80-150 80 65" fill="none" stroke="#ef4444" stroke-width="22"/>${motion(1510,1010,true)}`; break;
    case "kangaroo":
      s += `${icon("1f998",980,1000,620)}${person(1500,930,"#9d174d","point",.65)}${person(450,1230,"#2563eb","panic",.55)}${paper(850,1030,140,195,-10)}${paper(1010,1100,140,195,10)}${paper(920,1250,140,195,-4)}`; break;
  }
  return s;
}

function fullScene(slug:string, accent:string) {
  let base = scene(slug, accent) ?? bg("#fefae0", "#f3c98b", accent);
  base += scenePartTwo(slug) + scenePartThree(slug) + scenePartFour(slug);
  const texture = `<g opacity=".055" fill="none" stroke="#49613a" stroke-width="18" stroke-linecap="round">
    <path d="M-180 300 C260 80 470 500 860 300 S1510 80 2140 390"/>
    <path d="M-120 780 C380 520 620 980 1100 720 S1650 520 2110 820"/>
    <path d="M-160 1320 C260 1080 590 1500 1040 1260 S1570 1100 2140 1390"/>
    <path d="M120 1760 C450 1510 820 1830 1210 1660 S1670 1530 2050 1780"/>
    <circle cx="340" cy="520" r="155"/><circle cx="1510" cy="470" r="210"/><circle cx="620" cy="1490" r="190"/><circle cx="1650" cy="1480" r="145"/>
  </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${base}${texture}</svg>`;
}
for (const team of TEAMS) {
  const dir = resolve(root, team.slug);
  await mkdir(dir, { recursive: true });
  const svg = fullScene(team.slug, team.color);
  await sharp(Buffer.from(svg)).webp({ quality: 92 }).toFile(resolve(dir, "source.webp"));
}

console.log(`Generated ${TEAMS.length} square, text-free mystery sources under ${root}.`);
