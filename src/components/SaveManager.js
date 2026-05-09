export class SaveManager {
  constructor() {
    this.prefix = 'solitaire_';
  }

  save(gameState, playerName) {
    try {
      const key = this.prefix + 'save_' + playerName;
      localStorage.setItem(key, JSON.stringify(gameState));
    } catch (e) {
      console.warn('Failed to save game:', e);
    }
  }

  load(playerName) {
    try {
      const key = this.prefix + 'save_' + playerName;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Failed to load game:', e);
      return null;
    }
  }

  hasSave(playerName) {
    return localStorage.getItem(this.prefix + 'save_' + playerName) !== null;
  }

  clear(playerName) {
    localStorage.removeItem(this.prefix + 'save_' + playerName);
  }
}
