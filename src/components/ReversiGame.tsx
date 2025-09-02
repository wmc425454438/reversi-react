import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player } from '../models/Player';
import { Liubei, Guanyu, Zhangfei, ZhaoYun, MaChao } from '../models/characters';
import type { Character } from '../models/characters';
import type { ChessPiece, GameState } from '../types/reversi';
import './ReversiGame.css';

const BOARD_SIZE = 6;
const INITIAL_HP = 120;

const ReversiGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    tableArr: [],
    lastMove: 1,
    player1: new Player("bot1", "", 1),
    player2: new Player("bot2", "", 2),
    gameOver: false,
    threeDimensionsOn: false
  });
  
  const [undoStack, setUndoStack] = useState<{gameState: GameState, usedCards: Set<string>}[]>([]);
  const [gameOverModalVisible, setGameOverModalVisible] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // 创建棋盘数组
  const createBoard = useCallback((): ChessPiece[][] => {
    const board: ChessPiece[][] = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      board[i] = [];
      for (let j = 0; j < BOARD_SIZE; j++) {
        board[i][j] = { type: 0, reversal: true, character: {} };
      }
    }
    return board;
  }, []);

  // 初始化游戏
  const initGame = useCallback(() => {
    const board = createBoard();
    // 设置初始棋子位置
    board[2][2] = { type: 1, reversal: true, character: {} };
    board[2][3] = { type: 2, reversal: true, character: {} };
    board[3][2] = { type: 2, reversal: true, character: {} };
    board[3][3] = { type: 1, reversal: true, character: {} };

    const newGameState: GameState = {
      ...gameState,
      tableArr: board,
      lastMove: 1,
      player1: new Player("bot1", "", 1),
      player2: new Player("bot2", "", 2),
      gameOver: false
    };

    setGameState(newGameState);
    calculateMoveableArea(board, 1);
  }, [gameState, createBoard]);

  // 初始化Canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        context.lineWidth = 3;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = '#fff70e';
        contextRef.current = context;
      }
    }
  }, []);

  // 动态调整Canvas大小
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const container = canvas.parentElement;
        if (container) {
          const rect = container.getBoundingClientRect();
          canvas.width = rect.width;
          canvas.height = rect.height;
          
          // 重新设置上下文属性
          if (contextRef.current) {
            contextRef.current.lineWidth = 3;
            contextRef.current.lineCap = 'round';
            contextRef.current.lineJoin = 'round';
            contextRef.current.strokeStyle = '#fff70e';
          }
        }
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    window.addEventListener('orientationchange', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('orientationchange', updateCanvasSize);
    };
  }, []);

  // 游戏初始化
  useEffect(() => {
    initGame();
  }, []);

  // 防止iOS页面滚动
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('touchstart', preventScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('touchstart', preventScroll);
    };
  }, []);

  // 获取所有角色卡牌
  const getAllCharacters = (): Character[] => {
    return [Liubei, Guanyu, Zhangfei, ZhaoYun, MaChao];
  };

  // 获取可用的角色卡牌（未使用的）
  const getAvailableCharacters = (): Character[] => {
    return getAllCharacters().filter(character => !usedCards.has(character._name));
  };

  // 当前选中的卡牌
  const [selectedCard, setSelectedCard] = useState<Character | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [expandedCard, setExpandedCard] = useState<Character | null>(null);
  const [usedCards, setUsedCards] = useState<Set<string>>(new Set());
  const [hoveredCard, setHoveredCard] = useState<Character | null>(null);

  // 计算可移动区域
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

    // 查找可移动位置
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (newBoard[i][j].type === currentPlayer) {
          findMoveablePositions(newBoard, i, j, currentPlayer);
        }
      }
    }

    setGameState(prev => ({ ...prev, tableArr: newBoard }));
  }, []);

  // 查找可移动位置 - 按照原始Vue.js逻辑重写
  const findMoveablePositions = (board: ChessPiece[][], row: number, col: number, playerType: number) => {
    const enemyType = playerType === 1 ? 2 : 1;

    // 向上找
    for (let i = row - 1; i >= 0; i--) {
      if (
        board[i][col].type === playerType ||
        board[row - 1][col].type === 0 ||
        board[row - 1][col].type === 3
      ) {
        break;
      } else if (board[i][col].type === enemyType) {
        continue;
      } else {
        // 找到可移动位置
        board[i][col] = { type: 3, reversal: false, character: {} };
        break;
      }
    }

    // 向下找
    for (let i = row + 1; i < BOARD_SIZE; i++) {
      if (
        board[i][col].type === playerType ||
        board[row + 1][col].type === 0 ||
        board[row + 1][col].type === 3
      ) {
        break;
      } else if (board[i][col].type === enemyType) {
        continue;
      } else {
        board[i][col] = { type: 3, reversal: false, character: {} };
        break;
      }
    }

    // 向左找
    for (let j = col - 1; j >= 0; j--) {
      if (
        board[row][j].type === playerType ||
        board[row][col - 1].type === 0 ||
        board[row][col - 1].type === 3
      ) {
        break;
      } else if (board[row][j].type === enemyType) {
        continue;
      } else {
        board[row][j] = { type: 3, reversal: false, character: {} };
        break;
      }
    }

    // 向右找
    for (let j = col + 1; j < BOARD_SIZE; j++) {
      if (
        board[row][j].type === playerType ||
        board[row][col + 1].type === 0 ||
        board[row][col + 1].type === 3
      ) {
        break;
      } else if (board[row][j].type === enemyType) {
        continue;
      } else {
        board[row][j] = { type: 3, reversal: false, character: {} };
        break;
      }
    }

    // 左上角
    for (let i = row - 1, j = col - 1; i >= 0 && j >= 0; i--, j--) {
      if (
        board[i][j].type === playerType ||
        board[row - 1][col - 1].type === 0 ||
        board[row - 1][col - 1].type === 3
      ) {
        break;
      } else if (board[i][j].type === enemyType) {
        continue;
      } else {
        board[i][j] = { type: 3, reversal: false, character: {} };
        break;
      }
    }

    // 右下角
    for (let i = row + 1, j = col + 1; i < BOARD_SIZE && j < BOARD_SIZE; i++, j++) {
      if (
        board[i][j].type === playerType ||
        board[row + 1][col + 1].type === 0 ||
        board[row + 1][col + 1].type === 3
      ) {
        break;
      } else if (board[i][j].type === enemyType) {
        continue;
      } else {
        board[i][j] = { type: 3, reversal: false, character: {} };
        break;
      }
    }

    // 左下角
    for (let i = row + 1, j = col - 1; i < BOARD_SIZE && j >= 0; i++, j--) {
      if (
        board[i][j].type === playerType ||
        board[row + 1][col - 1].type === 0 ||
        board[row + 1][col - 1].type === 3
      ) {
        break;
      } else if (board[i][j].type === enemyType) {
        continue;
      } else {
        board[i][j] = { type: 3, reversal: false, character: {} };
        break;
      }
    }

    // 右上角
    for (let i = row - 1, j = col + 1; i >= 0 && j < BOARD_SIZE; i--, j++) {
      if (
        board[i][j].type === playerType ||
        board[row - 1][col + 1].type === 0 ||
        board[row - 1][col + 1].type === 3
      ) {
        break;
      } else if (board[i][j].type === enemyType) {
        continue;
      } else {
        board[i][j] = { type: 3, reversal: false, character: {} };
        break;
      }
    }
  };

  // 落子
  const moveChess = useCallback((row: number, col: number) => {
    if (gameState.tableArr[row][col].type !== 3 || !selectedCard) return;

    const newBoard = gameState.tableArr.map(row => [...row]);
    const currentPlayer = gameState.lastMove;

    // 放置棋子
    newBoard[row][col] = {
      type: currentPlayer,
      reversal: true,
      character: selectedCard
    };

    // 翻转棋子
    reversiChess(newBoard, row, col, currentPlayer);

    // 计算伤害
    computeAttack(currentPlayer, selectedCard._attack);

    // 清空画布
    clearCanvas();

    // 切换玩家
    const nextPlayer = currentPlayer === 1 ? 2 : 1;
    
    // 保存到撤销栈
    setUndoStack(prev => [...prev, { gameState: { ...gameState }, usedCards: new Set(usedCards) }]);

    setGameState(prev => ({
      ...prev,
      tableArr: newBoard,
      lastMove: nextPlayer
    }));

    // 计算新的可移动区域
    calculateMoveableArea(newBoard, nextPlayer);

    // 将使用的卡牌添加到已使用列表
    setUsedCards(prev => {
      const newUsedCards = new Set([...prev, selectedCard._name]);
      
      // 检查是否所有卡牌都已使用
      if (newUsedCards.size >= getAllCharacters().length) {
        setTimeout(() => {
          setGameOverModalVisible(true);
        }, 1000);
      }
      
      return newUsedCards;
    });

    // 清除选中的卡牌
    setSelectedCard(null);
    setExpandedCard(null);
    setHoveredCard(null); // 清除hover效果
  }, [gameState, calculateMoveableArea, selectedCard]);

  // 翻转棋子 - 按照原始Vue.js逻辑重写
  const reversiChess = (board: ChessPiece[][], row: number, col: number, playerType: number) => {
    const enemyType = playerType === 1 ? 2 : 1;

    // 向上找
    for (let i = row - 1; i >= 0; i--) {
      if (board[i][col].type === playerType && i !== row - 1) {
        // 寻找有效值和当前值的所有纵向的子，进行值的翻转
        if (board[i][col].character && typeof board[i][col].character === 'object' && '_combo' in board[i][col].character) {
          const char = board[i][col].character as Character;
          if (char._combo) {
            computeAttack(playerType, char._combo);
          }
        }
        for (let _i = row - 1; _i > i; _i--) {
          board[_i][col] = {
            type: playerType,
            reversal: true,
            character: {}
          };
        }
        break;
      } else if (board[i][col].type === enemyType) {
        continue;
      } else {
        break;
      }
    }

    // 向下找
    for (let i = row + 1; i < BOARD_SIZE; i++) {
      if (board[i][col].type === playerType && i !== row + 1) {
        if (board[i][col].character && typeof board[i][col].character === 'object' && '_combo' in board[i][col].character) {
          const char = board[i][col].character as Character;
          if (char._combo) {
            computeAttack(playerType, char._combo);
          }
        }
        for (let _i = row + 1; _i < i; _i++) {
          board[_i][col] = {
            type: playerType,
            reversal: true,
            character: {}
          };
        }
        break;
      } else if (board[i][col].type === enemyType) {
        continue;
      } else {
        break;
      }
    }

    // 向左找
    for (let j = col - 1; j >= 0; j--) {
      if (board[row][j].type === playerType && j !== col - 1) {
        if (board[row][j].character && typeof board[row][j].character === 'object' && '_combo' in board[row][j].character) {
          const char = board[row][j].character as Character;
          if (char._combo) {
            computeAttack(playerType, char._combo);
          }
        }
        for (let _j = col - 1; _j > j; _j--) {
          board[row][_j] = {
            type: playerType,
            reversal: true,
            character: {}
          };
        }
        break;
      } else if (board[row][j].type === enemyType) {
        continue;
      } else {
        break;
      }
    }

    // 向右找
    for (let j = col + 1; j < BOARD_SIZE; j++) {
      if (board[row][j].type === playerType && j !== col + 1) {
        if (board[row][j].character && typeof board[row][j].character === 'object' && '_combo' in board[row][j].character) {
          const char = board[row][j].character as Character;
          if (char._combo) {
            computeAttack(playerType, char._combo);
          }
        }
        for (let _j = col + 1; _j < j; _j++) {
          board[row][_j] = {
            type: playerType,
            reversal: true,
            character: {}
          };
        }
        break;
      } else if (board[row][j].type === enemyType) {
        continue;
      } else {
        break;
      }
    }

    // 左上角
    for (let i = row - 1, j = col - 1; i >= 0 && j >= 0; i--, j--) {
      if (
        board[i][j].type === playerType &&
        i !== row - 1 &&
        j !== col - 1
      ) {
        if (board[i][j].character && typeof board[i][j].character === 'object' && '_combo' in board[i][j].character) {
          const char = board[i][j].character as Character;
          if (char._combo) {
            computeAttack(playerType, char._combo);
          }
        }
        for (
          let _i = row - 1, _j = col - 1;
          _i > i && _j > j;
          _i--, _j--
        ) {
          board[_i][_j] = {
            type: playerType,
            reversal: true,
            character: {}
          };
        }
        break;
      } else if (board[i][j].type === enemyType) {
        continue;
      } else {
        break;
      }
    }

    // 右下角
    for (
      let i = row + 1, j = col + 1;
      i < BOARD_SIZE && j < BOARD_SIZE;
      i++, j++
    ) {
      if (
        board[i][j].type === playerType &&
        i !== row + 1 &&
        j !== col + 1
      ) {
        if (board[i][j].character && typeof board[i][j].character === 'object' && '_combo' in board[i][j].character) {
          const char = board[i][j].character as Character;
          if (char._combo) {
            computeAttack(playerType, char._combo);
          }
        }
        for (
          let _i = row + 1, _j = col + 1;
          _i < i && _j < j;
          _i++, _j++
        ) {
          board[_i][_j] = {
            type: playerType,
            reversal: true,
            character: {}
          };
        }
        break;
      } else if (board[i][j].type === enemyType) {
        continue;
      } else {
        break;
      }
    }

    // 左下角
    for (
      let i = row + 1, j = col - 1;
      i < BOARD_SIZE && j >= 0;
      i++, j--
    ) {
      if (
        board[i][j].type === playerType &&
        i !== row + 1 &&
        j !== col - 1
      ) {
        if (board[i][j].character && typeof board[i][j].character === 'object' && '_combo' in board[i][j].character) {
          const char = board[i][j].character as Character;
          if (char._combo) {
            computeAttack(playerType, char._combo);
          }
        }
        for (
          let _i = row + 1, _j = col - 1;
          _i < i && _j > j;
          _i++, _j--
        ) {
          board[_i][_j] = {
            type: playerType,
            reversal: true,
            character: {}
          };
        }
        break;
      } else if (board[i][j].type === enemyType) {
        continue;
      } else {
        break;
      }
    }

    // 右上角
    for (
      let i = row - 1, j = col + 1;
      i >= 0 && j < BOARD_SIZE;
      i--, j++
    ) {
      if (
        board[i][j].type === playerType &&
        i !== row - 1 &&
        j !== col + 1
      ) {
        if (board[i][j].character && typeof board[i][j].character === 'object' && '_combo' in board[i][j].character) {
          const char = board[i][j].character as Character;
          if (char._combo) {
            computeAttack(playerType, char._combo);
          }
        }
        for (
          let _i = row - 1, _j = col + 1;
          _i > i && _j < j;
          _i--, _j++
        ) {
          board[_i][_j] = {
            type: playerType,
            reversal: true,
            character: {}
          };
        }
        break;
      } else if (board[i][j].type === enemyType) {
        continue;
      } else {
        break;
      }
    }
  };

  // 计算攻击伤害
  const computeAttack = (playerType: number, attack: number) => {
    setGameState(prev => {
      const newState = { ...prev };
      if (playerType === 1) {
        newState.player2.takeDamage(attack);
        if (newState.player2.isDead()) {
          newState.gameOver = true;
          setGameOverModalVisible(true);
        }
      } else {
        newState.player1.takeDamage(attack);
        if (newState.player1.isDead()) {
          newState.gameOver = true;
          setGameOverModalVisible(true);
        }
      }
      return newState;
    });
  };

  // 清空画布
  const clearCanvas = () => {
    if (contextRef.current && canvasRef.current) {
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // 撤销
  const undo = () => {
    if (undoStack.length > 0) {
      const lastStateData = undoStack[undoStack.length - 1];
      setGameState(lastStateData.gameState);
      setUsedCards(lastStateData.usedCards);
      setUndoStack(prev => prev.slice(0, -1));
      setSelectedCard(null);
      setExpandedCard(null);
      clearCanvas();
      calculateMoveableArea(lastStateData.gameState.tableArr, lastStateData.gameState.lastMove);
    }
  };

  // 重新开始
  const restartGame = () => {
    setGameOverModalVisible(false);
    setUndoStack([]);
    setUsedCards(new Set()); // 重置已使用的卡牌
    setSelectedCard(null);
    setExpandedCard(null);
    setHoveredCard(null);
    setIsDragging(false);
    setDragPosition({ x: 0, y: 0 });
    
    // 重置游戏状态
    setGameState(prev => ({
      ...prev,
      gameOver: false,
      lastMove: 1
    }));
    
    // 延迟调用initGame，确保状态更新完成
    setTimeout(() => {
      initGame();
    }, 100);
  };

  // 切换3D模式
  const toggle3D = (checked: boolean) => {
    setGameState(prev => ({ ...prev, threeDimensionsOn: checked }));
  };

  // 显示角色名称
  const showName = (character: Character | {}) => {
    if (character && typeof character === 'object' && '_name' in character) {
      return String(character._name).substr(0, 1).toUpperCase();
    }
    return "";
  };

  // 拖拽相关函数
  const handleCardSelect = (character: Character) => {
    setSelectedCard(character);
  };

  const handleCardClick = (character: Character, e: React.MouseEvent) => {
    // 检查卡牌是否已被使用
    if (usedCards.has(character._name)) {
      return; // 已使用的卡牌不能点击
    }
    
    if (expandedCard?._name === character._name) {
      // 如果点击的是已展开的卡牌，收起它
      setExpandedCard(null);
    } else {
      // 展开新的卡牌
      setExpandedCard(character);
      setSelectedCard(character);
    }
  };

  const handleCardDragStart = (e: React.DragEvent, character: Character) => {
    // 检查卡牌是否已被使用
    if (usedCards.has(character._name)) {
      e.preventDefault();
      return; // 已使用的卡牌不能拖拽
    }
    
    setSelectedCard(character);
    setExpandedCard(null); // 拖拽时收起展开状态
    setIsDragging(true);
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleCardDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
  };

  const handleBoardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleBoardDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    if (selectedCard && gameState.tableArr[row][col].type === 3) {
      moveChess(row, col);
    }
  };

    // 添加卡牌hover事件处理
  const handleCardMouseEnter = (character: Character) => {
    if (!usedCards.has(character._name)) {
      setHoveredCard(character);
    }
  };

  const handleCardMouseLeave = () => {
    setHoveredCard(null);
  };

  // 添加触摸事件支持
  const handleTouchStart = (e: React.TouchEvent, character: Character) => {
    // 检查卡牌是否已被使用
    if (usedCards.has(character._name)) {
      return; // 已使用的卡牌不能触摸拖拽
    }
    
    setSelectedCard(character);
    setIsDragging(true);
    const touch = e.touches[0];
    setDragPosition({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setDragPosition({ x: touch.clientX, y: touch.clientY });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  // 监听全局鼠标移动事件
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [isDragging]);

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging || !selectedCard) return;
    
    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const tdElement = elementBelow?.closest('td');
    
    if (tdElement) {
      const rowIndex = parseInt(tdElement.getAttribute('data-row') || '');
      const colIndex = parseInt(tdElement.getAttribute('data-col') || '');
      
      if (!isNaN(rowIndex) && !isNaN(colIndex) && gameState.tableArr[rowIndex][colIndex].type === 3) {
        moveChess(rowIndex, colIndex);
      }
    }
    
    setIsDragging(false);
  };

  // 处理点击空白区域取消选择卡牌
  const handleContainerClick = (e: React.MouseEvent) => {
    // 如果点击的是容器本身（空白区域），则取消选择卡牌
    if (e.target === e.currentTarget) {
      setSelectedCard(null);
    }
  };

  // 处理触摸空白区域取消选择卡牌
  const handleContainerTouchStart = (e: React.TouchEvent) => {
    // 如果触摸的是容器本身（空白区域），则取消选择卡牌
    if (e.target === e.currentTarget) {
      setSelectedCard(null);
    }
  };

  return (
    <div 
      className={`reversi-container ${gameState.threeDimensionsOn ? 'three-dimensions-on' : ''}`}
      onClick={handleContainerClick}
      onTouchStart={handleContainerTouchStart}
    >
      {/* 玩家1血条 */}
      <div className="player">
        <div 
          className="player-hp" 
          style={{ width: `${(gameState.player1._hp / INITIAL_HP) * 100}%` }}
        />
        <div className="player-hp--ratio">
          {gameState.player1._hp}/{INITIAL_HP}
        </div>
      </div>

      {/* 棋盘 */}
      <div className="desk-table">
        <canvas 
          ref={canvasRef}
          id="canvas" 
        />
        <table 
          onDragOver={handleBoardDragOver}
        >
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
                        {showName(col.character)}
                      </div>
                      <div 
                        className={`chess ${
                          col.type === 1 ? 'chess-orange' : 
                          col.type === 2 ? 'chess-blue' : 
                          col.type === 3 ? 'chess-movable' : ''
                        } ${col.reversal ? 'chess-rotate' : ''}`}
                        data-attack={col.character && typeof col.character === 'object' && '_attack' in col.character ? (col.character as Character)._attack : ''}
                        data-combo={col.character && typeof col.character === 'object' && '_combo' in col.character ? (col.character as Character)._combo : ''}
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
          {gameState.player2._hp}/{INITIAL_HP}
        </div>
      </div>

      {/* 控制按钮 */}
      {/* <div className="controls">
        {undoStack.length > 0 && (
          <button onClick={undo} className="undo-btn">
            悔棋
          </button>
        )}
        
        <div className="toggle-3d">
          3D模式 
          <input 
            type="checkbox" 
            onChange={(e) => toggle3D(e.target.checked)}
            checked={gameState.threeDimensionsOn}
          />
        </div>
      </div> */}

      {/* 卡牌区域 */}
      <div className="card-section">
        {/* <h3>手牌 ({getAvailableCharacters().length}/{getAllCharacters().length})</h3> */}
        <div className="card-container">
          {getAvailableCharacters().map((character, index) => (
            <div
              key={index}
              className={`character-card ${selectedCard?._name === character._name ? 'selected' : ''} ${expandedCard?._name === character._name ? 'expanded' : ''} ${hoveredCard?._name === character._name ? 'hovered' : ''}`}
              draggable
              onDragStart={(e) => handleCardDragStart(e, character)}
              onDragEnd={handleCardDragEnd}
              onClick={(e) => handleCardClick(character, e)}
              onMouseEnter={() => handleCardMouseEnter(character)}
              onMouseLeave={handleCardMouseLeave}
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
        {selectedCard && (
          <div className="selected-card-info">
            <p>已选择: <strong>{selectedCard._name}</strong></p>
            <p>攻击力: {selectedCard._attack} | 连击伤害: {selectedCard._combo}</p>
          </div>
        )}
      </div>

      {/* 拖拽预览 */}
      {isDragging && selectedCard && (
        <div
          className={`drag-preview player${gameState.lastMove}`}
          style={{
            left: dragPosition.x,
            top: dragPosition.y,
          }}
        >
          <div className="drag-preview-character">
            {selectedCard._name.substr(0, 1)}
          </div>
        </div>
      )}

      {/* 游戏结束弹窗 */}
      {gameOverModalVisible && (
        <div 
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div 
            className="modal"
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center',
              maxWidth: '300px',
              width: '80%'
            }}
          >
            <h3>游戏结束</h3>
            <p>重新开始吧！</p>
            <button 
              type="button"
              style={{ 
                cursor: 'pointer',
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold',
                touchAction: 'manipulation'
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                console.log('触摸结束，调用重新开始');
                restartGame();
              }}
              onClick={() => {
                console.log('按钮被点击了！');
                restartGame();
              }}
            >
              重新开始
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReversiGame;
