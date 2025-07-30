// types.ts - Cập nhật định nghĩa theme và player options

export interface ThemeColors {
  name: string;
  emoji: string;
  light: string;  // Class CSS cho ô sáng
  dark: string;   // Class CSS cho ô tối
  background: string; // Background cho container bàn cờ
}

export const BOARD_THEMES: ThemeColors[] = [
  {
    name: 'Cổ điển',
    emoji: '⚫',
    light: 'bg-green-400',
    dark: 'bg-green-800',
    background: 'bg-gradient-to-br from-green-700 via-green-800 to-green-900',
  },
  {
    name: 'Đại dương',
    emoji: '🌊',
    light: 'bg-blue-400',
    dark: 'bg-blue-800',
    background: 'bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900',
  },
  {
    name: 'Hoàng hôn',
    emoji: '🌅',
    light: 'bg-orange-400',
    dark: 'bg-orange-800',
    background: 'bg-gradient-to-br from-orange-700 via-red-800 to-orange-900',
  },
  {
    name: 'Rừng xanh',
    emoji: '🌲',
    light: 'bg-emerald-400',
    dark: 'bg-emerald-800',
    background: 'bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900',
  },
  {
    name: 'Hoàng gia',
    emoji: '👑',
    light: 'bg-purple-400',
    dark: 'bg-purple-800',
    background: 'bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900',
  },
  {
    name: 'Hồng ngọt',
    emoji: '🌸',
    light: 'bg-pink-400',
    dark: 'bg-pink-800',
    background: 'bg-gradient-to-br from-pink-700 via-pink-800 to-pink-900',
  },
  {
    name: 'Bạc hà',
    emoji: '🍃',
    light: 'bg-teal-400',
    dark: 'bg-teal-800',
    background: 'bg-gradient-to-br from-teal-700 via-teal-800 to-teal-900',
  },
  {
    name: 'Oải hương',
    emoji: '💜',
    light: 'bg-indigo-400',
    dark: 'bg-indigo-800',
    background: 'bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-900',
  },
  {
    name: 'San hô',
    emoji: '🪸',
    light: 'bg-rose-400',
    dark: 'bg-rose-800',
    background: 'bg-gradient-to-br from-rose-700 via-rose-800 to-rose-900',
  },
  {
    name: 'Bầu trời',
    emoji: '☁️',
    light: 'bg-sky-400',
    dark: 'bg-sky-800',
    background: 'bg-gradient-to-br from-sky-700 via-sky-800 to-sky-900',
  },
  // Thêm các theme màu tối
  {
    name: 'Đêm tối',
    emoji: '🌙',
    light: 'bg-gray-600',
    dark: 'bg-gray-900',
    background: 'bg-gradient-to-br from-gray-800 via-gray-900 to-black',
  },
  {
    name: 'Ma quái',
    emoji: '👻',
    light: 'bg-slate-700',
    dark: 'bg-black',
    background: 'bg-gradient-to-br from-slate-800 via-slate-900 to-black',
  },
  {
    name: 'Lava',
    emoji: '🌋',
    light: 'bg-red-900',
    dark: 'bg-black',
    background: 'bg-gradient-to-br from-red-900 via-black to-red-950',
  },
  {
    name: 'Rừng đêm',
    emoji: '🦇',
    light: 'bg-green-900',
    dark: 'bg-gray-900',
    background: 'bg-gradient-to-br from-green-900 via-gray-900 to-black',
  },
  {  
    name: 'Biển sâu',
    emoji: '🦈',
    light: 'bg-blue-900',
    dark: 'bg-slate-900',
    background: 'bg-gradient-to-br from-blue-900 via-slate-900 to-black',
  },
  {
    name: 'Không gian',
    emoji: '🚀',
    light: 'bg-indigo-900',
    dark: 'bg-black',
    background: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-black',
  },
  {
    name: 'Cầu vồng',
    emoji: '🌈',
    light: 'bg-purple-800',
    dark: 'bg-gray-900',
    background: 'bg-gradient-to-br from-purple-800 via-pink-700 to-blue-800',
  },
  {
    name: 'Cầu vồng tối',
    emoji: '🌈',
    light: 'bg-purple-800',
    dark: 'bg-gray-900',
    background: 'bg-gradient-to-br from-purple-900 via-gray-900 to-black',
  }
];

// Các types khác...
export interface GameState {
  board: (number | null)[][];
  players: Player[];
  currentPlayer: number;
  gameStatus: 'waiting' | 'playing' | 'finished';
  scores: { [key: number]: number };
  validMoves: [number, number][];
  timeLeft: number;
}

export interface Player {
  id: string;
  name: string;
  emoji: string;
  color: 'black' | 'white';
  isReady: boolean;
  // Thêm thuộc tính cho quân cờ tùy chỉnh
  pieceEmoji?: {
    black: string;
    white: string;
  };
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export type AIDifficulty = 'easy' | 'medium' | 'hard';

// Danh sách emoji có sẵn cho avatar
export const AVAILABLE_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚',
  '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
  '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
  '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
  '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳',
  '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯',
  '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
  '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡',
  '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺',
  '👻', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼',
  '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌',
];

// Danh sách các cặp emoji cho quân cờ
export const PIECE_EMOJI_OPTIONS = [
  { name: 'Cổ điển', black: '⚫', white: '⚪' },
  { name: 'Động vật', black: '🐺', white: '🐑' },
  { name: 'Trái cây', black: '🍇', white: '🥥' },
  { name: 'Hoa', black: '🌹', white: '🌼' },
  { name: 'Thể thao', black: '⚽', white: '🏐' },
  { name: 'Âm nhạc', black: '🎵', white: '🎶' },
  { name: 'Thực phẩm', black: '🍫', white: '🥛' },
  { name: 'Giao thông', black: '🚗', white: '🚕' },
  { name: 'Vũ trụ', black: '🌑', white: '🌕' },
  { name: 'Biểu tượng', black: '❤️', white: '💙' },
  { name: 'Hình học', black: '⬛', white: '⬜' },
  { name: 'Ma thuật', black: '🔮', white: '⭐' },
];
