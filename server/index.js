import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

// 启用CORS
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Vite开发服务器地址
    methods: ["GET", "POST"]
  }
});

// 存储房间和游戏状态
const rooms = new Map();
const players = new Map();

// 游戏逻辑
class GameManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(roomId, player) {
    const room = {
      id: roomId,
      name: `房间${roomId}`,
      players: [player],
      maxPlayers: 2,
      gameState: null,
      isGameStarted: false,
      currentPlayer: null
    };
    
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId, player) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return this.createRoom(roomId, player);
    }
    
    if (room.players.length >= room.maxPlayers) {
      throw new Error('房间已满');
    }
    
    room.players.push(player);
    return room;
  }

  leaveRoom(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    room.players = room.players.filter(p => p.id !== playerId);
    
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
    }
    
    return room;
  }

  startGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || room.players.length !== 2) {
      throw new Error('无法开始游戏');
    }
    
    room.isGameStarted = true;
    room.currentPlayer = room.players[0].id;
    
    // 初始化游戏状态
    room.gameState = {
      tableArr: this.initializeBoard(),
      lastMove: 1,
      player1: { _name: room.players[0].name, _hp: 120 },
      player2: { _name: room.players[1].name, _hp: 120 },
      gameOver: false,
      currentPlayer: room.currentPlayer
    };
    
    return room;
  }

  makeMove(roomId, move) {
    const room = this.rooms.get(roomId);
    if (!room || !room.isGameStarted) {
      throw new Error('游戏未开始');
    }
    
    // 验证移动是否合法
    if (room.currentPlayer !== move.playerId) {
      throw new Error('不是您的回合');
    }
    
    // 处理移动逻辑（这里需要实现具体的游戏逻辑）
    // 更新游戏状态
    // 切换当前玩家
    
    room.currentPlayer = room.players.find(p => p.id !== move.playerId)?.id;
    room.gameState.currentPlayer = room.currentPlayer;
    
    return room;
  }

  initializeBoard() {
    const board = [];
    for (let i = 0; i < 6; i++) {
      board[i] = [];
      for (let j = 0; j < 6; j++) {
        board[i][j] = { type: 0, reversal: true, character: {} };
      }
    }
    
    // 设置初始棋子位置
    board[2][2] = { type: 1, reversal: true, character: {} };
    board[2][3] = { type: 2, reversal: true, character: {} };
    board[3][2] = { type: 2, reversal: true, character: {} };
    board[3][3] = { type: 1, reversal: true, character: {} };
    
    return board;
  }
}

const gameManager = new GameManager();

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);
  
  // 加入房间
  socket.on('join-room', (roomId, player) => {
    try {
      const room = gameManager.joinRoom(roomId, player);
      socket.join(roomId);
      players.set(socket.id, { ...player, socketId: socket.id, roomId });
      
      socket.emit('room-joined', room);
      socket.to(roomId).emit('player-joined', player);
      
      console.log(`玩家 ${player.name} 加入房间 ${roomId}`);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });
  
  // 离开房间
  socket.on('leave-room', (roomId, playerId) => {
    const room = gameManager.leaveRoom(roomId, playerId);
    socket.leave(roomId);
    players.delete(socket.id);
    
    socket.emit('room-left');
    if (room) {
      socket.to(roomId).emit('player-left', playerId);
    }
    
    console.log(`玩家 ${playerId} 离开房间 ${roomId}`);
  });
  
  // 游戏移动
  socket.on('game-move', (move) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      
      const room = gameManager.makeMove(player.roomId, move);
      if (room) {
        io.to(player.roomId).emit('game-state-update', room.gameState);
      }
    } catch (error) {
      socket.emit('error', error.message);
    }
  });
  
  // 开始游戏
  // 这里的 players 是一个 Map，key 是 socket.id，value 是玩家对象
  // 当有两个玩家时，每个玩家连接时都会有自己的 socket.id
  // 通过 socket.on('start-game') 时，socket.id 就是当前发起 start-game 的客户端的 id
  // 所以 players.get(socket.id) 总是获取到当前发起请求的玩家对象
  socket.on('start-game', () => {
    try {
      console.log('start-game players', Array.from(players.entries()));
      // 获取当前发起 start-game 的玩家
      const player = players.get(socket.id);
      console.log('current player', player);
      if (!player) return;

      // player.roomId 是该玩家所在房间
      const room = gameManager.startGame(player.roomId);
      if (room) {
        // 通知房间内所有玩家游戏开始
        io.to(player.roomId).emit('game-start', room.gameState);
      }
    } catch (error) {
      socket.emit('error', error.message);
    }
  });
  
  // 断开连接
  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      const room = gameManager.leaveRoom(player.roomId, player.id);
      if (room) {
        socket.to(player.roomId).emit('player-left', player.id);
      }
      players.delete(socket.id);
    }
    console.log('用户断开连接:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});