import { Player } from '../models/Player';
import { PlayerDeck, PlayerHand } from './card';

export interface Character {
  _name: string;
  _attack: number;
  _combo?: number;
}

export interface ChessPiece {
  type: number; // 0: 空, 1: 橙色, 2: 蓝色, 3: 可移动位置
  reversal: boolean;
  character: Character | {};
  hasCombo?: boolean; // 是否有连击效果
}

export interface GameState {
  tableArr: ChessPiece[][];
  lastMove: number;
  player1: Player;
  player2: Player;
  gameOver: boolean;
  threeDimensionsOn: boolean;
  // 牌组系统
  player1Deck: PlayerDeck;
  player2Deck: PlayerDeck;
  player1Hand: PlayerHand;
  player2Hand: PlayerHand;
  currentPlayerFaction: '魏' | '蜀' | '吴' | null;
}
