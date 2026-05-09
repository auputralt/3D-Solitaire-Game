import * as THREE from 'three';

export const CARD_WIDTH = 2.0;
export const CARD_DEPTH = 2.8;
export const CARD_THICKNESS = 0.06;
export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

const SUIT_SYMBOLS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

const SUIT_COLORS = {
  hearts: '#c41e3a',
  diamonds: '#c41e3a',
  clubs: '#1a1a2e',
  spades: '#1a1a2e'
};

const RANK_TEXT = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K'
};

const faceTextures = {};
let backTexture = null;

const PIP_LAYOUTS = {
  1: [{ x: 0.5, y: 0.5, size: 1.5 }],
  2: [{ x: 0.5, y: 0.25, size: 1 }, { x: 0.5, y: 0.75, size: 1, flip: true }],
  3: [{ x: 0.5, y: 0.2, size: 1 }, { x: 0.5, y: 0.5, size: 1 }, { x: 0.5, y: 0.8, size: 1, flip: true }],
  4: [{ x: 0.3, y: 0.25, size: 1 }, { x: 0.7, y: 0.25, size: 1 }, { x: 0.3, y: 0.75, size: 1, flip: true }, { x: 0.7, y: 0.75, size: 1, flip: true }],
  5: [{ x: 0.3, y: 0.25, size: 1 }, { x: 0.7, y: 0.25, size: 1 }, { x: 0.5, y: 0.5, size: 1 }, { x: 0.3, y: 0.75, size: 1, flip: true }, { x: 0.7, y: 0.75, size: 1, flip: true }],
  6: [{ x: 0.3, y: 0.2, size: 1 }, { x: 0.7, y: 0.2, size: 1 }, { x: 0.3, y: 0.5, size: 1 }, { x: 0.7, y: 0.5, size: 1 }, { x: 0.3, y: 0.8, size: 1, flip: true }, { x: 0.7, y: 0.8, size: 1, flip: true }],
  7: [{ x: 0.3, y: 0.2, size: 1 }, { x: 0.7, y: 0.2, size: 1 }, { x: 0.5, y: 0.35, size: 0.8 }, { x: 0.3, y: 0.5, size: 1 }, { x: 0.7, y: 0.5, size: 1 }, { x: 0.3, y: 0.8, size: 1, flip: true }, { x: 0.7, y: 0.8, size: 1, flip: true }],
  8: [{ x: 0.3, y: 0.18, size: 1 }, { x: 0.7, y: 0.18, size: 1 }, { x: 0.3, y: 0.38, size: 1 }, { x: 0.7, y: 0.38, size: 1 }, { x: 0.3, y: 0.62, size: 1, flip: true }, { x: 0.7, y: 0.62, size: 1, flip: true }, { x: 0.3, y: 0.82, size: 1, flip: true }, { x: 0.7, y: 0.82, size: 1, flip: true }],
  9: [{ x: 0.3, y: 0.15, size: 1 }, { x: 0.7, y: 0.15, size: 1 }, { x: 0.3, y: 0.37, size: 1 }, { x: 0.7, y: 0.37, size: 1 }, { x: 0.5, y: 0.5, size: 1 }, { x: 0.3, y: 0.63, size: 1, flip: true }, { x: 0.7, y: 0.63, size: 1, flip: true }, { x: 0.3, y: 0.85, size: 1, flip: true }, { x: 0.7, y: 0.85, size: 1, flip: true }],
  10: [{ x: 0.3, y: 0.15, size: 1 }, { x: 0.7, y: 0.15, size: 1 }, { x: 0.5, y: 0.27, size: 0.8 }, { x: 0.3, y: 0.37, size: 1 }, { x: 0.7, y: 0.37, size: 1 }, { x: 0.3, y: 0.63, size: 1, flip: true }, { x: 0.7, y: 0.63, size: 1, flip: true }, { x: 0.5, y: 0.73, size: 0.8, flip: true }, { x: 0.3, y: 0.85, size: 1, flip: true }, { x: 0.7, y: 0.85, size: 1, flip: true }]
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawSuitSymbol(ctx, symbol, x, y, size, color, flip = false) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (flip) {
    ctx.translate(x, y);
    ctx.rotate(Math.PI);
    ctx.fillText(symbol, 0, 0);
  } else {
    ctx.fillText(symbol, x, y);
  }
  ctx.restore();
}

