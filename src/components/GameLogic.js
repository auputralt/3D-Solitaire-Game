export class GameLogic {
  constructor(drawMode = 1) {
    this.drawMode = drawMode;
    this.tableau = [[], [], [], [], [], [], []];
    this.foundation = [[], [], [], []];
    this.stock = [];
    this.waste = [];
    this.moveCount = 0;
    this.elapsedSeconds = 0;
    this.undoStack = [];
  }

  deal(deck) {
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck.draw();
        card.faceUp = (row === col);
        this.tableau[col].push(card);
      }
    }

    while (deck.cards.length > 0) {
      const card = deck.draw();
      card.faceUp = false;
      this.stock.push(card);
    }
  }

  findCard(card) {
    for (let col = 0; col < 7; col++) {
      const idx = this.tableau[col].indexOf(card);
      if (idx !== -1) return { type: 'tableau', index: col, position: idx };
    }
    for (let f = 0; f < 4; f++) {
      const idx = this.foundation[f].indexOf(card);
      if (idx !== -1) return { type: 'foundation', index: f, position: idx };
    }
    const wIdx = this.waste.indexOf(card);
    if (wIdx !== -1) return { type: 'waste', index: 0, position: wIdx };
    const sIdx = this.stock.indexOf(card);
    if (sIdx !== -1) return { type: 'stock', index: 0, position: sIdx };

    return null;
  }

  isInStock(card) {
    return this.stock.includes(card);
  }

  getTableauStackFrom(col, position) {
    return this.tableau[col].slice(position);
  }

  isTopCard(card) {
    const info = this.findCard(card);
    if (!info) return false;

    if (info.type === 'tableau') {
      return info.position === this.tableau[info.index].length - 1;
    }
    if (info.type === 'foundation') {
      return info.position === this.foundation[info.index].length - 1;
    }
    if (info.type === 'waste') {
      return info.position === this.waste.length - 1;
    }
    return false;
  }

  canMove(cards, fromInfo, toInfo) {
    if (!cards || cards.length === 0) return false;

    const movingCard = cards[0];

    if (toInfo.type === 'tableau') {
      const targetPile = this.tableau[toInfo.index];

      if (targetPile.length === 0) {
        return movingCard.rank === 13;
      }

      const topCard = targetPile[targetPile.length - 1];
      if (!topCard.faceUp) return false;

      const movingIsRed = movingCard.suit === 'hearts' || movingCard.suit === 'diamonds';
      const topIsRed = topCard.suit === 'hearts' || topCard.suit === 'diamonds';

      return movingIsRed !== topIsRed && movingCard.rank === topCard.rank - 1;
    }

    if (toInfo.type === 'foundation') {
      if (cards.length !== 1) return false;

      const card = cards[0];
      const targetPile = this.foundation[toInfo.index];

      if (targetPile.length === 0) {
        return card.rank === 1;
      }

      const topCard = targetPile[targetPile.length - 1];
      return card.suit === topCard.suit && card.rank === topCard.rank + 1;
    }

    return false;
  }

  executeMove(cards, fromInfo, toInfo) {
    const undoEntry = {
      cards: cards.map(c => c.id),
      from: { ...fromInfo },
      to: { ...toInfo },
      flippedCard: null
    };

    if (fromInfo.type === 'tableau') {
      const pile = this.tableau[fromInfo.index];
      pile.splice(fromInfo.position, cards.length);

      if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
        pile[pile.length - 1].faceUp = true;
        undoEntry.flippedCard = {
          type: 'tableau',
          index: fromInfo.index,
          id: pile[pile.length - 1].id
        };
      }
    } else if (fromInfo.type === 'waste') {
      this.waste.splice(this.waste.indexOf(cards[0]), cards.length);
    } else if (fromInfo.type === 'foundation') {
      this.foundation[fromInfo.index].pop();
    }

    if (toInfo.type === 'tableau') {
      this.tableau[toInfo.index].push(...cards);
    } else if (toInfo.type === 'foundation') {
      this.foundation[toInfo.index].push(cards[0]);
    }

    this.moveCount++;
    this.undoStack.push(undoEntry);

    if (this.undoStack.length > 100) {
      this.undoStack.shift();
    }
  }

  drawFromStock() {
    const undoEntry = { type: 'draw', drawnCards: [] };

    if (this.stock.length === 0) {
      if (this.waste.length === 0) return null;

      undoEntry.type = 'recycle';
      undoEntry.wasteLength = this.waste.length;

      while (this.waste.length > 0) {
        const card = this.waste.pop();
        card.faceUp = false;
        this.stock.push(card);
      }
      this.undoStack.push(undoEntry);
      return { type: 'recycle' };
    }

    const count = Math.min(this.drawMode, this.stock.length);
    for (let i = 0; i < count; i++) {
      const card = this.stock.pop();
      card.faceUp = true;
      this.waste.push(card);
      undoEntry.drawnCards.push(card.id);
    }

    this.undoStack.push(undoEntry);
    return { type: 'draw', count };
  }

  undo() {
    if (this.undoStack.length === 0) return false;

    const entry = this.undoStack.pop();

    if (entry.type === 'draw') {
      for (const id of entry.drawnCards) {
        const card = this.waste.pop();
        if (card) {
          card.faceUp = false;
          this.stock.push(card);
        }
      }
      return true;
    }

    if (entry.type === 'recycle') {
      while (this.stock.length > 0) {
        const card = this.stock.pop();
        card.faceUp = true;
        this.waste.push(card);
      }
      return true;
    }

    const cards = [];
    if (entry.to.type === 'tableau') {
      const pile = this.tableau[entry.to.index];
      for (let i = 0; i < entry.cards.length; i++) {
        cards.push(pile.pop());
      }
      cards.reverse();
    } else if (entry.to.type === 'foundation') {
      cards.push(this.foundation[entry.to.index].pop());
    }

    if (entry.flippedCard) {
      const pile = this.tableau[entry.flippedCard.index];
      if (pile.length > 0) {
        pile[pile.length - 1].faceUp = false;
      }
    }

    if (entry.from.type === 'tableau') {
      this.tableau[entry.from.index].push(...cards);
    } else if (entry.from.type === 'waste') {
      this.waste.push(...cards);
    } else if (entry.from.type === 'foundation') {
      this.foundation[entry.from.index].push(cards[0]);
    }

    this.moveCount = Math.max(0, this.moveCount - 1);
    return true;
  }

  findCardById(id) {
    for (const col of this.tableau) {
      for (const card of col) {
        if (card.id === id) return card;
      }
    }
    for (const f of this.foundation) {
      for (const card of f) {
        if (card.id === id) return card;
      }
    }
    for (const card of this.waste) {
      if (card.id === id) return card;
    }
    for (const card of this.stock) {
      if (card.id === id) return card;
    }
    return null;
  }

  checkWin() {
    return this.foundation.every(f => f.length === 13);
  }

  serialize() {
    const serializePile = (pile) => pile.map(c => ({ id: c.id, faceUp: c.faceUp }));

    return {
      drawMode: this.drawMode,
      tableau: this.tableau.map(serializePile),
      foundation: this.foundation.map(pile => pile.map(c => ({ id: c.id }))),
      stock: this.stock.map(c => ({ id: c.id })),
      waste: this.waste.map(c => ({ id: c.id, faceUp: true })),
      moveCount: this.moveCount,
      elapsedSeconds: this.elapsedSeconds
    };
  }

  static deserialize(data, deck) {
    const logic = new GameLogic(data.drawMode);
    logic.moveCount = data.moveCount;
    logic.elapsedSeconds = data.elapsedSeconds;

    const findCard = (id) => deck.cards.find(c => c.id === id);

    for (let col = 0; col < 7; col++) {
      for (const entry of data.tableau[col]) {
        const card = findCard(entry.id);
        if (card) {
          card.faceUp = entry.faceUp;
          logic.tableau[col].push(card);
        }
      }
    }

    for (let f = 0; f < 4; f++) {
      for (const entry of data.foundation[f]) {
        const card = findCard(entry.id);
        if (card) {
          card.faceUp = true;
          logic.foundation[f].push(card);
        }
      }
    }

    for (const entry of data.stock) {
      const card = findCard(entry.id);
      if (card) {
        card.faceUp = false;
        logic.stock.push(card);
      }
    }

    for (const entry of data.waste) {
      const card = findCard(entry.id);
      if (card) {
        card.faceUp = true;
        logic.waste.push(card);
      }
    }

    return logic;
  }
}
