import { Player } from '../models/Player';

export interface Character {
  _name: string;
  _attack: number;
  _combo?: number;
}

export interface ChessPiece {
  type: number; // 0: 空, 1: 橙色, 2: 蓝色, 3: 可移动位置
  reversal: boolean;
  character: Character | {};
}

export interface GameState {
  tableArr: ChessPiece[][];
  lastMove: number;
  player1: Player;
  player2: Player;
  gameOver: boolean;
  threeDimensionsOn: boolean;
}
