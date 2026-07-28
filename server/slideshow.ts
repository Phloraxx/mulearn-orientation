export type Slide = { id: string; createdAt: string; shownAt?: string | null };

export function displayDurationMs(unseenBacklog: number) {
  return Math.round(Math.max(1.5, Math.min(5, 30 / Math.max(unseenBacklog, 1))) * 1000);
}

export class Slideshow {
  private unseen: Slide[] = [];
  private history: Slide[] = [];
  private recent: string[] = [];

  constructor(slides: Slide[] = [], private recentLimit = 12, private random = Math.random) {
    slides
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .forEach(slide => slide.shownAt ? this.history.push(slide) : this.unseen.push(slide));
  }

  add(slide: Slide) {
    if (![...this.unseen, ...this.history].some(item => item.id === slide.id)) this.unseen.push(slide);
  }

  next() {
    let slide: Slide | undefined;
    if (this.unseen.length) {
      slide = this.unseen.shift();
      if (slide) this.history.push(slide);
    } else if (this.history.length) {
      const eligible = this.history.filter(item => !this.recent.includes(item.id));
      const pool = eligible.length ? eligible : this.history.filter(item => item.id !== this.recent.at(-1));
      const choices = pool.length ? pool : this.history;
      slide = choices[Math.floor(this.random() * choices.length)];
    }
    if (!slide) return null;
    this.recent.push(slide.id);
    if (this.recent.length > Math.min(this.recentLimit, Math.max(1, this.history.length - 1))) this.recent.shift();
    return { slide, durationMs: displayDurationMs(this.unseen.length), unseenBacklog: this.unseen.length };
  }
}
