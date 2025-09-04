import React, { useState } from 'react';
import ReversiGame from './ReversiGame';
import RoomManager from './RoomManager';
import NetworkReversiGame from './NetworkReversiGame';
import type { GameRoom } from '../types/network';
import NetworkService from '../services/NetworkService';

type GameMode = 'menu' | 'local' | 'network' | 'room' | 'game';

const MainMenu: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [selectedFaction, setSelectedFaction] = useState<'魏' | '蜀' | '吴' | null>(null);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);

  const handleStartLocalGame = () => {
    if (!selectedFaction) return;
    setGameMode('local');
  };

  const handleStartNetworkGame = () => {
    if (!selectedFaction) return;
    NetworkService.setPreferredFaction(selectedFaction);
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
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
            <button className={`menu-btn`} onClick={() => setSelectedFaction('魏')} style={{ opacity: selectedFaction === '魏' ? 1 : 0.8 }}>魏</button>
            <button className={`menu-btn`} onClick={() => setSelectedFaction('蜀')} style={{ opacity: selectedFaction === '蜀' ? 1 : 0.8 }}>蜀</button>
            <button className={`menu-btn`} onClick={() => setSelectedFaction('吴')} style={{ opacity: selectedFaction === '吴' ? 1 : 0.8 }}>吴</button>
          </div>
          <div className="menu-buttons">
            <button onClick={handleStartLocalGame} className="menu-btn local-game-btn" disabled={!selectedFaction}>
              本地对战
            </button>
            <button onClick={handleStartNetworkGame} className="menu-btn network-game-btn" disabled={!selectedFaction}>
              网络对战
            </button>
          </div>
        </div>
      );
  }
};

export default MainMenu;
