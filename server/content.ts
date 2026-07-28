export type TeamDefinition = {
  slug: string;
  name: string;
  emoji: string;
  color: string;
  volunteer: string;
  mystery: string;
};

const definitions: Array<[string, string, string, string]> = [
  ["lion", "Lion", "🦁", "#ffb000"],
  ["tiger", "Tiger", "🐯", "#ff6b2c"],
  ["panda", "Panda", "🐼", "#f4f4f5"],
  ["zebra", "Zebra", "🦓", "#d8d8df"],
  ["penguin", "Penguin", "🐧", "#60a5fa"],
  ["fox", "Fox", "🦊", "#f97316"],
  ["monkey", "Monkey", "🐒", "#a16207"],
  ["elephant", "Elephant", "🐘", "#94a3b8"],
  ["giraffe", "Giraffe", "🦒", "#facc15"],
  ["koala", "Koala", "🐨", "#a3a3a3"],
  ["bear", "Bear", "🐻", "#92400e"],
  ["wolf", "Wolf", "🐺", "#64748b"],
  ["rabbit", "Rabbit", "🐰", "#f9a8d4"],
  ["owl", "Owl", "🦉", "#c084fc"],
  ["crocodile", "Crocodile", "🐊", "#22c55e"],
  ["shark", "Shark", "🦈", "#38bdf8"],
  ["dolphin", "Dolphin", "🐬", "#2dd4bf"],
  ["parrot", "Parrot", "🦜", "#ef4444"],
  ["gorilla", "Gorilla", "🦍", "#78716c"],
  ["kangaroo", "Kangaroo", "🦘", "#d97706"]
];

const mysteries = [
  "A senior escapes on a dinosaur while juniors chase with event forms.",
  "A professor chases a student carrying the attendance register.",
  "A cat conducts an engineering viva while nervous students take notes.",
  "A student duels a printer that refuses to print the lab record.",
  "A penguin confidently presents an engineering seminar to students.",
  "A senior fishes freshers out of a giant pile of WhatsApp groups.",
  "A student tries to enter a time machine before the assignment deadline.",
  "Students carry one lab record through campus like sacred treasure.",
  "A giraffe steals the final plate of biriyani through a canteen window.",
  "Students worship the only working socket while a koala charges a laptop.",
  "A bear chef serves one tiny plate to a huge queue of hungry students.",
  "A student surfs across campus on an enormous hall ticket.",
  "A rabbit races a student toward an assignment deadline.",
  "An owl lectures exhausted students at midnight.",
  "A crocodile guards the canteen's final porotta.",
  "A shark conducts a formal placement interview underwater.",
  "A dolphin demonstrates a laptop project to a panel.",
  "A parrot drops exam timetable papers while students chase below.",
  "A gorilla carries a broken desktop computer to technical support.",
  "A kangaroo secretly stuffs assignments into its pouch before deadline."
];

export const TEAMS: TeamDefinition[] = definitions.map(([slug, name, emoji, color], index) => ({
  slug,
  name,
  emoji,
  color,
  // The live game is intentionally animal-zone based. The person physically standing in
  // each zone is pre-selected by organisers, but a real name is not required by the app.
  volunteer: `${name} Volunteer`,
  mystery: mysteries[index]
}));

export const QA_BANK = [
  ["Senior \"oru cheriya help und\" ennu paranjaal?", "Ninte next 3 divasam poyi ennu karuthikko."],
  ["Eventinu volunteer aavan interest undo ennu chodichaal?", "Reply cheyyumbozhekkum groupil add aayi kaanum."],
  ["Senior ninte number save cheythaal next entha?", "Ninte free time officially over."],
  ["Seniorsinte favourite starting dialogue entha?", "\"Njangal first year aayirunnappo...\""],
  ["KTU result eppo varum?", "Ath KTUvinum ariyilla."],
  ["Exam thale divasam biggest confidence entha?", "\"Naale ravile padikkaam.\""],
  ["Revaluation koduthittu student entha vicharikkunne?", "\"Ithavana universe ente side aanu.\""],
  ["Exam kazhinju \"easy aayirunnu\" ennu parayunnavan aaranu?", "Groupinte samadhanam kalayaan vannavan."],
  ["Collegeil ettavum fast spread aavunna news entha?", "\"Last hour free aanu.\""],
  ["Sahrdayayil vazhi ariyillenkil best navigation entha?", "Confident aayi nadakkunna aalude pinnale povuka."],
  ["Assignment serious aavunna exact time eppozha?", "Deadlineinu randu minute munpu."],
  ["Oru clubil mathram join cheyyam ennu paranja first year studentinu entha sambhavikkum?", "Ezhu WhatsApp groupil ethum."],
  ["\"Oru small orientation aanu\" ennu paranjaal?", "500+ pere hallil kaanum."],
  ["Faculty varilla enna newsinte speed ethra?", "College Wi-Fi-nekkal fast."]
] as const;

export const MEME_TEMPLATES = [
  { id: "pose-01", title: "Spider-Man Pointing", groupSize: 2 },
  { id: "pose-02", title: "Epic Handshake", groupSize: 2 },
  { id: "pose-03", title: "Absolute Cinema", groupSize: 2 },
  { id: "pose-04", title: "Drake Hotline Bling", groupSize: 2 },
  { id: "pose-05", title: "Woman Yelling At Cat", groupSize: 2 },
  { id: "pose-06", title: "Two Buttons", groupSize: 2 },
  { id: "pose-07", title: "Running Away Balloon", groupSize: 2 },
  { id: "pose-08", title: "American Chopper Argument", groupSize: 2 },
  { id: "pose-09", title: "Change My Mind", groupSize: 2 },
  { id: "pose-10", title: "Surprised Pikachu", groupSize: 2 },
  { id: "pose-11", title: "Disaster Girl", groupSize: 2 },
  { id: "pose-12", title: "UNO Draw 25", groupSize: 2 },
  { id: "pose-13", title: "Is This A Pigeon", groupSize: 2 },
  { id: "pose-14", title: "Leonardo DiCaprio Cheers", groupSize: 2 },
  { id: "pose-15", title: "Distracted Boyfriend", groupSize: 3 }
].map(template => ({ ...template, safeForOrientation: true }));

export const PAIR_MEME_TEMPLATES = MEME_TEMPLATES.filter(template => template.groupSize === 2);
export const TRIO_MEME_TEMPLATE = MEME_TEMPLATES.find(template => template.groupSize === 3)!;

export const PHASES = ["SETUP", "ASSEMBLY", "MEME", "MYSTERY", "REVEAL", "ENDED"] as const;
export type Phase = typeof PHASES[number];
