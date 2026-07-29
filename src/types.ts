export type TeamProgress = {
  id: string; slug: string; name: string; emoji: string; color: string; order: number;
  participants: number; checkedIn: number; target: number; totalPairs: number; matchedPairs: number;
  tilesUnlocked: number; theoryLocked: boolean;
};

export type PublicSnapshot = {
  event: { phase: string; mysteryEndsAt?: string | null; revealTeamId?: string | null; revealStep?: string };
  teams: TeamProgress[];
};

export type Participant = {
  id: string; displayName: string; active: boolean; checkedIn: boolean; phase: string;
  team: { id: string; slug: string; name: string; emoji: string; color: string; volunteer: string };
  meme: null | { title: string; instruction: string; groupSize: number; group: string[]; referenceUrl: string };
  mystery: {
    role: "NONE" | "QUESTION" | "ANSWER" | "DETECTIVE";
    question?: string | null; answer?: string | null; answerKey?: string | null;
    paired: boolean; tileUrl?: string | null;
  };
};
