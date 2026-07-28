import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { TEAMS } from "../server/content.js";

const root = resolve(process.argv[2] ?? "content/generated-assets/mysteries");
const W = 2100;
const H = 1200;

const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const person = (x:number,y:number,shirt:string,pose:"run"|"stand"|"panic"|"point"|"sit"="stand", scale=1) => {
  const arm = pose === "point" ? `<path d="M ${x+12*scale} ${y+115*scale} L ${x+150*scale} ${y+70*scale}"/>` :
    pose === "panic" ? `<path d="M ${x-5*scale} ${y+115*scale} L ${x-75*scale} ${y+25*scale} M ${x+5*scale} ${y+115*scale} L ${x+75*scale} ${y+25*scale}"/>` :
    pose === "run" ? `<path d="M ${x} ${y+120*scale} L ${x-105*scale} ${y+70*scale} M ${x} ${y+120*scale} L ${x+110*scale} ${y+145*scale}"/>` :
    `<path d="M ${x} ${y+120*scale} L ${x-75*scale} ${y+165*scale} M ${x} ${y+120*scale} L ${x+75*scale} ${y+165*scale}"/>`;
  const legs = pose === "run" ? `<path d="M ${x} ${y+270*scale} L ${x-110*scale} ${y+365*scale} M ${x} ${y+270*scale} L ${x+135*scale} ${y+330*scale}"/>` :
    pose === "sit" ? `<path d="M ${x} ${y+270*scale} L ${x+110*scale} ${y+300*scale} L ${x+145*scale} ${y+390*scale}"/>` :
    `<path d="M ${x} ${y+270*scale} L ${x-65*scale} ${y+390*scale} M ${x} ${y+270*scale} L ${x+65*scale} ${y+390*scale}"/>`;
  return `<g stroke="#17221a" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <circle cx="${x}" cy="${y}" r="58" fill="#d6a47b"/>
    <path d="M ${x} ${y+58} L ${x} ${y+270}" stroke="${shirt}" stroke-width="90"/>
    ${arm}${legs}</g>`;
};
const placard=(x:number,y:number,w:number,h:number,text:string,fill="#fff7dc")=>`<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="25" fill="${fill}" stroke="#283618" stroke-width="12"/><text x="${x+w/2}" y="${y+h/2+18}" text-anchor="middle" font-family="Arial,sans-serif" font-size="52" font-weight="900" fill="#283618">${esc(text)}</text></g>`;
const bubbleAnimal=(x:number,y:number,w:number,h:number,label:string,color:string,ears=true)=>`<g stroke="#17221a" stroke-width="14"><ellipse cx="${x}" cy="${y}" rx="${w/2}" ry="${h/2}" fill="${color}"/>${ears?`<circle cx="${x-w*.28}" cy="${y-h*.42}" r="${h*.16}" fill="${color}"/><circle cx="${x+w*.28}" cy="${y-h*.42}" r="${h*.16}" fill="${color}"/>`:``}<circle cx="${x-w*.16}" cy="${y-h*.08}" r="15" fill="#17221a"/><circle cx="${x+w*.16}" cy="${y-h*.08}" r="15" fill="#17221a"/><path d="M ${x-25} ${y+30} Q ${x} ${y+55} ${x+25} ${y+30}" fill="none"/><text x="${x}" y="${y+h*.30}" text-anchor="middle" stroke="none" font-family="Arial,sans-serif" font-size="${Math.max(28,h*.13)}" font-weight="900" fill="#17221a">${esc(label)}</text></g>`;
const fish=(x:number,y:number,label:string,color:string)=>`<g stroke="#17221a" stroke-width="14"><ellipse cx="${x}" cy="${y}" rx="220" ry="105" fill="${color}"/><path d="M ${x-205} ${y} L ${x-350} ${y-130} L ${x-330} ${y+130} Z" fill="${color}"/><circle cx="${x+120}" cy="${y-20}" r="16" fill="#17221a"/><path d="M ${x+175} ${y+28} q 45 25 80 0" fill="none"/><text x="${x}" y="${y+38}" text-anchor="middle" stroke="none" font-family="Arial,sans-serif" font-size="54" font-weight="900" fill="#17221a">${esc(label)}</text></g>`;
const bg=(accent:string)=>`<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fefae0"/><stop offset="1" stop-color="#dda15e"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="1820" cy="180" r="110" fill="#ffe38a"/><path d="M0 900 Q350 780 700 900 T1400 870 T2100 910 V1200 H0Z" fill="${accent}" opacity=".35"/>`;
const speed=(x:number,y:number)=>`<g stroke="#bc6c25" stroke-width="18" stroke-linecap="round" opacity=".8"><path d="M${x} ${y}h-180"/><path d="M${x+40} ${y+55}h-250"/><path d="M${x+10} ${y+110}h-140"/></g>`;
const desk=(x:number,y:number,w=520)=>`<g><rect x="${x}" y="${y}" width="${w}" height="55" rx="12" fill="#7c4a22"/><rect x="${x+35}" y="${y+55}" width="45" height="220" fill="#5b3518"/><rect x="${x+w-80}" y="${y+55}" width="45" height="220" fill="#5b3518"/></g>`;

