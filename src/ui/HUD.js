export class HUD {
  constructor(container) {
    this.container = container;
    this.callbacks = {};
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  show(playerName) {
    this.container.style.display = 'block';
    this.container.innerHTML = `
      <div class="hud-row">
        <div class="hud-left">
          <span class="hud-player">${this.escapeHtml(playerName)}</span>
        </div>
        <div class="hud-center">
          <span class="hud-stat">Moves: <span id="hud-moves">0</span></span>
          <span class="hud-stat">Time: <span id="hud-timer">0:00</span></span>
        </div>
        <div class="hud-right">
          <button class="btn btn-sm" id="hud-undo">Undo</button>
          <button class="btn btn-sm" id="hud-menu">Menu</button>
        </div>
      </div>
    `;

    this.container.querySelector('#hud-undo')?.addEventListener('click', () => this.callbacks.undo?.());
    this.container.querySelector('#hud-menu')?.addEventListener('click', () => this.callbacks.menu?.());
  }

  hide() {
    this.container.style.display = 'none';
  }

  updateMoves(count) {
    const el = this.container.querySelector('#hud-moves');
    if (el) el.textContent = count;
  }

  updateTimer(seconds) {
    const el = this.container.querySelector('#hud-timer');
    if (el) {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
