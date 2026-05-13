import { io, Socket } from 'socket.io-client';
import type { NetworkPlayer, GameRoom, NetworkMove, NetworkGameState, SocketEvents } from '../types/network';

class NetworkService {
  private socket: Socket | null = null;
  private isConnected = false;
  private currentPlayer: NetworkPlayer | null = null;
  private currentRoom: GameRoom | null = null;
  private preferredFaction: '魏' | '蜀' | '吴' | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    // 连接到本地服务器，生产环境需要修改为实际服务器地址
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    this.socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    // this.socket = io('http://localhost:3001', {
    //   transports: ['websocket', 'polling']
    // });

    this.socket.on('connect', () => {
      console.log('已连接到服务器');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('与服务器断开连接');
      this.isConnected = false;
    });

    this.socket.on('error', (error) => {
      console.error('网络错误:', error);
    });
  }

  // 加入房间
  joinRoom(roomId: string, player: NetworkPlayer) {
    if (!this.socket || !this.isConnected) {
      throw new Error('未连接到服务器');
    }
    
    this.currentPlayer = player;
    this.socket.emit('join-room', roomId, player);
  }

  // 自动匹配
  autoMatch(player: NetworkPlayer) {
    if (!this.socket || !this.isConnected) {
      throw new Error('未连接到服务器');
    }
    this.currentPlayer = player;
    this.socket.emit('auto-match', player);
  }

  // 选择势力
  selectFaction(faction: '魏' | '蜀' | '吴') {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('select-faction', faction);
    if (this.currentPlayer) {
      this.currentPlayer.faction = faction;
    }
  }

  // 预先记录偏好势力（未连接或未创建玩家时使用）
  setPreferredFaction(faction: '魏' | '蜀' | '吴') {
    this.preferredFaction = faction;
  }

  getPreferredFaction() {
    return this.preferredFaction;
  }

  // 开始游戏
  startGame() {
    if (!this.socket || !this.isConnected) {
      throw new Error('未连接到服务器');
    }
    
    this.socket.emit('start-game');
  }

  // 离开房间
  leaveRoom() {
    if (!this.socket || !this.currentRoom) return;
    
    this.socket.emit('leave-room', this.currentRoom.id, this.currentPlayer?.id);
    this.currentRoom = null;
    this.currentPlayer = null;
  }

  // 监听房间关闭（便捷方法，可在组件里直接绑定事件）
  onRoomClosed(callback: () => void) {
    if (!this.socket) return;
    this.socket.on('room-closed', callback);
  }
  offRoomClosed(callback?: () => void) {
    if (!this.socket) return;
    this.socket.off('room-closed', callback as any);
  }

  // 发送游戏移动
  sendMove(move: NetworkMove) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('game-move', move);
  }

  // 进入游戏界面
  joinGameView() {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('game-join');
  }

  // 监听事件
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]) {
    if (!this.socket) return;
    this.socket.on(event, callback as any);
  }

  // 移除事件监听
  off<K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]) {
    if (!this.socket) return;
    this.socket.off(event, callback as any);
  }

  // 获取连接状态
  getConnectionStatus() {
    return this.isConnected;
  }

  // 获取当前玩家
  getCurrentPlayer() {
    return this.currentPlayer;
  }

  // 获取当前房间
  getCurrentRoom() {
    return this.currentRoom;
  }

  // 设置当前房间
  setCurrentRoom(room: GameRoom) {
    this.currentRoom = room;
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentPlayer = null;
    this.currentRoom = null;
  }
}

export default new NetworkService();
