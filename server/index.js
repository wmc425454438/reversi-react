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
      currentPlayer: null,
      joinedInGame: new Set()
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
    room.joinedInGame = room.joinedInGame || new Set();
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
    room.joinedInGame = new Set();
    
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
    if (room.gameState?.gameOver) {
      throw new Error('游戏已结束');
    }
    
    // 验证移动是否合法
    if (room.currentPlayer !== move.playerId) {
      throw new Error('不是您的回合');
    }
    // 推断当前玩家棋子类型（players[0] -> 1, players[1] -> 2）
    const myType = room.players[0].id === move.playerId ? 1 : 2;
    const enemyType = myType === 1 ? 2 : 1;

    // 构造新棋盘（不包含可落子标记3），保留已有角色
    const oldBoard = room.gameState.tableArr || [];
    const size = oldBoard.length || 6;
    const newBoard = Array.from({ length: size }, (_, i) =>
      Array.from({ length: size }, (_, j) => {
        const cell = oldBoard[i]?.[j] || { type: 0, reversal: true, character: {} };
        // 清理客户端可能带来的 3 标记；保留已有角色
        return { type: cell.type === 3 ? 0 : cell.type, reversal: true, character: cell.character || {} };
      })
    );

    const { row, col, character } = move;
    if (
      row < 0 || row >= size ||
      col < 0 || col >= size ||
      newBoard[row][col].type !== 0
    ) {
      throw new Error('非法落子');
    }

    // 放置棋子（写入角色）
    newBoard[row][col] = { type: myType, reversal: true, character: character || {} };

    // 翻转逻辑（8方向）
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];
    let totalComboDamage = 0;
    for (const [dx, dy] of directions) {
      let x = row + dx;
      let y = col + dy;
      const toFlip = [];
      while (x >= 0 && x < size && y >= 0 && y < size) {
        const t = newBoard[x][y].type;
        if (t === enemyType) {
          toFlip.push([x, y]);
          x += dx; y += dy;
          continue;
        }
        if (t === myType) {
          // 若封口格带有角色且包含 _combo，则结算连击伤害
          const closerCell = newBoard[x][y];
          if (closerCell && closerCell.character && typeof closerCell.character === 'object' && '_combo' in closerCell.character) {
            const combo = Number(closerCell.character._combo || 0);
            if (!Number.isNaN(combo) && combo > 0) {
              totalComboDamage += combo;
            }
          }
          // 翻转中间的敌子并清空其角色
          for (const [fx, fy] of toFlip) {
            newBoard[fx][fy] = { type: myType, reversal: true, character: {} };
          }
        }
        break;
      }
    }

    // 伤害计算：落子攻击 + 连击伤害（与本地一致）
    const attack = Number((character && character._attack) || 0) || 0;
    const totalDamage = attack + totalComboDamage;
    // 更新对方血量
    if (myType === 1) {
      const hp = Math.max(0, (room.gameState.player2?._hp ?? 120) - totalDamage);
      room.gameState.player2 = { ...(room.gameState.player2 || { _name: room.players[1].name }), _hp: hp };
      if (hp <= 0) room.gameState.gameOver = true;
    } else {
      const hp = Math.max(0, (room.gameState.player1?._hp ?? 120) - totalDamage);
      room.gameState.player1 = { ...(room.gameState.player1 || { _name: room.players[0].name }), _hp: hp };
      if (hp <= 0) room.gameState.gameOver = true;
    }

    // 切换当前玩家与 lastMove；若游戏结束则不再切换并停止对局
    if (room.gameState.gameOver) {
      room.isGameStarted = false;
      room.gameState = {
        ...room.gameState,
        tableArr: newBoard
      };
    } else {
      const nextPlayer = room.players.find(p => p.id !== move.playerId);
      room.currentPlayer = nextPlayer?.id;
      room.gameState = {
        ...room.gameState,
        tableArr: newBoard,
        lastMove: myType === 1 ? 2 : 1,
        currentPlayer: room.currentPlayer
      };
    }

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
  
  // 自动匹配：寻找未满且未开始的房间，否则创建新房间
  socket.on('auto-match', (player) => {
    try {
      // 查找可加入的房间
      let targetRoom = null;
      for (const [rid, room] of gameManager.rooms.entries()) {
        if (!room.isGameStarted && room.players.length < room.maxPlayers) {
          targetRoom = room;
          break;
        }
      }

      const roomId = targetRoom ? targetRoom.id : `room_${Math.random().toString(36).slice(2, 8)}`;
      const room = targetRoom ? gameManager.joinRoom(roomId, player) : gameManager.createRoom(roomId, player);

      socket.join(roomId);
      players.set(socket.id, { ...player, socketId: socket.id, roomId });

      socket.emit('room-joined', room);
      socket.to(roomId).emit('player-joined', player);

      // 如果已满两人，立即通知双方进入游戏界面
      if (room.players.length === room.maxPlayers) {
        io.to(roomId).emit('enter-game', {
          roomId: room.id,
          players: room.players,
          name: room.name,
          maxPlayers: room.maxPlayers
        });
      }
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  // 选择势力：记录在 players 映射中
  socket.on('select-faction', (faction) => {
    const p = players.get(socket.id);
    if (!p) return;
    p.faction = faction;
    players.set(socket.id, p);
  });
  
  // 离开房间：任一玩家离开则关闭房间并让所有玩家退出
  socket.on('leave-room', async (roomId, playerId) => {
    try {
      // 通知房间内所有玩家房间关闭
      io.to(roomId).emit('room-closed');
      // 强制所有 socket 离开该房间
      await io.in(roomId).socketsLeave(roomId);
      // 清理 players 映射中属于该房间的玩家
      const roomSocketIds = (io.sockets.adapter.rooms.get(roomId)) || new Set();
      for (const sid of roomSocketIds) {
        const p = players.get(sid);
        if (p && p.roomId === roomId) players.delete(sid);
      }
      // 删除房间
      gameManager.rooms.delete(roomId);
      // 当前 socket 本人也做本地清理
      players.delete(socket.id);
      socket.emit('room-left');
      console.log(`房间 ${roomId} 已关闭，因玩家 ${playerId} 离开`);
    } catch (err) {
      socket.emit('error', '关闭房间失败');
    }
  });
  
  // 游戏移动
  socket.on('game-move', (move) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      
      const room = gameManager.makeMove(player.roomId, move);
      if (room) {
        io.to(player.roomId).emit('game-state-update', room.gameState);
        if (room.gameState.gameOver) {
          io.to(player.roomId).emit('game-over', {
            winner: room.players.find(p => p.id === room.currentPlayer)?.name || ''
          });
        }
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
      const player = players.get(socket.id);
      if (!player) return;
      const room = gameManager.rooms.get(player.roomId);
      if (room) {
        // 第一步：先让双方进入游戏界面
        io.to(player.roomId).emit('enter-game', {
          roomId: room.id,
          players: room.players,
          name: room.name,
          maxPlayers: room.maxPlayers
        });
      }
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  // 客户端进入游戏界面后上报
  socket.on('game-join', () => {
    const player = players.get(socket.id);
    if (!player) return;
    const room = gameManager.rooms.get(player.roomId);
    if (!room) return;
    room.joinedInGame = room.joinedInGame || new Set();
    room.joinedInGame.add(player.id);
    if (room.joinedInGame.size >= room.maxPlayers) {
      const started = gameManager.startGame(player.roomId);
      if (started) {
        io.to(player.roomId).emit('game-start', started.gameState);
      }
    }
  });
  
  // 断开连接：同样关闭所在房间
  socket.on('disconnect', async () => {
    const player = players.get(socket.id);
    if (player) {
      const roomId = player.roomId;
      try {
        io.to(roomId).emit('room-closed');
        await io.in(roomId).socketsLeave(roomId);
        const roomSocketIds = (io.sockets.adapter.rooms.get(roomId)) || new Set();
        for (const sid of roomSocketIds) {
          const p = players.get(sid);
          if (p && p.roomId === roomId) players.delete(sid);
        }
        gameManager.rooms.delete(roomId);
      } catch {}
      players.delete(socket.id);
    }
    console.log('用户断开连接:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});