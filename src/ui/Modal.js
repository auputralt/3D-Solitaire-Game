export class Modal {
  constructor(container) {
    this.container = container;
    this.container.style.display = 'none';
  }

  show(content) {
    this.container.innerHTML = '';
    this.container.style.display = 'flex';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = content;
    this.container.appendChild(overlay);

    return overlay;
  }

  hide() {
    this.container.style.display = 'none';
    this.container.innerHTML = '';
  }

  showNameEntry() {
    return new Promise((resolve) => {
      const content = `
        <div class="modal-panel">
          <h2 class="modal-title">Welcome to</h2>
          <h1 class="modal-title-large">3D Solitaire</h1>
          <div class="modal-divider"></div>
          <p class="modal-text">Enter your name to begin</p>
          <input type="text" id="name-input" class="modal-input" placeholder="Your name" maxlength="20" autocomplete="off">
          <button id="name-submit" class="btn btn-primary">Play</button>
        </div>
      `;

      const overlay = this.show(content);

      const input = overlay.querySelector('#name-input');
      const btn = overlay.querySelector('#name-submit');

      const submit = () => {
        const name = input.value.trim();
        if (name.length > 0) {
          this.hide();
          resolve(name);
        }
      };

      btn.addEventListener('click', submit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });

      setTimeout(() => input.focus(), 100);
    });
  }

  showResumePrompt() {
    return new Promise((resolve) => {
      const content = `
        <div class="modal-panel">
          <h2 class="modal-title">Welcome Back</h2>
          <div class="modal-divider"></div>
          <p class="modal-text">You have a saved game. Would you like to continue?</p>
          <div class="modal-buttons">
            <button id="resume-btn" class="btn btn-primary">Resume</button>
            <button id="new-game-btn" class="btn">New Game</button>
          </div>
        </div>
      `;

      const overlay = this.show(content);

      overlay.querySelector('#resume-btn').addEventListener('click', () => {
        this.hide();
        resolve('resume');
      });

      overlay.querySelector('#new-game-btn').addEventListener('click', () => {
        this.hide();
        resolve('new');
      });
    });
  }

  showStats(stats) {
    const winRate = stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;
    const bestTime = stats.bestTime < Infinity
      ? this.formatTime(stats.bestTime)
      : '--:--';

    const content = `
      <div class="modal-panel">
        <h2 class="modal-title">Statistics</h2>
        <div class="modal-divider"></div>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">${stats.gamesPlayed}</span>
            <span class="stat-label">Games Played</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${stats.gamesWon}</span>
            <span class="stat-label">Games Won</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${winRate}%</span>
            <span class="stat-label">Win Rate</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${bestTime}</span>
            <span class="stat-label">Best Time</span>
          </div>
        </div>
        <button id="stats-close" class="btn">Close</button>
      </div>
    `;

    const overlay = this.show(content);

    return new Promise((resolve) => {
      overlay.querySelector('#stats-close').addEventListener('click', () => {
        this.hide();
        resolve();
      });
    });
  }

  showSettings(settings) {
    return new Promise((resolve) => {
      const content = `
        <div class="modal-panel">
          <h2 class="modal-title">Settings</h2>
          <div class="modal-divider"></div>
          <div class="settings-group">
            <label class="setting-label">Draw Mode</label>
            <div class="setting-toggle-group">
              <button class="setting-toggle ${settings.drawMode === 1 ? 'active' : ''}" data-draw="1">Draw 1</button>
              <button class="setting-toggle ${settings.drawMode === 3 ? 'active' : ''}" data-draw="3">Draw 3</button>
            </div>
          </div>
          <div class="settings-group">
            <label class="setting-label">Sound</label>
            <div class="setting-toggle-group">
              <button class="setting-toggle ${!settings.muted ? 'active' : ''}" data-sound="on">On</button>
              <button class="setting-toggle ${settings.muted ? 'active' : ''}" data-sound="off">Off</button>
            </div>
          </div>
          <button id="settings-close" class="btn btn-primary">Done</button>
        </div>
      `;

      const overlay = this.show(content);
      const result = { ...settings };

      overlay.querySelectorAll('[data-draw]').forEach(btn => {
        btn.addEventListener('click', () => {
          result.drawMode = parseInt(btn.dataset.draw);
          overlay.querySelectorAll('[data-draw]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      overlay.querySelectorAll('[data-sound]').forEach(btn => {
        btn.addEventListener('click', () => {
          result.muted = btn.dataset.sound === 'off';
          overlay.querySelectorAll('[data-sound]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      overlay.querySelector('#settings-close').addEventListener('click', () => {
        this.hide();
        resolve(result);
      });
    });
  }

  showWin(stats) {
    const content = `
      <div class="modal-panel modal-win">
        <h1 class="modal-title-large">Congratulations!</h1>
        <div class="modal-divider"></div>
        <p class="modal-text">You won in ${this.formatTime(stats.time)} with ${stats.moves} moves!</p>
        <div class="modal-buttons">
          <button id="win-new" class="btn btn-primary">New Game</button>
        </div>
      </div>
    `;

    const overlay = this.show(content);

    return new Promise((resolve) => {
      overlay.querySelector('#win-new').addEventListener('click', () => {
        this.hide();
        resolve();
      });
    });
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
