import type { Character } from '../models/characters';
import { WeiCharacters, ShuCharacters, WuCharacters } from '../models/characters';

// 卡牌接口，每张卡牌都有唯一标识符
export interface Card {
  id: string; // 唯一标识符
  character: Character; // 角色信息
  faction: '魏' | '蜀' | '吴'; // 势力
}

// 玩家牌组类
export class PlayerDeck {
  private cards: Card[] = [];
  private faction: '魏' | '蜀' | '吴' | null = null;

  constructor(faction: '魏' | '蜀' | '吴') {
    this.faction = faction;
    this.initializeDeck();
  }

  // 初始化牌组，生成20张卡牌
  private initializeDeck() {
    if (!this.faction) return;

    // 根据势力获取角色列表
    const characters = this.getCharactersByFaction(this.faction);
    
    // 为每个角色生成最多2张卡牌
    const cardCounts = new Map<string, number>();
    const maxCardsPerCharacter = 2;
    const totalCardsNeeded = 20;
    
    // 计算每个角色应该生成多少张卡牌
    let remainingCards = totalCardsNeeded;
    for (const character of characters) {
      const count = Math.min(maxCardsPerCharacter, Math.ceil(remainingCards / (characters.length - cardCounts.size)));
      cardCounts.set(character._name, count);
      remainingCards -= count;
      if (remainingCards <= 0) break;
    }

    // 生成卡牌
    for (const [characterName, count] of cardCounts) {
      const character = characters.find(c => c._name === characterName);
      if (character) {
        for (let i = 0; i < count; i++) {
          const card: Card = {
            id: `${this.faction}_${characterName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            character,
            faction: this.faction
          };
          this.cards.push(card);
        }
      }
    }

    // 洗牌
    this.shuffle();
  }

  // 根据势力获取角色列表
  private getCharactersByFaction(faction: '魏' | '蜀' | '吴'): Character[] {
    switch (faction) {
      case '魏':
        return WeiCharacters;
      case '蜀':
        return ShuCharacters;
      case '吴':
        return WuCharacters;
      default:
        return [];
    }
  }

  // 洗牌
  private shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  // 从牌组顶部抽取一张卡牌
  public drawCard(): Card | null {
    if (this.cards.length === 0) return null;
    return this.cards.pop() || null;
  }

  // 获取牌组剩余卡牌数量
  public getRemainingCards(): number {
    return this.cards.length;
  }

  // 获取牌组所有卡牌（用于调试）
  public getAllCards(): Card[] {
    return [...this.cards];
  }

  // 重新洗牌
  public reshuffle() {
    this.shuffle();
  }
}

// 手牌组类
export class PlayerHand {
  private cards: Card[] = [];
  private maxHandSize: number = 5;

  constructor(maxHandSize: number = 5) {
    this.maxHandSize = maxHandSize;
  }

  // 添加卡牌到手牌
  public addCard(card: Card): boolean {
    if (this.cards.length >= this.maxHandSize) {
      return false; // 手牌已满
    }
    this.cards.push(card);
    return true;
  }

  // 移除指定卡牌
  public removeCard(cardId: string): Card | null {
    const index = this.cards.findIndex(card => card.id === cardId);
    if (index === -1) return null;
    return this.cards.splice(index, 1)[0];
  }

  // 获取手牌
  public getCards(): Card[] {
    return [...this.cards];
  }

  // 获取手牌数量
  public getCardCount(): number {
    return this.cards.length;
  }

  // 检查手牌是否已满
  public isFull(): boolean {
    return this.cards.length >= this.maxHandSize;
  }

  // 清空手牌
  public clear() {
    this.cards = [];
  }
}
