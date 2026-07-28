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
  "A cat teaches engineering while the professor sleeps at a desk.",
  "Seniors carry a student like royalty into a college event.",
  "A student proposes to biriyani while friends celebrate.",
  "A lab record is carried like sacred treasure through a chase.",
  "A robot begs a student to stop submitting assignments at midnight.",
  "A penguin conducts a viva while students hide under desks.",
  "A giant calculator runs away from an engineering exam.",
  "A student surfs across campus on a giant hall ticket.",
  "A faculty member races an auto carrying late students.",
  "A group worships the one working college power socket.",
  "A dinosaur checks attendance while students climb through a window.",
  "A senior fishes freshers out of seven WhatsApp groups.",
  "A student duels a printer that refuses to print the record.",
  "A crocodile guards the canteen's final porotta.",
  "A dolphin presents a seminar while the class applauds underwater.",
  "A parrot leaks the exam timetable into the college corridor.",
  "A gorilla carries a broken lab computer to technical support.",
  "A kangaroo smuggles assignments in its pouch before deadline."
];

export const TEAMS: TeamDefinition[] = definitions.map(([slug, name, emoji, color], index) => ({
  slug,
  name,
  emoji,
  color,
  volunteer: `Volunteer ${String(index + 1).padStart(2, "0")} (placeholder)`,
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

export const MEME_TEMPLATES = Array.from({ length: 14 }, (_, index) => ({
  id: `pose-${String(index + 1).padStart(2, "0")}`,
  title: [
    "Absolute Cinema", "Distracted Duo", "Pointing Spidermen", "Dramatic Handshake",
    "Surprised Committee", "Tiny Interview", "Confused Seminar", "Epic Approval",
    "Last Bench Council", "Record Submission", "Canteen Discovery", "Attendance Panic",
    "Volunteer Recruitment", "Deadline Sprint"
  ][index],
  groupSize: index === 13 ? 3 : 2,
  safeForOrientation: true
}));

export const PHASES = ["SETUP", "ASSEMBLY", "MEME", "MYSTERY", "REVEAL", "ENDED"] as const;
export type Phase = typeof PHASES[number];
