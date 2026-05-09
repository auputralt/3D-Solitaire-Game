import * as THREE from 'three';
import { Card, CARD_WIDTH, CARD_DEPTH } from './Card.js';

const TABLEAU_START_X = -8.4;
const TABLEAU_SPACING = 2.8;
const TABLEAU_BASE_Z = 4.0;
const TABLEAU_BASE_Y = 0.025;

const CASCADE_Z_FACE_DOWN = 0.35;
const CASCADE_Z_FACE_UP = 0.9;
const CASCADE_Y = 0.015;

const STOCK_X = -8.4;
const STOCK_Z = -5.0;

const WASTE_X = -5.2;
const WASTE_Z = -5.0;

const FOUNDATION_START_X = 1.4;
const FOUNDATION_SPACING = 2.8;
const FOUNDATION_Z = -5.0;

export class GameBoard {
  constructor(scene) {
    this.scene = scene;
    this.slotMeshes = [];
    this.highlightMeshes = [];

    this.setupTable();
    this.setupSlots();
    this.setupHighlights();
  }

  setupTable() {
    // Richer felt texture with fiber-like noise
    const feltCanvas = document.createElement('canvas');
    feltCanvas.width = 1024;
    feltCanvas.height = 1024;
    const fctx = feltCanvas.getContext('2d');

    // Base green
    fctx.fillStyle = '#1b6b32';
    fctx.fillRect(0, 0, 1024, 1024);

    // Subtle fiber lines
    fctx.globalAlpha = 0.04;
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const len = Math.random() * 20 + 5;
      const angle = Math.random() * Math.PI;
      fctx.strokeStyle = Math.random() > 0.5 ? '#2a8b42' : '#0f5520';
      fctx.lineWidth = 0.5;
      fctx.beginPath();
      fctx.moveTo(x, y);
      fctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      fctx.stroke();
    }
    fctx.globalAlpha = 1.0;

    // Pixel noise for texture
    const imageData = fctx.getImageData(0, 0, 1024, 1024);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 12;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    fctx.putImageData(imageData, 0, 0);

    const feltTexture = new THREE.CanvasTexture(feltCanvas);
    feltTexture.wrapS = THREE.RepeatWrapping;
    feltTexture.wrapT = THREE.RepeatWrapping;
    feltTexture.repeat.set(3, 2.5);
    feltTexture.colorSpace = THREE.SRGBColorSpace;
    feltTexture.anisotropy = 4;

    const tableGeom = new THREE.PlaneGeometry(40, 28);
    const tableMat = new THREE.MeshStandardMaterial({
      map: feltTexture,
      roughness: 0.92,
      metalness: 0.0,
      color: 0x1d7035
    });

    this.table = new THREE.Mesh(tableGeom, tableMat);
    this.table.rotation.x = -Math.PI / 2;
    this.table.position.y = -0.02;
    this.table.receiveShadow = true;
    this.scene.add(this.table);

