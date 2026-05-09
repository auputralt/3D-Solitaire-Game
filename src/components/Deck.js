import { Card, SUITS, RANKS } from './Card.js';

export class Deck {
  constructor() {
    this.cards = [];
    this.allCards = [];
    this.createDeck();
  }

  createDeck() {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const card = new Card(rank, suit);
        this.cards.push(card);
      }
    }
    // Keep reference to all cards even after dealing
    this.allCards = [...this.cards];
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw() {
    return this.cards.pop();
  }

  getCard(id) {
    return this.allCards.find(c => c.id === id);
  }
}
