import React, { useState, useEffect, useRef } from 'react';
import NetworkService from '../services/NetworkService';
import type { NetworkPlayer, GameRoom } from '../types/network';

interface RoomManagerProps {
  onGameStart: (room: GameRoom) => void;
  onBack: () => void;
}

const RoomManager: React.FC<RoomManagerProps> = ({ onGameStart: onGameStartProp, onBack }) => {  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const roomRef = useRef<GameRoom | null>(null);
  const [players, setPlayers] = useState<NetworkPlayer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 监听连接状态（仅挂载一次）
    const checkConnection = () => {
      setIsConnected(NetworkService.getConnectionStatus());
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);

    // 监听房间事件
    const onRoomJoined = (room: GameRoom) => {
      roomRef.current = room;
      NetworkService.setCurrentRoom(room);
      setCurrentRoom(room);
      setPlayers(room.players);
      setError('');
    };

    const onPlayerJoined = (player: NetworkPlayer) => {
      setPlayers(prev => [...prev, player]);
    };

    const onPlayerLeft = (playerId: string) => {
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    };

    const onEnterGame = (payload: any) => {
      // 进入游戏界面
      if (roomRef.current) {
        onGameStartProp(roomRef.current);
      }
    };

    const onError = (message: string) => {
      setError(message);
    };

    // 注意：避免在依赖变化时重复注册
    NetworkService.on('room-joined', onRoomJoined as any);
    NetworkService.on('player-joined', onPlayerJoined as any);
    NetworkService.on('player-left', onPlayerLeft as any);
    NetworkService.on('enter-game', onEnterGame as any);
    NetworkService.on('error', onError as any);

    return () => {
      clearInterval(interval);
      NetworkService.off('room-joined', onRoomJoined as any);
      NetworkService.off('player-joined', onPlayerJoined as any);
      NetworkService.off('player-left', onPlayerLeft as any);
      NetworkService.off('enter-game', onEnterGame as any);
      NetworkService.off('error', onError as any);
    };
  }, []); // 仅挂载/卸载时执行

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomId.trim()) {
      setError('请输入玩家名称和房间ID');
      return;
    }

    if (!isConnected) {
      setError('未连接到服务器');
      return;
    }

    const player: NetworkPlayer = {
      id: Math.random().toString(36).substr(2, 9),
      name: playerName.trim(),
      avatar: '',
      isReady: false
    };

    try {
      NetworkService.joinRoom(roomId, player);
    } catch (error) {
      setError('加入房间失败');
    }
  };

  const handleLeaveRoom = () => {
    NetworkService.leaveRoom();
    setCurrentRoom(null);
    setPlayers([]);
  };

  const handleStartGame = () => {
    if (players.length === 2) {
      console.log('开始游戏');
      try {
        NetworkService.startGame(); // 或 NetworkService.startGame(currentRoom?.id || '')
      } catch (error) {
        setError('加入房间失败');
      }
    }
  };

  if (currentRoom) {
    return (
      <div className="room-manager">
        <div className="room-info">
          <h2>房间: {currentRoom.name}</h2>
          <p>房间ID: {currentRoom.id}</p>
        </div>

        <div className="players-list">
          <h3>玩家列表 ({players.length}/2)</h3>
          {players.map(player => (
            <div key={player.id} className="player-item">
              <span>{player.name}</span>
              <span className={player.isReady ? 'ready' : 'not-ready'}>
                {player.isReady ? '已准备' : '未准备'}
              </span>
            </div>
          ))}
        </div>

        {players.length === 2 && (
          <button onClick={handleStartGame} className="start-game-btn">
            开始游戏
          </button>
        )}

        <button onClick={handleLeaveRoom} className="leave-room-btn">
          离开房间
        </button>

        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  return (
    <div className="room-manager">
      <h2>加入游戏房间</h2>
      
      <div className="connection-status">
        连接状态: <span className={isConnected ? 'connected' : 'disconnected'}>
          {isConnected ? '已连接' : '未连接'}
        </span>
      </div>

      <div className="input-group">
        <label>玩家名称:</label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="输入您的名称"
          maxLength={20}
        />
      </div>

      <div className="input-group">
        <label>房间ID:</label>
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="输入房间ID"
          maxLength={10}
        />
      </div>

      <button 
        onClick={handleJoinRoom} 
        disabled={!isConnected || !playerName.trim() || !roomId.trim()}
        className="join-room-btn"
      >
        加入房间
      </button>

      <button onClick={onBack} className="back-btn">
        返回主菜单
      </button>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default RoomManager;
