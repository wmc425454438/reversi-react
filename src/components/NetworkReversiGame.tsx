import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Player } from '../models/Player';
import { WeiCharacters, ShuCharacters, WuCharacters } from '../models/characters';
import type { Character } from '../models/characters';
import type { ChessPiece, GameState } from '../types/reversi';
import type { NetworkMove, NetworkGameState, GameRoom } from '../types/network';
import { PlayerDeck, PlayerHand } from '../types/card';
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
    threeDimensionsOn: false,
    // 牌组系统
    player1Deck: new PlayerDeck('魏'),
    player2Deck: new PlayerDeck('魏'),
    player1Hand: new PlayerHand(5),
    player2Hand: new PlayerHand(5),
    currentPlayerFaction: null
  });

  const [selectedCard, setSelectedCard] = useState<Character | null>(null);
  const [usedCards, setUsedCards] = useState<Set<string>>(new Set());
  const [hand, setHand] = useState<Character[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gameOverModalVisible, setGameOverModalVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [myId, setMyId] = useState<string>('');
  const [confirmLeaveVisible, setConfirmLeaveVisible] = useState(false);
  const [roomClosedModalVisible, setRoomClosedModalVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const deskRef = useRef<HTMLDivElement | null>(null);

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

  // 清除所有可落子标记
  const clearMoveableArea = useCallback((board: ChessPiece[][]) => {
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (newBoard[i][j].type === 3) {
          newBoard[i][j].type = 0;
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

    // 获取玩家势力
    const currentPlayer = NetworkService.getCurrentPlayer();
    const playerFaction = currentPlayer?.faction || '魏';
    
    // 初始化牌组
    const player1Deck = new PlayerDeck(playerFaction);
    const player2Deck = new PlayerDeck(playerFaction);
    const player1Hand = new PlayerHand(5);
    const player2Hand = new PlayerHand(5);
    
    // 打印初始牌组信息
    console.log(`=== 游戏初始化 - ${playerFaction}势力 ===`);
    console.log(`玩家1牌组: ${player1Deck.getRemainingCards()}张卡牌`);
    console.log(`玩家2牌组: ${player2Deck.getRemainingCards()}张卡牌`);
    console.log(`玩家1手牌: ${player1Hand.getCardCount()}张卡牌`);
    console.log(`玩家2手牌: ${player2Hand.getCardCount()}张卡牌`);

    setGameState(prev => ({
      ...prev,
      tableArr: board,
      lastMove: 1,
      player1: new Player(room.players[0]?.name || "玩家1", "", 1),
      player2: new Player(room.players[1]?.name || "玩家2", "", 2),
      gameOver: false,
      player1Deck,
      player2Deck,
      player1Hand,
      player2Hand,
      currentPlayerFaction: playerFaction
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
            // 检查是否有连击效果
            const hasCombo = checkComboEffect(board, x, y, playerType, enemyType);
            board[x][y] = { 
              type: 3, 
              reversal: false, 
              character: {},
              hasCombo: hasCombo
            };
          }
          break;
        }
        // 遇到自己或其他情况，停止该方向
        break;
      }
    }
  };

  // 检查连击效果
  const checkComboEffect = (board: ChessPiece[][], row: number, col: number, playerType: number, enemyType: number): boolean => {
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];
    
    for (const [dx, dy] of directions) {
      let x = row + dx;
      let y = col + dy;
      let seenEnemy = false;
      
      while (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
        const t = board[x][y].type;
        if (t === enemyType) { 
          seenEnemy = true; 
          x += dx; 
          y += dy; 
          continue; 
        }
        if (t === playerType) {
          if (seenEnemy) {
            const closerCell = board[x][y];
            const hasCombo = closerCell && closerCell.character && typeof closerCell.character === 'object' && '_combo' in closerCell.character && Number((closerCell.character as any)._combo) > 0;
            if (hasCombo) {
              return true;
            }
          }
        }
        break;
      }
    }
    return false;
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

    // 从手牌移除已使用的卡（移除一张匹配的）
    setHand(prev => {
      const idx = prev.findIndex(c => c._name === (selectedCard as Character)._name);
      if (idx >= 0) {
        const copy = prev.slice();
        copy.splice(idx, 1);
        return copy;
      }
      return prev;
    });

    // 从牌组抽取一张卡牌到手牌
    const myDeck = myType === 1 ? gameState.player1Deck : gameState.player2Deck;
    const myHand = myType === 1 ? gameState.player1Hand : gameState.player2Hand;
    
    // 打印当前牌组信息到控制台
    console.log(`=== 玩家${myType}牌组信息 ===`);
    console.log(`牌组剩余卡牌数量: ${myDeck.getRemainingCards()}`);
    console.log(`手牌当前数量: ${myHand.getCardCount()}`);
    console.log(`手牌是否已满: ${myHand.isFull()}`);
    
    const drawnCard = myDeck.drawCard();
    if (drawnCard && !myHand.isFull()) {
      myHand.addCard(drawnCard);
      console.log(`抽取到卡牌: ${drawnCard.character._name} (ID: ${drawnCard.id})`);
      console.log(`抽取后手牌数量: ${myHand.getCardCount()}`);
      console.log(`抽取后牌组剩余: ${myDeck.getRemainingCards()}`);
      
      // 立即更新游戏状态中的手牌和牌组
      setGameState(prev => ({
        ...prev,
        player1Hand: myType === 1 ? myHand : prev.player1Hand,
        player2Hand: myType === 2 ? myHand : prev.player2Hand,
        player1Deck: myType === 1 ? myDeck : prev.player1Deck,
        player2Deck: myType === 2 ? myDeck : prev.player2Deck
      }));
      
      // 更新手牌显示
      setHand(myHand.getCards().map(card => card.character));
    } else {
      console.log('无法抽取卡牌:', drawnCard ? '手牌已满' : '牌组已空');
    }

    // 计算对手的可落子区域
    calculateMoveableArea(newBoard, nextPlayerType);

    // 本地结束本回合
    setIsMyTurn(false);

    // 清除选中的卡牌
    setSelectedCard(null);
    // 落子后停止动画和清空预览
    stopAnimation();
  }, [isMyTurn, gameState.tableArr, selectedCard, currentPlayer]);

  // 获取势力牌库
  const getAllCharacters = (): Character[] => {
    const faction = NetworkService.getCurrentPlayer()?.faction || NetworkService.getPreferredFaction?.();
    if (faction === '魏') return WeiCharacters;
    if (faction === '吴') return WuCharacters;
    // 默认蜀
    return ShuCharacters;
  };

  // 获取可用的角色卡牌
  const getAvailableCharacters = (): Character[] => {
    return hand;
  };

  // 检查并补充手牌
  const checkAndRefillHand = useCallback((playerType: number) => {
    const myHand = playerType === 1 ? gameState.player1Hand : gameState.player2Hand;
    const myDeck = playerType === 1 ? gameState.player1Deck : gameState.player2Deck;
    
    console.log(`=== 回合开始前检查自己的手牌 (玩家${playerType}) ===`);
    console.log(`当前手牌数量: ${myHand.getCardCount()}`);
    console.log(`牌组剩余: ${myDeck.getRemainingCards()}`);
    
    // 如果手牌少于5张且牌组还有卡牌，则抽取一张
    if (myHand.getCardCount() < 5 && myDeck.getRemainingCards() > 0) {
      const drawnCard = myDeck.drawCard();
      if (drawnCard) {
        myHand.addCard(drawnCard);
        console.log(`补充手牌: ${drawnCard.character._name} (ID: ${drawnCard.id})`);
        console.log(`补充后手牌数量: ${myHand.getCardCount()}`);
        
        // 更新游戏状态
        setGameState(prev => ({
          ...prev,
          player1Hand: playerType === 1 ? myHand : prev.player1Hand,
          player2Hand: playerType === 2 ? myHand : prev.player2Hand,
          player1Deck: playerType === 1 ? myDeck : prev.player1Deck,
          player2Deck: playerType === 2 ? myDeck : prev.player2Deck
        }));
        
        // 如果是当前玩家，更新手牌显示
        if (playerType === (room.players[0]?.id === currentPlayer?.id ? 1 : 2)) {
          setHand(myHand.getCards().map(card => card.character));
        }
      }
    } else if (myHand.getCardCount() < 5) {
      console.log('无法补充手牌: 牌组已空');
    } else {
      console.log('手牌已满，无需补充');
    }
  }, [gameState.player1Hand, gameState.player2Hand, gameState.player1Deck, gameState.player2Deck, currentPlayer, room.players]);

  // 生成初始手牌（5张，最多2张相同角色）
  const generateInitialHand = useCallback(() => {
    const pool = getAllCharacters();
    const counts = new Map<string, number>();
    const result: Character[] = [];
    if (pool.length === 0) return result;
    while (result.length < 5) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const name = pick._name;
      const cnt = counts.get(name) || 0;
      if (cnt < 2) {
        result.push(pick);
        counts.set(name, cnt + 1);
      }
      // 若池子过小仍可继续循环，最多重复到2张
    }
    return result;
  }, []);

  // 监听网络事件
  useEffect(() => {
    if (!myId) {
      const id = NetworkService.getCurrentPlayer()?.id || '';
      if (id) setMyId(id);
    }
    // 监听游戏状态更新
    NetworkService.on('game-state-update', (networkGameState: NetworkGameState) => {
      // 将网络游戏状态转换为本地游戏状态（保留服务端下发的血量）
      const p1 = new Player(networkGameState.player1._name, "", 1);
      const p2 = new Player(networkGameState.player2._name, "", 2);
      if (typeof networkGameState.player1._hp === 'number') {
        p1._hp = networkGameState.player1._hp;
      }
      if (typeof networkGameState.player2._hp === 'number') {
        p2._hp = networkGameState.player2._hp;
      }

      const newGameState: GameState = {
        tableArr: networkGameState.tableArr,
        lastMove: networkGameState.lastMove,
        player1: p1,
        player2: p2,
        gameOver: networkGameState.gameOver,
        threeDimensionsOn: false,
        // 保持现有的牌组信息
        player1Deck: gameState.player1Deck,
        player2Deck: gameState.player2Deck,
        player1Hand: gameState.player1Hand,
        player2Hand: gameState.player2Hand,
        currentPlayerFaction: gameState.currentPlayerFaction
      };

      setGameState(newGameState);
      setCurrentPlayerId(networkGameState.currentPlayer);
      const isMine = networkGameState.currentPlayer === (myId || NetworkService.getCurrentPlayer()?.id);
      setIsMyTurn(isMine);

      // 仅在自己的回合标记可落子区，否则清除
      const myType = room.players[0]?.id === currentPlayer?.id ? 1 : 2;
      if (isMine) {
        // 回合开始前检查自己的手牌
        checkAndRefillHand(myType);
        calculateMoveableArea(networkGameState.tableArr as unknown as ChessPiece[][], myType);
      } else {
        clearMoveableArea(networkGameState.tableArr as unknown as ChessPiece[][]);
      }

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
      const p1 = new Player(networkGameState.player1._name, "", 1);
      const p2 = new Player(networkGameState.player2._name, "", 2);
      if (typeof networkGameState.player1._hp === 'number') {
        p1._hp = networkGameState.player1._hp;
      }
      if (typeof networkGameState.player2._hp === 'number') {
        p2._hp = networkGameState.player2._hp;
      }

      const newGameState: GameState = {
        tableArr: networkGameState.tableArr,
        lastMove: networkGameState.lastMove,
        player1: p1,
        player2: p2,
        gameOver: networkGameState.gameOver,
        threeDimensionsOn: false,
        // 保持现有的牌组信息
        player1Deck: gameState.player1Deck,
        player2Deck: gameState.player2Deck,
        player1Hand: gameState.player1Hand,
        player2Hand: gameState.player2Hand,
        currentPlayerFaction: gameState.currentPlayerFaction
      };

      setGameState(newGameState);
      setCurrentPlayerId(networkGameState.currentPlayer);
      const isMine = networkGameState.currentPlayer === (myId || NetworkService.getCurrentPlayer()?.id);
      setIsMyTurn(isMine);

      const myType = room.players[0]?.id === currentPlayer?.id ? 1 : 2;
      if (isMine) {
        calculateMoveableArea(networkGameState.tableArr as unknown as ChessPiece[][], myType);
      } else {
        clearMoveableArea(networkGameState.tableArr as unknown as ChessPiece[][]);
      }

      // 初始化手牌 - 从牌组抽取5张卡牌到手牌
      const myDeck = myType === 1 ? gameState.player1Deck : gameState.player2Deck;
      const myHand = myType === 1 ? gameState.player1Hand : gameState.player2Hand;
      
      // 从牌组抽取5张卡牌到手牌
      for (let i = 0; i < 5 && !myHand.isFull(); i++) {
        const card = myDeck.drawCard();
        if (card) {
          myHand.addCard(card);
        }
      }
      
      // 更新手牌显示
      setHand(myHand.getCards().map(card => card.character));
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
    if (!isMyTurn) {
      return;
    }
    setSelectedCard(character);
  };

  // 拖拽：开始
  const handleCardDragStart = (e: React.DragEvent, character: Character) => {
    if (!isMyTurn) {
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
    // 拖拽结束后，若未成功落子，恢复手牌显示（selectedCard 已保留）
    clearCanvas();
  };

  // 触摸：开始
  const handleTouchStart = (e: React.TouchEvent, character: Character) => {
    if (!isMyTurn) {
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
    // 预览：触摸移动时根据指尖所在格子计算连线
    const el = document.elementFromPoint(t.clientX, t.clientY);
    const td = el?.closest('td') as HTMLTableCellElement | null;
    if (!td) { clearCanvas(); return; }
    const rowIndex = parseInt(td.getAttribute('data-row') || '');
    const colIndex = parseInt(td.getAttribute('data-col') || '');
    if (Number.isNaN(rowIndex) || Number.isNaN(colIndex)) { clearCanvas(); return; }
    previewComboLines(rowIndex, colIndex);
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

  // 单元格级拖拽覆盖：实时预览可能的连击连线
  const handleCellDragOver = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    if (!isDragging) return;
    previewComboLines(row, col);
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
    setHand(generateInitialHand());
    initGame();
  };

  // 计算某格中心点（相对棋盘容器）
  const getCellCenter = (r: number, c: number): { x: number; y: number } | null => {
    const desk = deskRef.current;
    if (!desk) return null;
    const table = desk.querySelector('table');
    if (!table) return null;
    const td = table.querySelector(`td[data-row="${r}"][data-col="${c}"]`) as HTMLTableCellElement | null;
    if (!td) return null;
    const rect = td.getBoundingClientRect();
    const drect = desk.getBoundingClientRect();
    return { x: rect.left - drect.left + rect.width / 2, y: rect.top - drect.top + rect.height / 2 };
  };

  // 画布尺寸同步至棋盘容器
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const desk = deskRef.current;
    if (canvas && desk) {
      const rect = desk.getBoundingClientRect();
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('orientationchange', resizeCanvas);
    };
  }, [resizeCanvas]);

  // 清空画布
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // 动画：多条抖动曲线叠加，沿起止点之间的路径抖动（循环播放，线段始终连接）
  const animateComboLines = (segments: Array<{ from: { x: number; y: number }, to: { x: number; y: number } }>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 为每条段生成若干层参数
    const layers = 4; // 曲线层数
    const layerParams = Array.from({ length: layers }, (_, i) => ({
      amp: 6 - i * 1.2, // 抖动幅度递减
      freq: 2 + i,      // 频率不同
      phase: Math.random() * Math.PI * 2,
      alpha: 0.35 - i * 0.06,
      width: 3 - i * 0.5
    }));

    const step = (now: number) => {
      clearCanvas();
      for (const seg of segments) {
        const dx = seg.to.x - seg.from.x;
        const dy = seg.to.y - seg.from.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        // 法向量
        const nx = -uy;
        const ny = ux;

        for (const lp of layerParams) {
          ctx.beginPath();
          ctx.lineWidth = Math.max(1, lp.width);
          ctx.strokeStyle = '#fff70e';
          ctx.globalAlpha = Math.max(0, lp.alpha * (0.8 + 0.2 * Math.sin(now * 0.01)));
          ctx.shadowColor = 'rgba(255, 247, 14, 0.8)';
          ctx.shadowBlur = 8;

          const segmentsCount = 24; // 采样点
          for (let i = 0; i <= segmentsCount; i++) {
            // 线段始终完整连接，不变化长度
            const tt = i / segmentsCount;
            const baseX = seg.from.x + dx * tt;
            const baseY = seg.from.y + dy * tt;
            const wobble = lp.amp * Math.sin((tt * lp.freq * Math.PI * 2) + lp.phase + now * 0.02);
            const px = baseX + nx * wobble;
            const py = baseY + ny * wobble;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // 循环播放，使用animationRef管理
      animationRef.current = requestAnimationFrame(step);
    };
    animationRef.current = requestAnimationFrame(step);
  };

  // 存储当前动画的引用，用于停止循环动画
  const animationRef = useRef<number | null>(null);

  // 停止当前动画
  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    clearCanvas();
  };

  // 组件卸载时停止动画
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, []);

  // 预览：根据当前位置计算潜在连击连线
  const previewComboLines = (row: number, col: number) => {
    // 停止之前的动画
    stopAnimation();
    
    if (!selectedCard || !isMyTurn) { return; }
    const cell = gameState.tableArr[row]?.[col];
    if (!cell || cell.type !== 3) { return; }
    const me = NetworkService.getCurrentPlayer();
    const myType = room.players[0]?.id === me?.id ? 1 : 2;
    const enemyType = myType === 1 ? 2 : 1;
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];
    const segments: Array<{ from: { x: number; y: number }, to: { x: number; y: number } }> = [];
    for (const [dx, dy] of directions) {
      let x = row + dx;
      let y = col + dy;
      let seenEnemy = false;
      while (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
        const t = gameState.tableArr[x][y].type;
        if (t === enemyType) { seenEnemy = true; x += dx; y += dy; continue; }
        if (t === myType) {
          if (seenEnemy) {
            const closerCell = gameState.tableArr[x][y];
            const hasCombo = closerCell && closerCell.character && typeof closerCell.character === 'object' && '_combo' in closerCell.character && Number((closerCell.character as any)._combo) > 0;
            if (hasCombo) {
              const from = getCellCenter(row, col);
              const to = getCellCenter(x, y);
              if (from && to) segments.push({ from, to });
            }
          }
        }
        break;
      }
    }
    if (segments.length > 0) {
      animateComboLines(segments);
    }
  };

  const handleLeaveGame = () => {
    setConfirmLeaveVisible(true);
  };

  const confirmLeave = () => {
    setConfirmLeaveVisible(false);
    NetworkService.leaveRoom();
    onGameEnd();
  };

  const cancelLeave = () => {
    setConfirmLeaveVisible(false);
  };

  // 被动接收房间关闭，提示游戏已结束
  useEffect(() => {
    const onClosed = () => {
      setRoomClosedModalVisible(true);
    };
    NetworkService.on('room-closed', onClosed as any);
    return () => {
      NetworkService.off('room-closed', onClosed as any);
    };
  }, []);

  return (
    <div className="network-reversi-container">
      {/* 游戏信息 */}
      <div className="game-info">
        <div className="current-player">
          当前回合: {currentPlayerId && (currentPlayerId === (myId || NetworkService.getCurrentPlayer()?.id)) ? '您' : '对手'}
        </div>
        {/* <div className="room-info">
          房间: {room.name} ({room.players.length}/2)
        </div> */}
      </div>

      {/* 顶部：对手血条（根据当前用户阵营动态切换） */}
      {(() => {
        const me = NetworkService.getCurrentPlayer();
        const myType = room.players[0]?.id === me?.id ? 1 : 2;
        const oppPlayer = myType === 1 ? gameState.player2 : gameState.player1;
        return (
          <div className="player">
            <div
              className="player-hp"
              style={{ width: `${(oppPlayer._hp / INITIAL_HP) * 100}%` }}
            />
            <div className="player-hp--ratio">
              {oppPlayer._hp}/{INITIAL_HP}
            </div>
          </div>
        );
      })()}

      {/* 棋盘 */}
      <div className="desk-table" ref={deskRef}>
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 2, pointerEvents: 'none' }} />
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
                    onDragOver={(e) => { handleBoardDragOver(e); handleCellDragOver(e, rowIndex, colIndex); }}
                    onDrop={(e) => handleBoardDrop(e, rowIndex, colIndex)}
                    className={`${col.type === 3 ? 'drop-zone' : ''} ${col.hasCombo ? 'combo-available' : ''}`}
                  >
                    <div className="element">
                      <div className={`chess-character ${col.character && typeof col.character === 'object' && '_name' in col.character ? '' : 'hidden'}`}>
                        {col.character && typeof col.character === 'object' && '_name' in col.character ?
                          String(col.character._name).substr(0, 1).toUpperCase() : ''}
                      </div>
                      <div
                        className={`chess ${col.type === 3 ? 'chess-movable' : ''}`}
                      >
                        <div
                          className={`chess-inner ${col.type === 1 ? 'chess-orange' : col.type === 2 ? 'chess-blue' : ''} ${col.reversal ? 'chess-rotate' : ''}`}
                        />
                      </div>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 底部：自己血条（根据当前用户阵营动态切换） */}
      {(() => {
        const me = NetworkService.getCurrentPlayer();
        const myType = room.players[0]?.id === me?.id ? 1 : 2;
        const selfPlayer = myType === 1 ? gameState.player1 : gameState.player2;
        return (
          <div className="player">
            <div
              className="player-hp"
              style={{ width: `${(selfPlayer._hp / INITIAL_HP) * 100}%` }}
            />
            <div className="player-hp--ratio">
              {selfPlayer._hp}/{INITIAL_HP}
            </div>
          </div>
        );
      })()}

      {/* 卡牌区域 */}
      <div className="card-section">
        <div className="card-container">
          {getAvailableCharacters().map((character, index) => (
            <div
              key={index}
              className={`character-card ${selectedCard?._name === character._name ? 'selected' : ''} ${!isMyTurn ? 'disabled' : ''} ${isDragging && selectedCard?._name === character._name ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleCardDragStart(e, character)}
              onDrag={(e) => {
                if (!isDragging) return;
                setDragPosition({ x: e.clientX, y: e.clientY });
              }}
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

      {/* 拖拽预览棋子 */}
      {isDragging && selectedCard && (
        (() => {
          const me = NetworkService.getCurrentPlayer();
          const myType = room.players[0]?.id === me?.id ? 1 : 2;
          return (
            <div
              className={`drag-preview ${myType === 1 ? 'player1' : 'player2'}`}
              style={{ left: dragPosition.x, top: dragPosition.y }}
            >
              <div className="drag-preview-character">
                {String(selectedCard._name).substr(0, 1).toUpperCase()}
              </div>
            </div>
          );
        })()
      )}

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

      {/* 确认离开弹窗（自己点击离开时） */}
      {confirmLeaveVisible && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>确定离开吗？</h3>
            <div className="modal-buttons">
              <button onClick={confirmLeave} className="leave-btn">确定</button>
              <button onClick={cancelLeave} className="restart-btn">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 房间关闭弹窗（其他玩家看到） */}
      {roomClosedModalVisible && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>游戏已结束</h3>
            <div className="modal-buttons">
              <button onClick={() => onGameEnd()} className="leave-btn">确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkReversiGame;
