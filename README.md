# 3D Solitaire

A browser-based 3D Klondike Solitaire card game built with Three.js.

![3D Solitaire Gameplay](assets/screenshot.png)

## Features

- Full 3D rendering with Three.js
- Klondike Solitaire rules (Draw 1 and Draw 3 modes)
- Drag and drop card interaction
- Double-click to auto-move to foundation
- Undo support
- Auto-save game state
- Player profiles with statistics
- Procedural sound effects
- Confetti celebration on win
- Responsive design (desktop + tablet)

## Tech Stack

- **Three.js** — 3D rendering
- **Vite** — Build tool
- **Web Audio API** — Sound effects
- **LocalStorage** — Save/game state persistence

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Build

```bash
npm run build
```

The `dist` folder can be deployed to any static hosting service (Netlify, Vercel, GitHub Pages).

## How to Play

- **Click stock pile** (top-left) to draw cards
- **Drag cards** to tableau columns or foundation piles
- **Double-click** a card to auto-move it to the foundation
- **Undo** button to reverse last move
- Build foundations up by suit (Ace → King)
- Build tableau down in alternating colors (King → Ace)