    // Wooden rail — darker, with bevel-like effect
    const railHeight = 0.4;
    const edgeGeom = new THREE.BoxGeometry(41, railHeight, 29);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x3d2410,
      roughness: 0.6,
      metalness: 0.05
    });
    const edge = new THREE.Mesh(edgeGeom, edgeMat);
    edge.position.y = -0.02 - railHeight / 2;
    edge.receiveShadow = true;
    edge.castShadow = true;
    this.scene.add(edge);

    // Inner rail highlight
    const innerRailGeom = new THREE.BoxGeometry(40.2, 0.08, 28.2);
    const innerRailMat = new THREE.MeshStandardMaterial({
      color: 0x5a3a1a,
      roughness: 0.5,
      metalness: 0.1
    });
    const innerRail = new THREE.Mesh(innerRailGeom, innerRailMat);
    innerRail.position.y = -0.005;
    this.scene.add(innerRail);
  }

  setupSlots() {
    for (let i = 0; i < 7; i++) {
      const pos = this.getTableauBasePosition(i);
      const slot = Card.createEmptySlotMesh();
      slot.position.set(pos.x, 0.005, pos.z);
      this.scene.add(slot);
      this.slotMeshes.push(slot);
    }

    const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    for (let i = 0; i < 4; i++) {
      const pos = this.getFoundationPosition(i);
      const slot = Card.createEmptySlotMesh(suits[i]);
      slot.position.set(pos.x, 0.005, pos.z);
      this.scene.add(slot);
      this.slotMeshes.push(slot);
    }

    const stockSlot = Card.createEmptySlotMesh();
    stockSlot.position.set(STOCK_X, 0.005, STOCK_Z);
    this.scene.add(stockSlot);
    this.slotMeshes.push(stockSlot);
  }

  setupHighlights() {
    for (let i = 0; i < 11; i++) {
      const geom = new THREE.PlaneGeometry(CARD_WIDTH + 0.4, CARD_DEPTH + 0.4);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.015;
      mesh.visible = false;
      this.scene.add(mesh);
      this.highlightMeshes.push(mesh);
    }
  }

  getTableauBasePosition(col) {
    return {
      x: TABLEAU_START_X + col * TABLEAU_SPACING,
      y: TABLEAU_BASE_Y,
      z: TABLEAU_BASE_Z
    };
  }

  getTableauCardPosition(col, row, tableau) {
    const base = this.getTableauBasePosition(col);
    let z = base.z;
    let y = base.y;

    for (let i = 0; i < row; i++) {
      const card = tableau[col][i];
      z += card.faceUp ? CASCADE_Z_FACE_UP : CASCADE_Z_FACE_DOWN;
      y += CASCADE_Y;
    }

    return { x: base.x, y, z };
  }

  getStockPosition(index) {
    const stackOffset = Math.min(index, 4);
    return {
      x: STOCK_X + stackOffset * 0.02,
      y: TABLEAU_BASE_Y + stackOffset * 0.008,
      z: STOCK_Z + stackOffset * 0.02
    };
  }

  getWastePosition(index, totalInWaste) {
    const maxVisible = 3;
    const startVisible = Math.max(0, totalInWaste - maxVisible);

    if (index < startVisible) {
      return {
        x: WASTE_X,
        y: TABLEAU_BASE_Y + index * 0.003,
        z: WASTE_Z
      };
    }

    const visibleIndex = index - startVisible;
    return {
      x: WASTE_X + visibleIndex * 0.5,
      y: TABLEAU_BASE_Y + visibleIndex * 0.01,
      z: WASTE_Z
    };
  }

  getFoundationPosition(foundationIndex) {
    return {
      x: FOUNDATION_START_X + foundationIndex * FOUNDATION_SPACING,
      y: TABLEAU_BASE_Y,
      z: FOUNDATION_Z
    };
  }

  getFoundationCardPosition(foundationIndex, cardIndex) {
    const base = this.getFoundationPosition(foundationIndex);
    return {
      x: base.x,
      y: base.y + cardIndex * 0.005,
      z: base.z
    };
  }

  showHighlights(validTargets) {
    this.clearHighlights();

    for (const target of validTargets) {
      let pos;
      let meshIndex;

      if (target.type === 'tableau') {
        pos = this.getTableauBasePosition(target.index);
        meshIndex = target.index;
      } else if (target.type === 'foundation') {
        pos = this.getFoundationPosition(target.index);
        meshIndex = 7 + target.index;
      }

      if (pos && meshIndex !== undefined && meshIndex < this.highlightMeshes.length) {
        const mesh = this.highlightMeshes[meshIndex];
        mesh.position.set(pos.x, 0.015, pos.z);
        mesh.visible = true;
        mesh.material.opacity = 0.3;
      }
    }
  }

  clearHighlights() {
    for (const mesh of this.highlightMeshes) {
      mesh.visible = false;
      mesh.material.opacity = 0;
    }
  }

  getPileAtPosition(worldPos) {
    let closest = null;
    let closestDist = Infinity;

    for (let i = 0; i < 7; i++) {
      const pos = this.getTableauBasePosition(i);
      const dx = worldPos.x - pos.x;
      const dz = worldPos.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < closestDist && dist < 2.5) {
        closest = { type: 'tableau', index: i };
        closestDist = dist;
      }
    }

    for (let i = 0; i < 4; i++) {
      const pos = this.getFoundationPosition(i);
      const dx = worldPos.x - pos.x;
      const dz = worldPos.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < closestDist && dist < 2.5) {
        closest = { type: 'foundation', index: i };
        closestDist = dist;
      }
    }

    return closest;
  }

  isOverStock(worldPos) {
    const dx = worldPos.x - STOCK_X;
    const dz = worldPos.z - STOCK_Z;
    return Math.sqrt(dx * dx + dz * dz) < 1.5;
  }

  update(delta) {
    const time = Date.now() * 0.004;
    for (const mesh of this.highlightMeshes) {
      if (mesh.visible) {
        mesh.material.opacity = 0.2 + Math.sin(time) * 0.12;
      }
    }
  }
}
