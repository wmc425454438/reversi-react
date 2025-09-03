import React, { useState, useEffect, useCallback } from 'react';
import { Player } from '../models/Player';
import { Liubei, Guanyu, Zhangfei, ZhaoYun, MaChao } from '../models/characters';
import type { Character } from '../models/characters';
import type { ChessPiece, GameState } from '../types/reversi';
import type { NetworkMove, NetworkGameState, GameRoom } from '../types/network';
import NetworkService from '../services/NetworkService';
import './ReversiGame.css';

const BOARD_SIZE = 6;
const INITIAL_HP = 120;

interface NetworkReversiGameProps {
  room: GameRoom;
  onGameEnd: () => void;
}

const NetworkReversiGame: React.FC<NetworkReversiGameProps> = ({ room, onGameEnd }) => {
  const [gameState, setGameState] = useState<GameState>({
    tableArr: [],
    lastMove: 1,
    player1: new Player("bot1", "", 1),
    player2: new Player("bot2", "", 2),
    gameOver: false,
    threeDimensionsOn: false
  });

  const [selectedCard, setSelectedCard] = useState<Character | null>(null);
  const [usedCards, setUsedCards] = useState<Set<string>>(new Set());
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gameOverModalVisible, setGameOverModalVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [myId, setMyId] = useState<string>('');

  const currentPlayer = NetworkService.getCurrentPlayer();

  // 计算可移动区域（复用原有逻辑）
  const calculateMoveableArea = useCallback((board: ChessPiece[][], currentPlayer: number) => {
    const newBoard = board.map(row => [...row]);

    // 清除之前的可移动位置
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (newBoard[i][j].type === 3) {
          newBoard[i][j].type = 0;
        }
      }
    }

    // 查找可移动位置（复用原有逻辑）
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (newBoard[i][j].type === currentPlayer) {
          findMoveablePositions(newBoard, i, j, currentPlayer);
        }
      }
    }

    setGameState(prev => ({ ...prev, tableArr: newBoard }));
  }, []);

  // 初始化游戏
  const initGame = useCallback(() => {
    const board: ChessPiece[][] = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      board[i] = [];
      for (let j = 0; j < BOARD_SIZE; j++) {
        board[i][j] = { type: 0, reversal: true, character: {} };
      }
    }

    // 设置初始棋子位置
    board[2][2] = { type: 1, reversal: true, character: {} };
    board[2][3] = { type: 2, reversal: true, character: {} };
    board[3][2] = { type: 2, reversal: true, character: {} };
    board[3][3] = { type: 1, reversal: true, character: {} };

    setGameState(prev => ({
      ...prev,
      tableArr: board,
      lastMove: 1,
      player1: new Player(room.players[0]?.name || "玩家1", "", 1),
      player2: new Player(room.players[1]?.name || "玩家2", "", 2),
      gameOver: false
    }));
    calculateMoveableArea(board, 1);
  }, [calculateMoveableArea]);

  // 通知后端：我已进入游戏界面，等待双方都进入后再开始
  useEffect(() => {
    NetworkService.joinGameView?.();
  }, []);

  // 查找可移动位置
  const findMoveablePositions = (board: ChessPiece[][], row: number, col: number, playerType: number) => {
    const enemyType = playerType === 1 ? 2 : 1;
    const directions = [
      [-1, 0], // 上
      [1, 0],  // 下
      [0, -1], // 左
      [0, 1],  // 右
      [-1, -1], // 左上
      [-1, 1],  // 右上
      [1, -1],  // 左下
      [1, 1],   // 右下
    ];

    for (const [dx, dy] of directions) {
      let x = row + dx;
      let y = col + dy;
      let seenEnemy = false;

      while (x >= 0 && x < board.length && y >= 0 && y < board[x].length) {
        const cellType = board[x][y].type;
        if (cellType === enemyType) {
          seenEnemy = true;
          x += dx;
          y += dy;
          continue;
        }
        if (cellType === 0 || cellType === 3) {
          if (seenEnemy) {
            board[x][y] = { type: 3, reversal: false, character: {} };
          }
          break;
        }
        // 遇到自己或其他情况，停止该方向
        break;
      }
    }
  };

  // 落子
  const moveChess = useCallback((row: number, col: number) => {
    if (!isMyTurn || gameState.tableArr[row][col].type !== 3 || !selectedCard) {
      return;
    }

    // 创建移动数据
    const move: NetworkMove = {
      row,
      col,
      character: selectedCard,
      playerId: currentPlayer?.id || '',
      timestamp: Date.now()
    };

    // 发送移动到服务器
    NetworkService.sendMove(move);

    // 本地乐观更新：放置棋子、翻转、切换回合、标记卡牌已用、计算对手可落子区
    const myType = room.players[0]?.id === currentPlayer?.id ? 1 : 2;
    const nextPlayerType = myType === 1 ? 2 : 1;

    const newBoard: ChessPiece[][] = gameState.tableArr.map(r => r.map(c => ({ ...c })));
    // 放置棋子
    newBoard[row][col] = {
      type: myType,
      reversal: true,
      character: selectedCard as Character
    };

    // 翻转棋子（按8方向规则）
    const enemyType = myType === 1 ? 2 : 1;
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];
    for (const [dx, dy] of directions) {
      let x = row + dx;
      let y = col + dy;
      const toFlip: Array<[number, number]> = [];
      while (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
        const t = newBoard[x][y].type;
        if (t === enemyType) {
          toFlip.push([x, y]);
          x += dx; y += dy;
          continue;
        }
        if (t === myType) {
          // 封口，翻转
          for (const [fx, fy] of toFlip) {
            newBoard[fx][fy] = {
              type: myType,
              reversal: true,
              character: {}
            } as ChessPiece;
          }
        }
        break;
      }
    }

    // 切换玩家与更新状态
    setGameState(prev => ({
      ...prev,
      tableArr: newBoard,
      lastMove: nextPlayerType
    }));

    // 标记卡牌为已用
    setUsedCards(prev => new Set([...prev, (selectedCard as Character)._name]));

    // 计算对手的可落子区域
    calculateMoveableArea(newBoard, nextPlayerType);

    // 本地结束本回合
    setIsMyTurn(false);

    // 清除选中的卡牌
    setSelectedCard(null);
  }, [isMyTurn, gameState.tableArr, selectedCard, currentPlayer]);

  // 获取所有角色卡牌
  const getAllCharacters = (): Character[] => {
    return [Liubei, Guanyu, Zhangfei, ZhaoYun, MaChao];
  };

  // 获取可用的角色卡牌
  const getAvailableCharacters = (): Character[] => {
    return getAllCharacters().filter(character => !usedCards.has(character._name));
  };

  // 监听网络事件
  useEffect(() => {
    if (!myId) {
      const id = NetworkService.getCurrentPlayer()?.id || '';
      if (id) setMyId(id);
    }
    // 监听游戏状态更新
    NetworkService.on('game-state-update', (networkGameState: NetworkGameState) => {
      // 将网络游戏状态转换为本地游戏状态
      const newGameState: GameState = {
        tableArr: networkGameState.tableArr,
        lastMove: networkGameState.lastMove,
        player1: new Player(networkGameState.player1._name, "", 1),
        player2: new Player(networkGameState.player2._name, "", 2),
        gameOver: networkGameState.gameOver,
        threeDimensionsOn: false
      };

      setGameState(newGameState);
      setCurrentPlayerId(networkGameState.currentPlayer);
      setIsMyTurn(networkGameState.currentPlayer === (myId || NetworkService.getCurrentPlayer()?.id));

      // 根据当前客户端所属阵营，计算可落子区域
      const myType = room.players[0]?.id === currentPlayer?.id ? 1 : 2;
      calculateMoveableArea(networkGameState.tableArr as unknown as ChessPiece[][], myType);

      if (networkGameState.gameOver) {
        setGameOverModalVisible(true);
      }
    });

    // 监听游戏结束
    NetworkService.on('game-over', (winner: string) => {
      setGameOverModalVisible(true);
    });

    // 监听错误
    NetworkService.on('error', (message: string) => {
      console.error('游戏错误:', message);
    });

    return () => {
      NetworkService.off('game-state-update');
      NetworkService.off('game-over');
      NetworkService.off('error');
    };
  }, [currentPlayer, myId]);

  // 监听游戏开始，初始化回合与状态（解决 isMyTurn 初始为 false 无法操作）
  useEffect(() => {
    const onGameStart = (networkGameState: NetworkGameState) => {
      console.log('networkGameState', networkGameState);
      console.log('room.players', room.players);
      console.log('currentPlayer', currentPlayer);
      const newGameState: GameState = {
        tableArr: networkGameState.tableArr,
        lastMove: networkGameState.lastMove,
        player1: new Player(networkGameState.player1._name, "", 1),
        player2: new Player(networkGameState.player2._name, "", 2),
        gameOver: networkGameState.gameOver,
        threeDimensionsOn: false
      };

      setGameState(newGameState);
      setCurrentPlayerId(networkGameState.currentPlayer);
      setIsMyTurn(networkGameState.currentPlayer === (myId || NetworkService.getCurrentPlayer()?.id));

      const myType = room.players[0]?.id === currentPlayer?.id ? 1 : 2;
      calculateMoveableArea(networkGameState.tableArr as unknown as ChessPiece[][], myType);
    };

    NetworkService.on('game-start', onGameStart as any);
    return () => {
      NetworkService.off('game-start', onGameStart as any);
    };
  }, [currentPlayer, myId]);

  // 初始化游戏
  useEffect(() => {
    initGame();
  }, []);

  const handleCardClick = (character: Character) => {
    if (!isMyTurn || usedCards.has(character._name)) {
      return;
    }
    setSelectedCard(character);
  };

  // 拖拽：开始
  const handleCardDragStart = (e: React.DragEvent, character: Character) => {
    if (!isMyTurn || usedCards.has(character._name)) {
      e.preventDefault();
      return;
    }
    setSelectedCard(character);
    setIsDragging(true);
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  // 拖拽：结束
  const handleCardDragEnd = () => {
    setIsDragging(false);
  };

  // 触摸：开始
  const handleTouchStart = (e: React.TouchEvent, character: Character) => {
    if (!isMyTurn || usedCards.has(character._name)) {
      return;
    }
    setSelectedCard(character);
    setIsDragging(true);
    const t = e.touches[0];
    setDragPosition({ x: t.clientX, y: t.clientY });
  };

  // 触摸：移动
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const t = e.touches[0];
    setDragPosition({ x: t.clientX, y: t.clientY });
  };

  // 触摸：结束，投递到目标格
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging || !selectedCard) return;
    const t = e.changedTouches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY);
    const td = el?.closest('td') as HTMLTableCellElement | null;
    if (td) {
      const rowIndex = parseInt(td.getAttribute('data-row') || '');
      const colIndex = parseInt(td.getAttribute('data-col') || '');
      if (!isNaN(rowIndex) && !isNaN(colIndex) && gameState.tableArr[rowIndex][colIndex].type === 3) {
        moveChess(rowIndex, colIndex);
      }
    }
    setIsDragging(false);
  };

  // 桌面拖拽：阻止默认以允许 drop
  const handleBoardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 桌面拖拽：放置
  const handleBoardDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    if (!selectedCard || !isMyTurn) return;
    if (gameState.tableArr[row][col].type === 3) {
      moveChess(row, col);
    }
  };

  const handleRestart = () => {
    setGameOverModalVisible(false);
    setUsedCards(new Set());
    setSelectedCard(null);
    initGame();
  };

  const handleLeaveGame = () => {
    NetworkService.leaveRoom();
    onGameEnd();
  };

  return (
    <div className="network-reversi-container">
      {/* 游戏信息 */}
      <div className="game-info">
        <div className="current-player">
          当前回合: {currentPlayerId && (currentPlayerId === (myId || NetworkService.getCurrentPlayer()?.id)) ? '您' : '对手'}
        </div>
        <div className="room-info">
          房间: {room.name} ({room.players.length}/2)
        </div>
      </div>

      {/* 玩家1血条 */}
      <div className="player">
        <div
          className="player-hp"
          style={{ width: `${(gameState.player1._hp / INITIAL_HP) * 100}%` }}
        />
        <div className="player-hp--ratio">
          {gameState.player1._name}: {gameState.player1._hp}/{INITIAL_HP}
        </div>
      </div>

      {/* 棋盘 */}
      <div className="desk-table">
        <table onDragOver={handleBoardDragOver}>
          <tbody>
            {gameState.tableArr.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((col, colIndex) => (
                  <td
                    key={`${rowIndex}-${colIndex}`}
                    data-row={rowIndex}
                    data-col={colIndex}
                    onClick={() => moveChess(rowIndex, colIndex)}
                    onDragOver={handleBoardDragOver}
                    onDrop={(e) => handleBoardDrop(e, rowIndex, colIndex)}
                    className={col.type === 3 ? 'drop-zone' : ''}
                  >
                    <div className="element">
                      <div className={`chess-character ${col.character && typeof col.character === 'object' && '_name' in col.character ? '' : 'hidden'}`}>
                        {col.character && typeof col.character === 'object' && '_name' in col.character ?
                          String(col.character._name).substr(0, 1).toUpperCase() : ''}
                      </div>
                      <div
                        className={`chess ${col.type === 1 ? 'chess-orange' :
                            col.type === 2 ? 'chess-blue' :
                              col.type === 3 ? 'chess-movable' : ''
                          } ${col.reversal ? 'chess-rotate' : ''}`}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 玩家2血条 */}
      <div className="player">
        <div
          className="player-hp"
          style={{ width: `${(gameState.player2._hp / INITIAL_HP) * 100}%` }}
        />
        <div className="player-hp--ratio">
          {gameState.player2._name}: {gameState.player2._hp}/{INITIAL_HP}
        </div>
      </div>

      {/* 卡牌区域 */}
      <div className="card-section">
        <div className="card-container">
          {getAvailableCharacters().map((character, index) => (
            <div
              key={index}
              className={`character-card ${selectedCard?._name === character._name ? 'selected' : ''} ${!isMyTurn ? 'disabled' : ''}`}
              draggable
              onDragStart={(e) => handleCardDragStart(e, character)}
              onDragEnd={handleCardDragEnd}
              onClick={() => handleCardClick(character)}
              onTouchStart={(e) => handleTouchStart(e, character)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="card-header">
                <h4>{character._name}</h4>
                <div className="card-stats">
                  <span className="attack">攻击: {character._attack}</span>
                  <span className="combo">连击: {character._combo}</span>
                </div>
              </div>
              <div className="card-description">
                {character._description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="game-controls">
        <button onClick={handleLeaveGame} className="leave-game-btn">
          离开游戏
        </button>
      </div>

      {/* 游戏结束弹窗 */}
      {gameOverModalVisible && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>游戏结束</h3>
            <p>重新开始吧！</p>
            <div className="modal-buttons">
              <button onClick={handleRestart} className="restart-btn">
                重新开始
              </button>
              <button onClick={handleLeaveGame} className="leave-btn">
                离开游戏
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkReversiGame;
