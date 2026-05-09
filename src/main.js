import * as THREE from 'three';
import { Card } from './components/Card.js';
import { Deck } from './components/Deck.js';
import { GameBoard } from './components/GameBoard.js';
import { GameLogic } from './components/GameLogic.js';
import { AudioManager } from './components/AudioManager.js';
import { PlayerProfile } from './components/PlayerProfile.js';
import { SaveManager } from './components/SaveManager.js';
import { HUD } from './ui/HUD.js';
import { MainMenu } from './ui/MainMenu.js';
import { Modal } from './ui/Modal.js';

class SolitaireGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.hudEl = document.getElementById('hud');
    this.menuEl = document.getElementById('main-menu');
    this.modalEl = document.getElementById('modal-overlay');

    this.profile = new PlayerProfile();
    this.saveManager = new SaveManager();
    this.audio = new AudioManager();
    this.settings = { drawMode: 1, muted: false };

    this.hud = new HUD(this.hudEl);
    this.mainMenu = new MainMenu(this.menuEl);
    this.modal = new Modal(this.modalEl);

    this.logic = null;
    this.board = null;
    this.deck = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.dragState = null;
    this.timerInterval = null;
    this.isPlaying = false;
    this.pointerDownTime = 0;

    this.confettiParticles = [];
    this.confettiCanvas = null;
    this.confettiCtx = null;

    this.setupUI();
    this.setupThree();
    this.animate();
    this.start();
  }

  setupThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1f0d);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 22, 16);
    this.camera.lookAt(0, 0, 2);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Warm overhead light — simulates a desk lamp
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.35);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfff8e8, 1.2);
    mainLight.position.set(3, 20, 8);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 1;
    mainLight.shadow.camera.far = 40;
    mainLight.shadow.camera.left = -16;
    mainLight.shadow.camera.right = 16;
    mainLight.shadow.camera.top = 16;
    mainLight.shadow.camera.bottom = -16;
    mainLight.shadow.bias = -0.0005;
    mainLight.shadow.normalBias = 0.02;
    this.scene.add(mainLight);

    // Warm fill from the side
    const fillLight = new THREE.DirectionalLight(0xffd090, 0.3);
    fillLight.position.set(-8, 12, -6);
    this.scene.add(fillLight);

    // Subtle rim light from behind
    const rimLight = new THREE.DirectionalLight(0xc0d0ff, 0.15);
    rimLight.position.set(0, 8, -15);
    this.scene.add(rimLight);

    // Point light for card highlights
    const spotLight = new THREE.PointLight(0xfff0d0, 0.4, 30);
    spotLight.position.set(0, 12, 0);
    this.scene.add(spotLight);

    Card.generateTextures();
    this.board = new GameBoard(this.scene);

    window.addEventListener('resize', () => this.onResize());
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
  }

  setupUI() {
    this.hud.on('undo', () => this.doUndo());
    this.hud.on('menu', () => this.showMenu());

    this.mainMenu.on('newGame', () => this.newGame());
    this.mainMenu.on('resume', () => this.resumeGame());
    this.mainMenu.on('stats', () => this.showStats());
    this.mainMenu.on('settings', () => this.showSettings());
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  async start() {
    this.audio.init();

    if (!this.profile.hasProfile()) {
      const name = await this.modal.showNameEntry();
      this.profile.setName(name);
    }

    this.settings.muted = this.audio.isMuted();

    if (this.saveManager.hasSave(this.profile.getName())) {
      const choice = await this.modal.showResumePrompt();
      if (choice === 'resume') {
        this.resumeGame();
      } else {
        this.newGame();
      }
    } else {
      this.newGame();
    }
  }

  newGame() {
    this.mainMenu.hide();
    this.modal.hide();
    this.clearConfetti();
    this.stopTimer();

    this.cleanupDeck();

    this.deck = new Deck();
    this.deck.shuffle();

    // Position all cards off-screen initially, face down
    for (let i = 0; i < this.deck.allCards.length; i++) {
      const card = this.deck.allCards[i];
      this.scene.add(card.mesh);
      card.mesh.position.set(0, 5 + i * 0.01, 0);
      card.mesh.rotation.set(Math.PI, 0, 0);
      card.targetPosition.set(0, 5 + i * 0.01, 0);
      card.targetRotation.set(Math.PI, 0, 0);
      card.faceUp = false;
    }

    this.logic = new GameLogic(this.settings.drawMode);
    this.logic.deal(this.deck);

    this.updateCardPositions(false);
    this.hud.show(this.profile.getName());
    this.hud.updateMoves(0);
    this.hud.updateTimer(0);

    this.saveManager.clear(this.profile.getName());
    this.isPlaying = true;
    this.startTimer();
  }

  resumeGame() {
    this.mainMenu.hide();
    this.modal.hide();

    const saveData = this.saveManager.load(this.profile.getName());
    if (!saveData) {
      this.newGame();
      return;
    }

    this.cleanupDeck();

    this.deck = new Deck();
    for (const card of this.deck.allCards) {
      this.scene.add(card.mesh);
    }

    this.logic = GameLogic.deserialize(saveData, this.deck);
    this.settings.drawMode = this.logic.drawMode;

    this.updateCardPositions(true);
    this.hud.show(this.profile.getName());
    this.hud.updateMoves(this.logic.moveCount);
    this.hud.updateTimer(this.logic.elapsedSeconds);

    this.isPlaying = true;
    this.startTimer();
  }

  cleanupDeck() {
    if (this.deck) {
      for (const card of this.deck.allCards) {
        if (card.mesh && card.mesh.parent) {
          this.scene.remove(card.mesh);
        }
      }
    }
  }

  updateCardPositions(snap = false) {
    if (!this.logic) return;

    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < this.logic.tableau[col].length; row++) {
        const card = this.logic.tableau[col][row];
        const pos = this.board.getTableauCardPosition(col, row, this.logic.tableau);
        card.setPosition(pos.x, pos.y, pos.z, snap);
        card.setRotation(card.faceUp ? 0 : Math.PI, 0, 0, snap);
      }
    }

    for (let f = 0; f < 4; f++) {
      for (let i = 0; i < this.logic.foundation[f].length; i++) {
        const card = this.logic.foundation[f][i];
        const pos = this.board.getFoundationCardPosition(f, i);
        card.setPosition(pos.x, pos.y, pos.z, snap);
        card.setRotation(0, 0, 0, snap);
      }
    }

    for (let i = 0; i < this.logic.stock.length; i++) {
      const card = this.logic.stock[i];
      const pos = this.board.getStockPosition(i);
      card.setPosition(pos.x, pos.y, pos.z, snap);
      card.setRotation(Math.PI, 0, 0, snap);
    }

    for (let i = 0; i < this.logic.waste.length; i++) {
      const card = this.logic.waste[i];
      const pos = this.board.getWastePosition(i, this.logic.waste.length);
      card.setPosition(pos.x, pos.y, pos.z, snap);
      card.setRotation(0, 0, 0, snap);
    }
  }

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.isPlaying && this.logic) {
        this.logic.elapsedSeconds++;
        this.hud.updateTimer(this.logic.elapsedSeconds);
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  autoSave() {
    if (this.logic && this.profile.getName()) {
      this.saveManager.save(this.logic.serialize(), this.profile.getName());
    }
  }

  getMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  getWorldPosition(event) {
    this.getMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(plane, target);
    return hit ? target : null;
  }

  raycastCards(event) {
    if (!this.deck || !this.logic) return null;
    this.getMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const cardMeshes = this.deck.allCards.map(c => c.mesh).filter(Boolean);
    const intersects = this.raycaster.intersectObjects(cardMeshes, false);

    for (const hit of intersects) {
      if (hit.object.userData.card) {
        return hit.object.userData.card;
      }
    }
    return null;
  }

  onPointerDown(event) {
    if (!this.isPlaying || !this.logic) return;
    this.pointerDownTime = Date.now();

    const card = this.raycastCards(event);
    if (!card) {
      const worldPos = this.getWorldPosition(event);
      if (worldPos && this.board.isOverStock(worldPos)) {
        this.drawFromStock();
      }
      return;
    }

    if (this.logic.isInStock(card)) {
      this.drawFromStock();
      return;
    }

    if (!card.faceUp) return;

    const info = this.logic.findCard(card);
    if (!info) return;

    if (info.type === 'waste' && !this.logic.isTopCard(card)) return;
    if (info.type === 'foundation' && !this.logic.isTopCard(card)) return;

    let dragCards;
    if (info.type === 'tableau') {
      dragCards = this.logic.getTableauStackFrom(info.index, info.position);
    } else {
      dragCards = [card];
    }

    if (dragCards.length === 0) return;

    const worldPos = this.getWorldPosition(event);
    if (!worldPos) return;

    this.dragState = {
      cards: dragCards,
      fromInfo: info,
      startWorldPos: worldPos.clone(),
      offsets: dragCards.map(c => {
        const wp = new THREE.Vector3();
        c.mesh.getWorldPosition(wp);
        return {
          x: wp.x - worldPos.x,
          y: wp.y,
          z: wp.z - worldPos.z
        };
      }),
      originalPositions: dragCards.map(c => ({
        x: c.targetPosition.x,
        y: c.targetPosition.y,
        z: c.targetPosition.z
      })),
      moved: false,
      dragPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -dragCards[0].mesh.position.y - 0.5)
    };

    // Lift cards above table
    for (let i = 0; i < dragCards.length; i++) {
      const c = dragCards[i];
      c.targetPosition.y = c.mesh.position.y + 0.5 + i * 0.015;
    }
  }

  onPointerMove(event) {
    if (!this.dragState) return;

    const worldPos = this.getWorldPosition(event);
    if (!worldPos) return;

    // Check minimum drag distance
    if (!this.dragState.moved) {
      const dx = worldPos.x - this.dragState.startWorldPos.x;
      const dz = worldPos.z - this.dragState.startWorldPos.z;
      if (Math.sqrt(dx * dx + dz * dz) < 0.3) return;
      this.dragState.moved = true;
    }

    for (let i = 0; i < this.dragState.cards.length; i++) {
      const c = this.dragState.cards[i];
      const off = this.dragState.offsets[i];
      c.targetPosition.x = worldPos.x + off.x;
      c.targetPosition.z = worldPos.z + off.z;
      c.targetPosition.y = off.y + 0.5 + i * 0.015;
    }

    const validTargets = this.getValidTargets(this.dragState.cards, this.dragState.fromInfo);
    this.board.showHighlights(validTargets);
  }

  onPointerUp(event) {
    if (!this.dragState) return;

    const state = this.dragState;
    this.dragState = null;
    this.board.clearHighlights();

    if (!state.moved) {
      // Treat as a click — try auto-move to foundation
      const card = state.cards[0];
      if (state.cards.length === 1) {
        this.tryAutoMoveToFoundation(card, state.fromInfo);
      }
      // Return cards to original position
      for (let i = 0; i < state.cards.length; i++) {
        const c = state.cards[i];
        const orig = state.originalPositions[i];
        c.targetPosition.set(orig.x, orig.y, orig.z);
      }
      return;
    }

    const worldPos = this.getWorldPosition(event);
    if (!worldPos) {
      this.returnDragCards(state);
      return;
    }

    const target = this.board.getPileAtPosition(worldPos);
    if (!target) {
      this.returnDragCards(state);
      return;
    }

    // Don't allow dropping on same pile
    if (target.type === state.fromInfo.type && target.index === state.fromInfo.index) {
      this.returnDragCards(state);
      return;
    }

    const toInfo = { type: target.type, index: target.index };
    if (this.logic.canMove(state.cards, state.fromInfo, toInfo)) {
      this.logic.executeMove(state.cards, state.fromInfo, toInfo);
      this.audio.playCardPlace();
      this.hud.updateMoves(this.logic.moveCount);
      this.updateCardPositions();
      this.autoSave();
      this.checkWinCondition();
    } else {
      this.audio.playInvalid();
      this.returnDragCards(state);
    }
  }

  onDoubleClick(event) {
    if (!this.isPlaying || !this.logic) return;

    const card = this.raycastCards(event);
    if (!card || !card.faceUp) return;

    const info = this.logic.findCard(card);
    if (!info) return;
    if (!this.logic.isTopCard(card)) return;

    this.tryAutoMoveToFoundation(card, info);
  }

  tryAutoMoveToFoundation(card, info) {
    for (let f = 0; f < 4; f++) {
      const toInfo = { type: 'foundation', index: f };
      if (this.logic.canMove([card], info, toInfo)) {
        this.logic.executeMove([card], info, toInfo);
        this.audio.playCardPlace();
        this.hud.updateMoves(this.logic.moveCount);
        this.updateCardPositions();
        this.autoSave();
        this.checkWinCondition();
        return;
      }
    }
  }

  returnDragCards(state) {
    for (let i = 0; i < state.cards.length; i++) {
      const c = state.cards[i];
      const orig = state.originalPositions[i];
      c.targetPosition.set(orig.x, orig.y, orig.z);
    }
  }

  getValidTargets(cards, fromInfo) {
    const targets = [];

    for (let i = 0; i < 7; i++) {
      // Skip same pile
      if (fromInfo.type === 'tableau' && fromInfo.index === i) continue;
      const toInfo = { type: 'tableau', index: i };
      if (this.logic.canMove(cards, fromInfo, toInfo)) {
        targets.push(toInfo);
      }
    }

    for (let i = 0; i < 4; i++) {
      if (fromInfo.type === 'foundation' && fromInfo.index === i) continue;
      const toInfo = { type: 'foundation', index: i };
      if (this.logic.canMove(cards, fromInfo, toInfo)) {
        targets.push(toInfo);
      }
    }

    return targets;
  }

  drawFromStock() {
    if (!this.logic) return;
    const result = this.logic.drawFromStock();
    if (!result) return;

    this.audio.playCardFlip();
    this.updateCardPositions();
    this.autoSave();
  }

  doUndo() {
    if (!this.logic || !this.isPlaying) return;

    if (this.logic.undo()) {
      this.audio.playCardFlip();
      this.hud.updateMoves(this.logic.moveCount);
      this.updateCardPositions();
      this.autoSave();
    }
  }

  checkWinCondition() {
    if (!this.logic.checkWin()) return;

    this.isPlaying = false;
    this.stopTimer();

    this.audio.playWin();
    this.profile.updateStats(true, this.logic.elapsedSeconds);
    this.saveManager.clear(this.profile.getName());

    this.spawnConfetti();

    setTimeout(async () => {
      await this.modal.showWin({
        time: this.logic.elapsedSeconds,
        moves: this.logic.moveCount
      });
      this.clearConfetti();
      this.showMenu();
    }, 1500);
  }

  showMenu() {
    this.isPlaying = false;
    this.stopTimer();
    this.autoSave();

    this.hud.hide();
    this.mainMenu.show(this.profile.getName(), this.saveManager.hasSave(this.profile.getName()));
  }

  async showStats() {
    await this.modal.showStats(this.profile.getStats());
    this.mainMenu.show(this.profile.getName(), this.saveManager.hasSave(this.profile.getName()));
  }

  async showSettings() {
    const result = await this.modal.showSettings(this.settings);
    if (result) {
      this.settings = result;
      this.audio.setMuted(result.muted);
    }
    this.mainMenu.show(this.profile.getName(), this.saveManager.hasSave(this.profile.getName()));
  }

  spawnConfetti() {
    this.clearConfetti();

    this.confettiCanvas = document.createElement('canvas');
    this.confettiCanvas.id = 'confetti-canvas';
    this.confettiCanvas.width = window.innerWidth;
    this.confettiCanvas.height = window.innerHeight;
    document.getElementById('game-container').appendChild(this.confettiCanvas);
    this.confettiCtx = this.confettiCanvas.getContext('2d');

    const colors = ['#C9A84C', '#c41e3a', '#1a6b30', '#1a1a2e', '#e8e0d0', '#ffd700'];
    for (let i = 0; i < 200; i++) {
      this.confettiParticles.push({
        x: Math.random() * this.confettiCanvas.width,
        y: Math.random() * this.confettiCanvas.height - this.confettiCanvas.height,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        life: 1
      });
    }
  }

  updateConfetti() {
    if (!this.confettiCtx || this.confettiParticles.length === 0) return;

    this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);

    for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
      const p = this.confettiParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.rotation += p.rotSpeed;
      p.life -= 0.003;

      if (p.life <= 0 || p.y > this.confettiCanvas.height + 20) {
        this.confettiParticles.splice(i, 1);
        continue;
      }

      this.confettiCtx.save();
      this.confettiCtx.translate(p.x, p.y);
      this.confettiCtx.rotate(p.rotation);
      this.confettiCtx.globalAlpha = p.life;
      this.confettiCtx.fillStyle = p.color;
      this.confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.confettiCtx.restore();
    }

    if (this.confettiParticles.length === 0) {
      this.clearConfetti();
    }
  }

  clearConfetti() {
    this.confettiParticles = [];
    if (this.confettiCanvas && this.confettiCanvas.parentNode) {
      this.confettiCanvas.parentNode.removeChild(this.confettiCanvas);
    }
    this.confettiCanvas = null;
    this.confettiCtx = null;
  }

  getAllCards() {
    if (!this.deck) return [];
    return this.deck.cards;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);

    // Update all cards — use allCards which preserves all 52 references
    const cards = this.deck ? this.deck.allCards : [];
    for (const card of cards) {
      card.update(delta);
    }

    if (this.board) {
      this.board.update(delta);
    }

    this.updateConfetti();
    this.renderer.render(this.scene, this.camera);
  }
}

const game = new SolitaireGame();
