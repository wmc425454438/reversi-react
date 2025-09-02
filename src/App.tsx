import React from 'react';
import ReversiGame from './components/ReversiGame';
import './App.css';

function App() {
  return (
    <div className="App">
      {/* <div className="game-header">
        <h1>翻转棋游戏</h1>
        <p>经典翻转棋游戏，支持角色系统和血量机制</p>
      </div> */}
      <ReversiGame />
    </div>
  );
}

export default App;
