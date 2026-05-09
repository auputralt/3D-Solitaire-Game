export class PlayerProfile {
  constructor() {
    this.storageKey = 'solitaire_profile';
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to load profile:', e);
    }
    return null;
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save profile:', e);
    }
  }

  hasProfile() {
    return this.data !== null && this.data.name && this.data.name.length > 0;
  }

  getName() {
    return this.data?.name || '';
  }

  setName(name) {
    if (!this.data) {
      this.data = {
        name: name.trim(),
        stats: { gamesPlayed: 0, gamesWon: 0, bestTime: Infinity }
      };
    } else {
      this.data.name = name.trim();
    }
    this.save();
  }

  getStats() {
    return this.data?.stats || { gamesPlayed: 0, gamesWon: 0, bestTime: Infinity };
  }

  updateStats(won, timeSeconds) {
    if (!this.data) return;
    this.data.stats.gamesPlayed++;
    if (won) {
      this.data.stats.gamesWon++;
      if (timeSeconds < this.data.stats.bestTime) {
        this.data.stats.bestTime = timeSeconds;
      }
    }
    this.save();
  }
}