function scene(slug:string, accent:string) {
  let s=bg(accent);
  switch(slug){
    case "lion": s+=`${bubbleAnimal(760,610,520,320,"DINOSAUR","#6aa84f",false)}<path d="M520 645 L300 760 L535 720" fill="#6aa84f" stroke="#17221a" stroke-width="18"/>${person(770,310,"#283618","stand",.8)}${speed(520,540)}${person(1420,590,"#8b1e3f","run",.8)}${person(1690,560,"#1f6f8b","run",.72)}${placard(1300,410,330,120,"EVENT FORMS")}`; break;
    case "tiger": s+=`${person(760,510,"#264653","run",1)}${placard(640,410,380,130,"ATTENDANCE")}${person(1450,520,"#8b1e3f","run",.95)}${speed(620,550)}`; break;
    case "panda": s+=`${desk(720,590,660)}${bubbleAnimal(1050,420,350,270,"CAT","#f1f1f1")}${person(520,650,"#3a86ff","sit",.75)}${person(1590,650,"#e76f51","panic",.75)}${placard(880,170,340,105,"VIVA")}`; break;
    case "zebra": s+=`${person(560,520,"#264653","stand",1)}${placard(1200,470,470,310,"PRINTER","#e8e8e8")}<path d="M690 675 C950 560 1050 760 1320 610" fill="none" stroke="#fff" stroke-width="55"/><path d="M690 675 C950 560 1050 760 1320 610" fill="none" stroke="#17221a" stroke-width="4" stroke-dasharray="30 20"/>`; break;
    case "penguin": s+=`${placard(380,210,700,500,"ENGINEERING SEMINAR","#eef5ff")}${bubbleAnimal(1260,520,360,430,"PENGUIN","#222",false)}${person(520,800,"#1f6f8b","sit",.55)}${person(850,810,"#8b1e3f","sit",.55)}${person(1620,800,"#606c38","sit",.55)}`; break;
    case "fox": s+=`${person(420,460,"#283618","stand",.9)}<path d="M560 520 Q900 120 1370 520" fill="none" stroke="#333" stroke-width="12"/><path d="M1370 520v220" stroke="#333" stroke-width="10"/><circle cx="1370" cy="760" r="95" fill="#62c46c" stroke="#17221a" stroke-width="10"/>${person(1480,720,"#e76f51","panic",.55)}${person(1670,800,"#3a86ff","panic",.48)}${bubbleAnimal(980,760,340,250,"CHAT","#55b96e",false)}`; break;
    case "monkey": s+=`${placard(250,340,650,600,"TIME MACHINE","#dbeafe")}${person(650,590,"#8b1e3f","run",.8)}${person(1430,610,"#283618","point",.8)}${placard(1570,270,330,330,"DEADLINE\n00:02","#fff1f2")}`; break;
    case "elephant": s+=`${person(650,650,"#3a86ff","stand",.65)}${person(900,650,"#e76f51","stand",.65)}${person(1150,650,"#606c38","stand",.65)}${placard(720,320,520,180,"LAB RECORD","#fff7dc")}${person(1630,600,"#8b1e3f","run",.72)}`; break;
    case "giraffe": s+=`${placard(260,350,820,430,"CANTEEN","#ffe8c2")}<path d="M1650 190 C1550 380 1450 520 1160 590" fill="none" stroke="#e0ad4f" stroke-width="110"/><circle cx="1690" cy="150" r="115" fill="#e0ad4f" stroke="#17221a" stroke-width="12"/><rect x="1060" y="560" width="270" height="70" rx="35" fill="#fff" stroke="#17221a" stroke-width="10"/><circle cx="1195" cy="590" r="80" fill="#d07b2a"/>${person(540,700,"#3a86ff","panic",.62)}${person(860,710,"#8b1e3f","panic",.62)}`; break;
    case "koala": s+=`${placard(830,350,430,430,"ONLY WORKING\nSOCKET","#fff")}${bubbleAnimal(1045,660,330,250,"KOALA","#9ca3af")}${placard(880,780,350,110,"CHARGING")}${person(430,760,"#3a86ff","stand",.62)}${person(1640,760,"#e76f51","stand",.62)}`; break;
    case "bear": s+=`${desk(690,620,760)}${bubbleAnimal(1060,440,420,330,"BEAR CHEF","#8b5e3c")}${placard(910,630,300,90,"1 PLATE")}${person(420,750,"#3a86ff","stand",.55)}${person(1660,750,"#8b1e3f","stand",.55)}${person(1850,770,"#606c38","stand",.5)}`; break;
    case "wolf": s+=`<path d="M350 760 Q980 390 1750 680 L1650 860 Q920 630 300 920 Z" fill="#fff7dc" stroke="#17221a" stroke-width="15"/>${placard(780,600,520,130,"HALL TICKET")}${person(1050,360,"#283618","stand",.82)}${person(1670,640,"#e76f51","run",.65)}`; break;
    case "rabbit": s+=`${bubbleAnimal(650,680,330,250,"RABBIT","#f7f7f7")}${person(980,630,"#3a86ff","run",.75)}${placard(1500,380,400,300,"SUBMIT\nDEADLINE","#ffe4e6")}${speed(640,620)}`; break;
    case "owl": s+=`<rect width="${W}" height="${H}" fill="#17223b"/><circle cx="1800" cy="180" r="120" fill="#fff7bd"/>${placard(300,220,680,470,"MIDNIGHT CLASS","#eef2ff")}${bubbleAnimal(1260,500,360,310,"OWL","#8b6f47")}${person(540,820,"#3a86ff","sit",.5)}${person(900,830,"#8b1e3f","sit",.5)}${placard(1570,360,300,260,"12:47 AM","#fff")}`; break;
    case "crocodile": s+=`${bubbleAnimal(1100,600,760,280,"CROCODILE","#4f8f4f",false)}${placard(910,560,360,100,"FINAL POROTTA","#fff7dc")}${person(420,720,"#3a86ff","run",.6)}${person(1740,720,"#e76f51","run",.6)}`; break;
    case "shark": s+=`<rect width="${W}" height="${H}" fill="#bde9ff"/>${desk(650,650,850)}${fish(850,480,"SHARK","#80a9bd")}${person(1450,480,"#283618","sit",.8)}${placard(850,210,600,120,"PLACEMENT INTERVIEW")}`; break;
    case "dolphin": s+=`<rect width="${W}" height="${H}" fill="#dff7ff"/>${desk(680,650,740)}${fish(650,480,"DOLPHIN","#72c7e7")}${placard(900,470,360,210,"PROJECT\nDEMO","#eef5ff")}${person(1550,570,"#283618","stand",.7)}${person(1760,580,"#8b1e3f","stand",.65)}`; break;
    case "parrot": s+=`${bubbleAnimal(1100,280,360,260,"PARROT","#ef4444",false)}${placard(700,520,300,120,"EXAM")}${placard(1040,590,350,120,"TIMETABLE")}${placard(1420,500,330,120,"EXAM")}${person(650,790,"#3a86ff","run",.55)}${person(1500,790,"#8b1e3f","run",.55)}`; break;
    case "gorilla": s+=`${bubbleAnimal(920,610,600,430,"GORILLA","#4b4542")}${placard(780,590,500,250,"BROKEN PC","#e5e7eb")}${person(1500,700,"#3a86ff","point",.6)}${placard(1590,300,360,130,"TECH SUPPORT")}`; break;
    case "kangaroo": s+=`${bubbleAnimal(1050,590,570,470,"KANGAROO","#b87942",false)}${placard(900,620,300,130,"ASSIGNMENTS")}${person(1550,580,"#8b1e3f","point",.75)}${person(480,720,"#3a86ff","panic",.55)}`; break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${s}<rect x="18" y="18" width="${W-36}" height="${H-36}" rx="40" fill="none" stroke="#283618" stroke-width="18" opacity=".45"/></svg>`;
}

for (const team of TEAMS) {
  const dir=resolve(root,team.slug);
  await mkdir(dir,{recursive:true});
  const svg=scene(team.slug,team.color);
  await sharp(Buffer.from(svg)).webp({quality:92}).toFile(resolve(dir,"source.webp"));
}
console.log(`Generated ${TEAMS.length} original comic mystery sources under ${root}.`);
