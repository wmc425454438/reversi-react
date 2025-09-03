export interface NetworkPlayer {
  id: string;
  name: string;
  avatar: string;
  isReady: boolean;
}

export interface GameRoom {
  id: string;
  name: string;
  players: NetworkPlayer[];
  maxPlayers: number;
  gameState?: any;
  isGameStarted: boolean;
  currentPlayer: number;
}

export interface NetworkMove {
  row: number;
  col: number;
  character: any;
  playerId: string;
  timestamp: number;
}

export interface NetworkGameState {
  tableArr: any[][];
  lastMove: number;
  player1: any;
  player2: any;
  gameOver: boolean;
  currentPlayer: string;
}

export interface SocketEvents {
  // 房间相关
  'join-room': (roomId: string, player: NetworkPlayer) => void;
  'leave-room': (roomId: string, playerId: string) => void;
  'room-joined': (room: GameRoom) => void;
  'room-left': () => void;
  'player-joined': (player: NetworkPlayer) => void;
  'player-left': (playerId: string) => void;
  
  // 游戏相关
  'game-start': (gameState: NetworkGameState) => void;
  'game-move': (move: NetworkMove) => void;
  'game-state-update': (gameState: NetworkGameState) => void;
  'game-over': (winner: string) => void;
  
  // 错误处理
  'error': (message: string) => void;
  'connection-error': (error: any) => void;
}
