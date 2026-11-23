// The hurricane: a 7-day countdown that drives the story. Each chapter is a
// day; the storm swells toward day 7, raising rain and wind and darkening the
// sky, and the final mission plays in the eye of the storm.
import { CHAPTERS } from './config.js';
import { clamp } from './random.js';

export class Hurricane {
  constructor() {
    this.day = 1;
    this.elapsed = 0; // seconds into the current day
    this.dayLengthSec = 240;
  }

  get chapter() {
    return CHAPTERS[this.day - 1] || CHAPTERS[6];
  }

  // 0 at day 1, 1 on day 7.
  get storm() {
    return clamp((this.day - 1) / 6 + this.elapsed / this.dayLengthSec / 6, 0, 1);
  }

  update(dt, world) {
    this.elapsed += dt;
    if (this.elapsed >= this.dayLengthSec && this.day < 7) {
      this.day += 1;
      this.elapsed = 0;
      return `Day ${this.day} — the hurricane is closer. ${this.chapter}`;
    }
    // Rain grows with the storm; day 7 is a full storm.
    const target = this.day >= 7 ? 0.85 : this.storm * 0.55;
    world.setRain(clamp(target, 0, 1));
    return null;
  }

  setDay(day) {
    this.day = clamp(day, 1, 7);
    this.elapsed = 0;
  }
}