function createCardFaceCanvas(rank, suit) {
  const W = 256, H = 384;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const color = SUIT_COLORS[suit];
  const symbol = SUIT_SYMBOLS[suit];
  const rankText = RANK_TEXT[rank];

  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#FFFCF2');
  bgGrad.addColorStop(0.5, '#FFF8E7');
  bgGrad.addColorStop(1, '#FFF5DC');
  ctx.fillStyle = bgGrad;
  roundRect(ctx, 0, 0, W, H, 12);
  ctx.fill();

  // Drop shadow effect for card edge
  ctx.shadowColor = 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.strokeStyle = '#C8BD9E';
  ctx.lineWidth = 2;
  roundRect(ctx, 2, 2, W - 4, H - 4, 10);
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(180, 160, 120, 0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, 8, 8, W - 16, H - 16, 8);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = 'bold 28px "Cinzel", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rankText, 14, 14);
  ctx.font = '22px serif';
  ctx.fillText(symbol, 16, 44);

  ctx.save();
  ctx.translate(W, H);
  ctx.rotate(Math.PI);
  ctx.fillStyle = color;
  ctx.font = 'bold 28px "Cinzel", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rankText, 14, 14);
  ctx.font = '22px serif';
  ctx.fillText(symbol, 16, 44);
  ctx.restore();

  if (rank >= 2 && rank <= 10) {
    const layout = PIP_LAYOUTS[rank];
    const pipSize = 32;
    for (const pip of layout) {
      drawSuitSymbol(ctx, symbol, pip.x * W, pip.y * H, pipSize * (pip.size || 1), color, pip.flip);
    }
  } else if (rank === 1) {
    ctx.fillStyle = color;
    ctx.font = '64px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, W / 2, H / 2);
  } else {
    const faceLetter = rankText;
    ctx.fillStyle = color;

    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = color;
    roundRect(ctx, 30, 80, W - 60, H - 160, 8);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = color;
    ctx.font = 'bold 80px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(faceLetter, W / 2, H / 2 - 10);

    ctx.font = '28px serif';
    ctx.fillText(symbol, W / 2, H / 2 + 45);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(40, H / 2 - 55);
    ctx.lineTo(W - 40, H / 2 - 55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(40, H / 2 + 65);
    ctx.lineTo(W - 40, H / 2 + 65);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  return canvas;
}

function createCardBackCanvas() {
  const W = 256, H = 384;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Deep navy gradient
  const backGrad = ctx.createLinearGradient(0, 0, W, H);
  backGrad.addColorStop(0, '#1a2744');
  backGrad.addColorStop(0.5, '#1B2838');
  backGrad.addColorStop(1, '#152030');
  ctx.fillStyle = backGrad;
  roundRect(ctx, 0, 0, W, H, 12);
  ctx.fill();

  // Outer gold border
  ctx.strokeStyle = '#C9A84C';
  ctx.lineWidth = 3;
  roundRect(ctx, 4, 4, W - 8, H - 8, 10);
  ctx.stroke();

  // Inner gold border
  ctx.strokeStyle = 'rgba(201, 168, 76, 0.6)';
  ctx.lineWidth = 1;
  roundRect(ctx, 10, 10, W - 20, H - 20, 7);
  ctx.stroke();

  const patternSize = 18;
  for (let row = 0; row < Math.ceil(H / patternSize); row++) {
    for (let col = 0; col < Math.ceil(W / patternSize); col++) {
      const cx = col * patternSize + patternSize / 2;
      const cy = row * patternSize + patternSize / 2;

      if (cx < 16 || cx > W - 16 || cy < 16 || cy > H - 16) continue;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      const s = patternSize * 0.28;
      ctx.fillStyle = (row + col) % 2 === 0 ? 'rgba(201, 168, 76, 0.15)' : 'rgba(201, 168, 76, 0.08)';
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(W / 2, H / 2);

  ctx.strokeStyle = '#C9A84C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(30, 0);
  ctx.lineTo(0, 40);
  ctx.lineTo(-30, 0);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.lineTo(18, 0);
  ctx.lineTo(0, 25);
  ctx.lineTo(-18, 0);
  ctx.closePath();
  ctx.fillStyle = 'rgba(201, 168, 76, 0.2)';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#C9A84C';
  ctx.font = '16px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♠', 0, -15);
  ctx.fillText('♥', 15, 0);
  ctx.fillText('♦', 0, 15);
  ctx.fillText('♣', -15, 0);

  ctx.restore();

  return canvas;
}

function createEmptySlotCanvas(suit = null) {
  const W = 256, H = 384;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(201, 168, 76, 0.25)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  roundRect(ctx, 4, 4, W - 8, H - 8, 12);
  ctx.stroke();
  ctx.setLineDash([]);

  if (suit) {
    ctx.fillStyle = 'rgba(201, 168, 76, 0.15)';
    ctx.font = '64px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SUIT_SYMBOLS[suit], W / 2, H / 2);
  }

  return canvas;
}

export class Card {
  constructor(rank, suit) {
    this.rank = rank;
    this.suit = suit;
    this.id = `${rank}_${suit}`;
    this.faceUp = false;
    this.mesh = null;

    this.targetPosition = new THREE.Vector3(0, 0, 0);
    this.targetRotation = new THREE.Euler(0, 0, 0);
    this.moveSpeed = 12;
    this.specialAnim = null;
    this.onAnimComplete = null;

    this.createMesh();
  }

  createMesh() {
    const geometry = new THREE.BoxGeometry(CARD_WIDTH, CARD_THICKNESS, CARD_DEPTH);

    const faceTex = Card.getFaceTexture(this.rank, this.suit);
    const backTex = Card.getBackTexture();

    const sideMat = new THREE.MeshStandardMaterial({
      color: 0xF5F0E0,
      roughness: 0.6,
      metalness: 0.0
    });

    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTex,
      roughness: 0.35,
      metalness: 0.02,
      envMapIntensity: 0.3
    });

    const backMat = new THREE.MeshStandardMaterial({
      map: backTex,
      roughness: 0.35,
      metalness: 0.02,
      envMapIntensity: 0.3
    });

    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    const materials = [sideMat, sideMat, faceMat, backMat, sideMat, sideMat];

    this.mesh = new THREE.Mesh(geometry, materials);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.card = this;
  }

  setPosition(x, y, z, snap = false) {
    this.targetPosition.set(x, y, z);
    if (snap) {
      this.mesh.position.set(x, y, z);
    }
  }

  setRotation(rx, ry, rz, snap = false) {
    this.targetRotation.set(rx, ry, rz);
    if (snap) {
      this.mesh.rotation.set(rx, ry, rz);
    }
  }

  flipTo(faceUp, onComplete) {
    this.faceUp = faceUp;
    this.specialAnim = {
      type: 'flip',
      progress: 0,
      duration: 0.35,
      startRx: this.mesh.rotation.x,
      endRx: faceUp ? 0 : Math.PI,
      startY: this.mesh.position.y,
      peakY: this.mesh.position.y + 1.5,
      onComplete: onComplete || null
    };
  }

  update(delta) {
    if (this.specialAnim) {
      this.updateSpecialAnim(delta);
      return;
    }

    const t = 1 - Math.pow(0.001, delta * this.moveSpeed);
    this.mesh.position.lerp(this.targetPosition, t);
    this.mesh.rotation.x += (this.targetRotation.x - this.mesh.rotation.x) * t;
    this.mesh.rotation.y += (this.targetRotation.y - this.mesh.rotation.y) * t;
    this.mesh.rotation.z += (this.targetRotation.z - this.mesh.rotation.z) * t;

    if (this.mesh.position.distanceTo(this.targetPosition) < 0.005) {
      this.mesh.position.copy(this.targetPosition);
      this.mesh.rotation.copy(this.targetRotation);
    }
  }

  updateSpecialAnim(delta) {
    const anim = this.specialAnim;
    anim.progress += delta / anim.duration;

    if (anim.progress >= 1) {
      anim.progress = 1;
      const cb = anim.onComplete;
      this.specialAnim = null;
      this.mesh.position.copy(this.targetPosition);
      this.mesh.rotation.copy(this.targetRotation);
      if (cb) cb();
      return;
    }

    const t = anim.progress;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    this.mesh.rotation.x = anim.startRx + (anim.endRx - anim.startRx) * ease;

    const liftT = Math.sin(t * Math.PI);
    this.mesh.position.y = anim.startY + (anim.peakY - anim.startY) * liftT;
  }

  isAnimating() {
    return this.specialAnim !== null || this.mesh.position.distanceTo(this.targetPosition) > 0.01;
  }

  static generateTextures() {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const canvas = createCardFaceCanvas(rank, suit);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        faceTextures[`${rank}_${suit}`] = texture;
      }
    }

    const backCanvas = createCardBackCanvas();
    backTexture = new THREE.CanvasTexture(backCanvas);
    backTexture.colorSpace = THREE.SRGBColorSpace;
  }

  static getFaceTexture(rank, suit) {
    return faceTextures[`${rank}_${suit}`];
  }

  static getBackTexture() {
    return backTexture;
  }

  static createEmptySlotMesh(suit = null) {
    const canvas = createEmptySlotCanvas(suit);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const geometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_DEPTH);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.005;
    return mesh;
  }
}
