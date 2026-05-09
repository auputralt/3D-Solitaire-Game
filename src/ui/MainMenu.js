export class MainMenu {
  constructor(container) {
    this.container = container;
    this.callbacks = {};
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  show(playerName, hasSave) {
    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="menu-content">
        <div class="menu-title-section">
          <div class="menu-suits">♠ ♥ ♦ ♣</div>
          <h1 class="menu-title">3D Solitaire</h1>
          <div class="menu-subtitle">Klondike</div>
          <div class="menu-divider"></div>
          <div class="menu-player">Player: ${this.escapeHtml(playerName)}</div>
        </div>
        <div class="menu-buttons">
          <button class="btn btn-primary menu-btn" id="menu-new">New Game</button>
          ${hasSave ? '<button class="btn menu-btn" id="menu-resume">Resume Game</button>' : ''}
          <button class="btn menu-btn" id="menu-stats">Statistics</button>
          <button class="btn menu-btn" id="menu-settings">Settings</button>
        </div>
      </div>
    `;

    const bind = (id, event) => {
      const el = this.container.querySelector(`#${id}`);
      if (el) el.addEventListener('click', () => this.callbacks[event]?.());
    };

    bind('menu-new', 'newGame');
    bind('menu-resume', 'resume');
    bind('menu-stats', 'stats');
    bind('menu-settings', 'settings');
  }

  hide() {
    this.container.style.display = 'none';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
