import React, { useState, useEffect, useRef } from 'react';
import NetworkService from '../services/NetworkService';
import type { NetworkPlayer, GameRoom } from '../types/network';
import '../components/NetworkGame.css';

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
  const [isMatching, setIsMatching] = useState(false);
  const [selectedFaction, setSelectedFaction] = useState<'魏' | '蜀' | '吴' | null>(null);

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

  // 监听房间被关闭
  useEffect(() => {
    const handleClosed = () => {
      setCurrentRoom(null);
      setPlayers([]);
      setError('房间已关闭');
    };
    NetworkService.on('room-closed', handleClosed as any);
    return () => {
      NetworkService.off('room-closed', handleClosed as any);
    };
  }, []);

  // 进入即自动匹配
  useEffect(() => {
    if (!isConnected) return;
    const player: NetworkPlayer = {
      id: Math.random().toString(36).substr(2, 9),
      name: '玩家' + Math.random().toString(36).substr(2, 3),
      avatar: '',
      isReady: false,
      faction: (NetworkService as any).getPreferredFaction?.() || undefined
    };
    try {
      setIsMatching(true);
      NetworkService.autoMatch(player);
    } catch (e) {
      setError('匹配失败');
      setIsMatching(false);
    }
  }, [isConnected]);

  const handleLeaveRoom = () => {
    NetworkService.leaveRoom();
    setCurrentRoom(null);
    setPlayers([]);
  };

  const handleStartGame = () => {};

  if (currentRoom) {
    return (
      <div className="room-manager">
        {/* 势力选择 */}
        {/* {!selectedFaction && (
          <div className="room-info">
            <h2>选择势力</h2>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
              <button className="join-room-btn" onClick={() => { setSelectedFaction('魏'); NetworkService.selectFaction('魏'); }}>魏</button>
              <button className="join-room-btn" onClick={() => { setSelectedFaction('蜀'); NetworkService.selectFaction('蜀'); }}>蜀</button>
              <button className="join-room-btn" onClick={() => { setSelectedFaction('吴'); NetworkService.selectFaction('吴'); }}>吴</button>
            </div>
          </div>
        )} */}
        <div className="room-info">
          <h2>正在匹配...</h2>
          <p>玩家: {players.length}/2</p>
          {selectedFaction && <p>已选择势力: {selectedFaction}</p>}
        </div>

        <button onClick={handleLeaveRoom} className="leave-room-btn">
          离开房间
        </button>

        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  return (
    <div className="room-manager">
      <h2>正在匹配...</h2>
      <div className="connection-status">
        连接状态: <span className={isConnected ? 'connected' : 'disconnected'}>
          {isConnected ? '已连接' : '未连接'}
        </span>
      </div>
      <button onClick={onBack} className="back-btn">返回主菜单</button>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default RoomManager;
