import React, { useState } from 'react';
import ReversiGame from './ReversiGame';
import RoomManager from './RoomManager';
import NetworkReversiGame from './NetworkReversiGame';
import type { GameRoom } from '../types/network';

type GameMode = 'menu' | 'local' | 'network' | 'room' | 'game';

const MainMenu: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);

  const handleStartLocalGame = () => {
    setGameMode('local');
  };

  const handleStartNetworkGame = () => {
    setGameMode('network');
  };

  const handleBackToMenu = () => {
    setGameMode('menu');
    setCurrentRoom(null);
  };

  const handleGameStart = (room: GameRoom) => {
    setCurrentRoom(room);
    setGameMode('game');
  };

  const handleGameEnd = () => {
    setCurrentRoom(null);
    setGameMode('menu');
  };

  switch (gameMode) {
    case 'local':
      return (
        <div>
          <button onClick={handleBackToMenu} className="back-to-menu-btn">
            返回主菜单
          </button>
          <ReversiGame />
        </div>
      );

    case 'network':
      return (
        <RoomManager 
          onGameStart={handleGameStart}
          onBack={handleBackToMenu}
        />
      );

    case 'game':
      return currentRoom ? (
        <NetworkReversiGame 
          room={currentRoom}
          onGameEnd={handleGameEnd}
        />
      ) : null;

    default:
      return (
        <div className="main-menu">
          <h1>翻转棋游戏</h1>
          <div className="menu-buttons">
            <button onClick={handleStartLocalGame} className="menu-btn local-game-btn">
              本地对战
            </button>
            <button onClick={handleStartNetworkGame} className="menu-btn network-game-btn">
              网络对战
            </button>
          </div>
        </div>
      );
  }
};

export default MainMenu;
