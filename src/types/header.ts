// Header 组件的类型定义

export interface HeaderProps {
  // 用户信息
  userName: string;
  userStatus: string;
  profileImageUrl?: string;
  
  // 功能按钮显示控制
  showBackButton?: boolean;
  showPhoneButton?: boolean;
  showVideoButton?: boolean;
  
  // 事件处理函数
  onBackClick?: () => void;
  onPhoneClick?: () => void;
  onVideoClick?: () => void;
  
  // 样式变体
  variant?: HeaderVariant;
  
  // 主题
  theme?: HeaderTheme;
}

// 组件变体类型
export type HeaderVariant = 'default' | 'compact' | 'elevated';

// 主题类型
export type HeaderTheme = 'light' | 'dark';

// 用户状态类型
export type UserStatus = 'online' | 'offline' | 'away' | 'busy' | 'custom';

// 用户状态配置接口
export interface StatusConfig {
  text: string;
  color: string;
}

// 状态配置映射
export interface StatusConfigMap {
  [key: string]: StatusConfig;
}

// 事件处理函数类型
export interface HeaderEventHandlers {
  onBackClick?: () => void;
  onPhoneClick?: () => void;
  onVideoClick?: () => void;
}

// 样式配置接口
export interface HeaderStyleConfig {
  container: string;
  theme: string;
  icon: string;
  text: string;
  status: string;
}
