# Reversi React 项目

这是一个基于React和TypeScript的项目，包含多个组件示例。

## 项目特性

- React 19 + TypeScript
- Vite 构建工具
- Tailwind CSS 样式框架
- ESLint 代码检查

## 组件

### 翻转棋游戏 (ReversiGame)

一个完整的翻转棋游戏实现，包含以下特性：

- **6x6棋盘**：经典的翻转棋游戏规则
- **角色系统**：刘备、关羽、张飞等三国角色，每个角色有不同的攻击力和连击伤害
- **血量系统**：玩家血量会随着攻击减少，血量为0时游戏结束
- **翻转机制**：标准的翻转棋规则，支持8个方向的翻转
- **可移动提示**：显示当前玩家可以落子的位置
- **悔棋功能**：支持撤销上一步操作
- **3D模式**：可切换的3D视觉效果
- **Canvas动画**：使用Canvas绘制连线效果
- **响应式设计**：支持移动端和桌面端

### 网络对战 (NetworkReversiGame)

基于 Socket.io 的实时对战：

- 房间系统：创建/加入同一房间后，二人对战
- 实时同步：服务端转发状态，客户端同步棋盘与回合
- 回合提示：界面显示“当前回合: 您/对手”
- 可落子提示：绿色落子区域（8方向规则计算）
- 落子方式：点击绿色格子或将手牌拖拽/触摸拖拽到绿色格子

#### 游戏规则

1. 两名玩家轮流下棋
2. 橙色棋子代表玩家1，蓝色棋子代表玩家2
3. 绿色高亮显示可落子位置
4. 落子后会自动翻转夹在中间的敌方棋子
5. 每次落子都会随机生成一个角色，造成相应伤害
6. 当一方血量为0时游戏结束

#### 使用方法

```tsx
import ReversiGame from './components/ReversiGame';

function App() {
  return (
    <div>
      <ReversiGame />
    </div>
  );
}
```

#### 网络对战使用方法

```tsx
import MainMenu from './components/MainMenu';

function App() {
  return (
    <div>
      <MainMenu />
    </div>
  );
}
```

步骤：

1. 启动后端（见下方“启动后端服务器”）
2. 打开页面 → 选择“网络对战”
3. 两名玩家输入相同房间ID并加入
4. 房间内显示两人后，点击“开始游戏”（先进入对局，再发送开始指令）
5. 显示“当前回合: 您”的一侧选择手牌并在绿色格子落子（可点击或拖拽）

### 其他组件

- `HeaderDemo`：头部组件示例
- `OrderSummary`：订单摘要组件示例

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 启动后端服务器

```bash
node server/index.js
```

默认地址：前端 `http://localhost:5173`，后端 `http://localhost:3001`。

若 Node 报 “require is not defined”，说明在 ESM 模式运行，请使用 `import` 语法（本仓库已使用）或把文件改名为 `.cjs`。

### 构建生产版本

```bash
npm run build
```

### 代码检查

```bash
npm run lint
```

## 技术栈

- **前端框架**：React 19
- **语言**：TypeScript
- **构建工具**：Vite
- **样式**：Tailwind CSS + 自定义CSS
- **代码质量**：ESLint
 - **实时通信**：Socket.io（WebSocket）

## 项目结构

```
src/
├── components/          # React组件
│   ├── ReversiGame.tsx # 翻转棋游戏主组件
│   ├── ReversiGame.css # 游戏样式
│   ├── MainMenu.tsx     # 菜单（本地/网络）
│   ├── RoomManager.tsx  # 房间管理
│   └── NetworkReversiGame.tsx # 网络对战
├── models/              # 数据模型
│   ├── Player.ts       # 玩家类
│   └── characters/     # 角色定义
├── types/               # TypeScript类型定义
│   └── reversi.ts      # 游戏相关类型
├── App.tsx             # 主应用组件
└── main.tsx            # 应用入口
server/
└── index.js            # 后端（Express + Socket.io）
```

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 许可证

MIT

## 调试与排查

- 前端断点：Chrome DevTools → Sources → 断在 `NetworkReversiGame.tsx` 的 `game-start`/`game-state-update`、`moveChess`、`calculateMoveableArea`、`findMoveablePositions`、拖拽/触摸事件处理
- 常见问题：
  - 没有绿色落子区：确认“当前回合: 您”；两端进入同一房间并开始；后端已运行
  - 拖拽无响应：将手牌拖至绿色格子；或直接点击绿色格子
