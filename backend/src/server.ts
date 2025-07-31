import { Request, Response } from 'express';

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-vercel-domain.vercel.app'] 
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-vercel-domain.vercel.app'] 
      : ['http://localhost:3000'],
    methods: ["GET", "POST"]
  }
});

// Game state interfaces
interface Player {
  id: string;
  name: string;
  emoji: string;
  isReady: boolean;
  color?: 'black' | 'white';
  pieceEmoji?: {
    black: string;
    white: string;
  };
  coins?: number; // Thêm field xu
}

interface GameState {
  board: (number | null)[][];
  currentPlayer: 1 | 2;
  players: Player[];
  gameStatus: 'waiting' | 'playing' | 'finished';
  scores: { 1: number; 2: number };
  validMoves: number[][];
  timeLeft: number;
  winnerId?: string;
  lastMove?: { row: number; col: number; playerId: string };
  coinsAwarded?: { playerId: string; amount: number }; // Thêm thông tin xu được thưởng
}

interface Room {
  id: string;
  gameState: GameState;
  messages: ChatMessage[];
  isAIGame?: boolean;
  aiDifficulty?: AIDifficulty;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

enum AIDifficulty {  
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

// Store rooms in memory
const rooms = new Map<string, Room>();
const roomTimers = new Map<string, NodeJS.Timeout>();

// Store player coins in memory (in production, use database)
const playerCoins = new Map<string, number>();

// Helper function to get or initialize player coins
function getPlayerCoins(playerId: string): number {
  if (!playerCoins.has(playerId)) {
    playerCoins.set(playerId, 0); // Bắt đầu với 0 xu
  }
  return playerCoins.get(playerId)!;
}

// Helper function to add coins to player
function addCoinsToPlayer(playerId: string, amount: number): number {
  const currentCoins = getPlayerCoins(playerId);
  const newCoins = currentCoins + amount;
  playerCoins.set(playerId, newCoins);
  return newCoins;
}

// Helper function to award coins to winner
function awardCoinsToWinner(room: Room): void {
  if (room.gameState.gameStatus !== 'finished') return;
  
  const scores = room.gameState.scores;
  let winnerId: string | null = null;
  
  // Determine winner
  if (scores[1] > scores[2]) {
    winnerId = room.gameState.players.find(p => p.color === 'black')?.id || null;
  } else if (scores[2] > scores[1]) {
    winnerId = room.gameState.players.find(p => p.color === 'white')?.id || null;
  }
  // If tie, no one gets coins
  
  if (winnerId && winnerId !== 'AI') { // Don't give coins to AI
    const coinsEarned = 10;
    const newCoins = addCoinsToPlayer(winnerId, coinsEarned);
    
    // Update player coins in room
    const winnerPlayer = room.gameState.players.find(p => p.id === winnerId);
    if (winnerPlayer) {
      winnerPlayer.coins = newCoins;
    }
    
    // Set coins awarded info
    room.gameState.coinsAwarded = { playerId: winnerId, amount: coinsEarned };
    
    console.log(`Player ${winnerId} earned ${coinsEarned} coins. Total: ${newCoins}`);
  }
}

// Othello game logic
class OthelloGame {
  static DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  static createEmptyBoard(): (number | null)[][] {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Initial setup
    board[3][3] = 2; // White
    board[3][4] = 1; // Black
    board[4][3] = 1; // Black
    board[4][4] = 2; // White
    
    return board;
  }

  static getValidMoves(board: (number | null)[][], player: number): number[][] {
    const validMoves: number[][] = [];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board[row][col] === null && this.canPlacePiece(board, row, col, player)) {
          validMoves.push([row, col]);
        }
      }
    }
    
    return validMoves;
  }

  static canPlacePiece(board: (number | null)[][], row: number, col: number, player: number): boolean {
    for (const [dr, dc] of this.DIRECTIONS) {
      if (this.wouldFlipInDirection(board, row, col, dr, dc, player)) {
        return true;
      }
    }
    return false;
  }

  static wouldFlipInDirection(
    board: (number | null)[][], 
    startRow: number, 
    startCol: number, 
    dr: number, 
    dc: number, 
    player: number
  ): boolean {
    const opponent = player === 1 ? 2 : 1;
    let r = startRow + dr;
    let c = startCol + dc;
    let hasOpponentPieces = false;

    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      if (board[r][c] === null) return false;
      if (board[r][c] === opponent) {
        hasOpponentPieces = true;
      } else if (board[r][c] === player) {
        return hasOpponentPieces;
      }
      r += dr;
      c += dc;
    }
    
    return false;
  }

  static makeMove(board: (number | null)[][], row: number, col: number, player: number): (number | null)[][] {
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = player;

    for (const [dr, dc] of this.DIRECTIONS) {
      this.flipPiecesInDirection(newBoard, row, col, dr, dc, player);
    }

    return newBoard;
  }

  static flipPiecesInDirection(
    board: (number | null)[][], 
    startRow: number, 
    startCol: number, 
    dr: number, 
    dc: number, 
    player: number
  ): void {
    if (!this.wouldFlipInDirection(board, startRow, startCol, dr, dc, player)) return;

    const opponent = player === 1 ? 2 : 1;
    let r = startRow + dr;
    let c = startCol + dc;

    while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === opponent) {
      board[r][c] = player;
      r += dr;
      c += dc;
    }
  }

  static calculateScores(board: (number | null)[][]): { 1: number; 2: number } {
    const scores = { 1: 0, 2: 0 };
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board[row][col] === 1) scores[1]++;
        if (board[row][col] === 2) scores[2]++;
      }
    }
    
    return scores;
  }

  static isGameOver(board: (number | null)[][]): boolean {
    const player1Moves = this.getValidMoves(board, 1);
    const player2Moves = this.getValidMoves(board, 2);
    
    return player1Moves.length === 0 && player2Moves.length === 0;
  }

  // AI logic
  static makeAIMove(board: (number | null)[][], difficulty: AIDifficulty): number[] | null {
    const validMoves = this.getValidMoves(board, 2); // AI is player 2
    if (validMoves.length === 0) return null;

    switch (difficulty) {
      case AIDifficulty.EASY:
        return this.makeRandomMove(validMoves);
      case AIDifficulty.MEDIUM:
        return this.makeMediumMove(board, validMoves);
      case AIDifficulty.HARD:
        return this.makeHardMove(board, validMoves);
      default:
        return this.makeRandomMove(validMoves);
    }
  }

  static makeRandomMove(validMoves: number[][]): number[] {
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  static makeMediumMove(board: (number | null)[][], validMoves: number[][]): number[] {
    // Prioritize corners, then edges, then regular moves
    const corners = validMoves.filter(([r, c]) => 
      (r === 0 || r === 7) && (c === 0 || c === 7)
    );
    if (corners.length > 0) {
      return corners[Math.floor(Math.random() * corners.length)];
    }

    const edges = validMoves.filter(([r, c]) => 
      r === 0 || r === 7 || c === 0 || c === 7
    );
    if (edges.length > 0) {
      return edges[Math.floor(Math.random() * edges.length)];
    }

    return this.makeRandomMove(validMoves);
  }

  static makeHardMove(board: (number | null)[][], validMoves: number[][]): number[] {
    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    for (const move of validMoves) {
      const [row, col] = move;
      const newBoard = this.makeMove(board, row, col, 2);
      const score = this.evaluateBoard(newBoard, 2);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  static evaluateBoard(board: (number | null)[][], player: number): number {
    const scores = this.calculateScores(board);
    const opponent = player === 1 ? 2 : 1;
    
    let score = scores[player as 1 | 2] - scores[opponent as 1 | 2];
    
    // Bonus for corners
    const corners = [[0, 0], [0, 7], [7, 0], [7, 7]];
    for (const [r, c] of corners) {
      if (board[r][c] === player) score += 25;
      if (board[r][c] === opponent) score -= 25;
    }
    
    // Bonus for edges
    for (let i = 0; i < 8; i++) {
      if (board[0][i] === player || board[7][i] === player || 
          board[i][0] === player || board[i][7] === player) {
        score += 5;
      }
      if (board[0][i] === opponent || board[7][i] === opponent || 
          board[i][0] === opponent || board[i][7] === opponent) {
        score -= 5;
      }
    }
    
    return score;
  }
}

// Helper functions
function generateRoomId(): string {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function createInitialGameState(): GameState {
  return {
    board: OthelloGame.createEmptyBoard(),
    currentPlayer: 1,
    players: [],
    gameStatus: 'waiting',
    scores: { 1: 2, 2: 2 },
    validMoves: OthelloGame.getValidMoves(OthelloGame.createEmptyBoard(), 1),
    timeLeft: 30
  };
}

function startTimer(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  // Clear existing timer
  if (roomTimers.has(roomId)) {
    clearInterval(roomTimers.get(roomId)!);
  }

  room.gameState.timeLeft = 30;
  
  const timer = setInterval(() => {
    room.gameState.timeLeft--;
    
    io.to(roomId).emit('timerUpdate', room.gameState.timeLeft);
    
    if (room.gameState.timeLeft <= 0) {
      // Time's up - handle turn skip logic
      handleTurnSkip(roomId);
    }
  }, 1000);

  roomTimers.set(roomId, timer);
}

// **FIX: Improved turn skip logic**
function handleTurnSkip(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const currentPlayerNum = room.gameState.currentPlayer;
  const nextPlayerNum = currentPlayerNum === 1 ? 2 : 1;
  
  // Check if next player has valid moves
  const nextPlayerMoves = OthelloGame.getValidMoves(room.gameState.board, nextPlayerNum);
  
  if (nextPlayerMoves.length > 0) {
    // Next player has moves, switch to them
    room.gameState.currentPlayer = nextPlayerNum as 1 | 2;
    room.gameState.validMoves = nextPlayerMoves;
    
    io.to(roomId).emit('gameStateUpdate', room.gameState);
    
    // Handle AI move if it's AI's turn
    const aiPlayer = room.gameState.players.find(p => p.id === 'AI');
    if (aiPlayer && room.gameState.currentPlayer === (aiPlayer.color === 'black' ? 1 : 2)) {
      // AI's turn - make AI move after a short delay
      setTimeout(() => {
        makeAIMove(roomId);
      }, 1000);
    } else {
      // Human player's turn - restart timer
      startTimer(roomId);
    }
  } else {
    // Next player also has no moves - check if game is over
    if (OthelloGame.isGameOver(room.gameState.board)) {
      // Game over
      room.gameState.gameStatus = 'finished';
      clearInterval(roomTimers.get(roomId)!);
      roomTimers.delete(roomId);
      
      const scores = OthelloGame.calculateScores(room.gameState.board);
      if (scores[1] > scores[2]) {
        room.gameState.winnerId = room.gameState.players.find(p => p.color === 'black')?.id;
      } else if (scores[2] > scores[1]) {
        room.gameState.winnerId = room.gameState.players.find(p => p.color === 'white')?.id;
      } else {
        room.gameState.winnerId = 'draw';
      }
      
      // Award coins to winner
      awardCoinsToWinner(room);
      
      io.to(roomId).emit('gameStateUpdate', room.gameState);
    } else {
      // Skip to next player and try again
      room.gameState.currentPlayer = nextPlayerNum as 1 | 2;
      room.gameState.validMoves = OthelloGame.getValidMoves(room.gameState.board, room.gameState.currentPlayer);
      
      io.to(roomId).emit('gameStateUpdate', room.gameState);
      startTimer(roomId);
    }
  }
}

// **FIX: Separate AI move function**
function makeAIMove(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const aiPlayer = room.gameState.players.find(p => p.id === 'AI');
  if (!aiPlayer) return;

  // Get AI difficulty from room
  const difficulty = room.aiDifficulty || AIDifficulty.MEDIUM;
  
  const aiMove = OthelloGame.makeAIMove(room.gameState.board, difficulty);
  
  if (aiMove) {
    const [aiRow, aiCol] = aiMove;
    
    // Make AI move
    room.gameState.board = OthelloGame.makeMove(room.gameState.board, aiRow, aiCol, room.gameState.currentPlayer);
    room.gameState.scores = OthelloGame.calculateScores(room.gameState.board);
    room.gameState.lastMove = { row: aiRow, col: aiCol, playerId: aiPlayer.id };
    
    // Switch to human player
    const humanPlayer = room.gameState.players.find(p => p.id !== 'AI');
    room.gameState.currentPlayer = (humanPlayer?.color === 'black' ? 1 : 2) as 1 | 2;
    room.gameState.validMoves = OthelloGame.getValidMoves(room.gameState.board, room.gameState.currentPlayer);
    
    // Check if human player has moves
    if (room.gameState.validMoves.length === 0) {
      // Human has no moves - check if game is over or skip back to AI
      if (OthelloGame.isGameOver(room.gameState.board)) {
        room.gameState.gameStatus = 'finished';
        clearInterval(roomTimers.get(roomId)!);
        roomTimers.delete(roomId);
        
        const scores = OthelloGame.calculateScores(room.gameState.board);
        if (scores[1] > scores[2]) {
          room.gameState.winnerId = room.gameState.players.find(p => p.color === 'black')?.id;
        } else if (scores[2] > scores[1]) {
          room.gameState.winnerId = room.gameState.players.find(p => p.color === 'white')?.id;
        } else {
          room.gameState.winnerId = 'draw';
        }
        
        // Award coins to winner
        awardCoinsToWinner(room);
      } else {
        // Skip back to AI
        room.gameState.currentPlayer = (aiPlayer.color === 'black' ? 1 : 2) as 1 | 2;
        room.gameState.validMoves = OthelloGame.getValidMoves(room.gameState.board, room.gameState.currentPlayer);
        
        io.to(roomId).emit('gameStateUpdate', room.gameState);
        
        // Make another AI move
        setTimeout(() => {
          makeAIMove(roomId);
        }, 1000);
        return; // Don't start timer for human
      }
    }
    
    io.to(roomId).emit('gameStateUpdate', room.gameState);
    
    // Start timer for human player if game is still playing
    if (room.gameState.gameStatus === 'playing') {
      startTimer(roomId);
    }
  } else {
    // AI has no valid moves - skip to human
    const humanPlayer = room.gameState.players.find(p => p.id !== 'AI');
    room.gameState.currentPlayer = (humanPlayer?.color === 'black' ? 1 : 2) as 1 | 2;
    room.gameState.validMoves = OthelloGame.getValidMoves(room.gameState.board, room.gameState.currentPlayer);
    
    io.to(roomId).emit('gameStateUpdate', room.gameState);
    
    if (room.gameState.gameStatus === 'playing') {
      startTimer(roomId);
    }
  }
}

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', (playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }) => {
    const roomId = generateRoomId();
    const gameState = createInitialGameState();
    
    const player: Player = {
      id: socket.id,
      name: playerData.name,
      emoji: playerData.emoji,
      isReady: false,
      color: 'black',
      pieceEmoji: playerData.pieceEmoji,
      coins: getPlayerCoins(socket.id) // Load player coins
    };
    
    gameState.players.push(player);
    
    const room: Room = {
      id: roomId,
      gameState,
      messages: [],
      isAIGame: false
    };
    
    rooms.set(roomId, room);
    socket.join(roomId);
    
    socket.emit('roomCreated', { roomId, gameState });
  });

  socket.on('joinRoom', (data: { roomId: string; playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } } }) => {
    const { roomId, playerData } = data;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    
    if (room.gameState.players.length >= 2) {
      socket.emit('error', 'Room is full');
      return;
    }
    
    const player: Player = {
      id: socket.id,
      name: playerData.name,
      emoji: playerData.emoji,
      isReady: false,
      color: 'white',
      pieceEmoji: playerData.pieceEmoji,
      coins: getPlayerCoins(socket.id) // Load player coins
    };
    
    room.gameState.players.push(player);
    socket.join(roomId);
    
    io.to(roomId).emit('gameStateUpdate', room.gameState);
    socket.emit('roomJoined', { roomId, gameState: room.gameState });
  });

  socket.on('createAIGame', (data: { playerData: { name: string; emoji: string; pieceEmoji?: { black: string; white: string } }; difficulty: AIDifficulty }) => {
    const roomId = generateRoomId();
    const gameState = createInitialGameState();
    
    const humanPlayer: Player = {
      id: socket.id,
      name: data.playerData.name,
      emoji: data.playerData.emoji,
      isReady: true,
      color: 'black',
      pieceEmoji: data.playerData.pieceEmoji,
      coins: getPlayerCoins(socket.id) // Load player coins
    };
    
    // FIX: AI player cũng cần có pieceEmoji
    const aiPlayer: Player = {
      id: 'AI',
      name: `AI (${data.difficulty.toUpperCase()})`,
      emoji: '🤖',
      isReady: true,
      color: 'white',
      pieceEmoji: data.playerData.pieceEmoji, // Sử dụng cùng pieceEmoji với human player
      coins: 0 // AI doesn't need coins
    };
    
    gameState.players = [humanPlayer, aiPlayer];
    gameState.gameStatus = 'playing';
    
    const room: Room = {
      id: roomId,
      gameState,
      messages: [],
      isAIGame: true,
      aiDifficulty: data.difficulty
    };
    
    rooms.set(roomId, room);
    socket.join(roomId);
    
    startTimer(roomId);
    
    socket.emit('aiGameCreated', { roomId, gameState, difficulty: data.difficulty });
  });

  socket.on('playerReady', (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const player = room.gameState.players.find(p => p.id === socket.id);
    if (player) {
      player.isReady = true;
      
      if (room.gameState.players.length === 1 && !player.color) {
        player.color = 'black';
      } else if (room.gameState.players.length === 2) {
        const p1 = room.gameState.players[0];
        const p2 = room.gameState.players[1];
        if (!p1.color || !p2.color) {
          p1.color = 'black';
          p2.color = 'white';
        }
      }

      if (room.gameState.players.length === 2 && room.gameState.players.every(p => p.isReady)) {
        room.gameState.gameStatus = 'playing';
        startTimer(roomId);
      }
      
      io.to(roomId).emit('gameStateUpdate', room.gameState);
    }
  });

  socket.on('makeMove', (data: { roomId: string; row: number; col: number; difficulty?: AIDifficulty }) => {
    const room = rooms.get(data.roomId);
    if (!room || room.gameState.gameStatus !== 'playing') return;
    
    const currentPlayerObj = room.gameState.players.find(p => p.color === (room.gameState.currentPlayer === 1 ? 'black' : 'white'));
    
    if (!currentPlayerObj || currentPlayerObj.id !== socket.id) return;

    const validMove = room.gameState.validMoves.some(([r, c]) => r === data.row && c === data.col);
    if (!validMove) return;
    
    // Make the move
    room.gameState.board = OthelloGame.makeMove(room.gameState.board, data.row, data.col, room.gameState.currentPlayer);
    room.gameState.scores = OthelloGame.calculateScores(room.gameState.board);
    room.gameState.lastMove = { row: data.row, col: data.col, playerId: currentPlayerObj.id };
    
    // Switch player
    let nextPlayerNum = room.gameState.currentPlayer === 1 ? 2 : 1;
    room.gameState.currentPlayer = nextPlayerNum as 1 | 2;
    room.gameState.validMoves = OthelloGame.getValidMoves(room.gameState.board, room.gameState.currentPlayer);
    
    // Check if current player has no moves
    if (room.gameState.validMoves.length === 0) {
      let otherPlayerNum = room.gameState.currentPlayer === 1 ? 2 : 1;
      let otherPlayerMoves = OthelloGame.getValidMoves(room.gameState.board, otherPlayerNum);

      if (otherPlayerMoves.length === 0) {
        // Both players have no moves, game over
        room.gameState.gameStatus = 'finished';
        clearInterval(roomTimers.get(data.roomId)!);
        roomTimers.delete(data.roomId);
        
        const scores = OthelloGame.calculateScores(room.gameState.board);
        if (scores[1] > scores[2]) {
          room.gameState.winnerId = room.gameState.players.find(p => p.color === 'black')?.id;
        } else if (scores[2] > scores[1]) {
          room.gameState.winnerId = room.gameState.players.find(p => p.color === 'white')?.id;
        } else {
          room.gameState.winnerId = 'draw';
        }
        
        // Award coins to winner
        awardCoinsToWinner(room);
      } else {
        // Skip turn to the other player
        room.gameState.currentPlayer = otherPlayerNum as 1 | 2;
        room.gameState.validMoves = otherPlayerMoves;
      }
    }
    
    io.to(data.roomId).emit('gameStateUpdate', room.gameState);
    
    // Handle AI move if playing against AI
    const aiPlayer = room.gameState.players.find(p => p.id === 'AI');
    
    if (aiPlayer && room.gameState.gameStatus === 'playing' && room.gameState.currentPlayer === (aiPlayer.color === 'black' ? 1 : 2)) {
      // AI's turn
      setTimeout(() => {
        makeAIMove(data.roomId);
      }, 1000);
    } else if (room.gameState.gameStatus === 'playing') {
      // Human player's turn
      startTimer(data.roomId);
    }
  });

  // **FIX: Handle new game properly for AI and preserve piece emojis**
  socket.on('newGame', (data: { roomId: string; isAI?: boolean; difficulty?: AIDifficulty } | string) => {
    // Handle both old format (string) and new format (object)
    const roomId = typeof data === 'string' ? data : data.roomId;
    const isAI = typeof data === 'object' ? data.isAI : false;
    const difficulty = typeof data === 'object' ? data.difficulty : undefined;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    if (roomTimers.has(roomId)) {
      clearInterval(roomTimers.get(roomId)!);
      roomTimers.delete(roomId);
    }

    // Store old player data to preserve custom pieces and info
    const oldPlayers = room.gameState.players.map(p => ({ ...p }));
    
    // Reset game state
    room.gameState = createInitialGameState();
    
    if (isAI && difficulty) {
      // AI game - recreate AI player with preserved human player data
      const humanPlayerData = oldPlayers.find(p => p.id !== 'AI');
      const aiPlayer: Player = {
        id: 'AI',
        name: `AI (${difficulty.toUpperCase()})`,
        emoji: '🤖',
        isReady: true,
        color: 'white',
        pieceEmoji: humanPlayerData?.pieceEmoji, // Sử dụng cùng pieceEmoji với human player
        coins: 0 // AI doesn't need coins
      };
      
      if (humanPlayerData) {
        humanPlayerData.isReady = true;
        humanPlayerData.color = 'black';
        // Update player coins from current state
        humanPlayerData.coins = getPlayerCoins(humanPlayerData.id);
        room.gameState.players = [humanPlayerData, aiPlayer];
      } else {
        room.gameState.players = [aiPlayer];
      }
      
      room.gameState.gameStatus = 'playing';
      room.isAIGame = true;
      room.aiDifficulty = difficulty;
      
      startTimer(roomId);
    } else {
      // Human vs human game - preserve all player data but reset ready status
      room.gameState.players = oldPlayers.map((p, index) => ({ 
        ...p, 
        isReady: false,
        color: index === 0 ? 'black' : 'white',
        coins: getPlayerCoins(p.id) // Update coins from current state
      }));
      
      room.isAIGame = false;
      room.aiDifficulty = undefined;
    }
    
    // Clear coins awarded info for new game
    room.gameState.coinsAwarded = undefined;
    
    io.to(roomId).emit('gameStateUpdate', room.gameState);
  });

  socket.on('sendMessage', (data: { roomId: string; message: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;
    
    const player = room.gameState.players.find(p => p.id === socket.id);
    if (!player) return;
    
    const chatMessage: ChatMessage = {
      id: uuidv4(),
      playerId: socket.id,
      playerName: player.name,
      message: data.message,
      timestamp: Date.now()
    };
    
    room.messages.push(chatMessage);
    
    if (room.messages.length > 50) {
      room.messages = room.messages.slice(-50);
    }
    
    io.to(data.roomId).emit('newMessage', chatMessage);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.gameState.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.gameState.players.splice(playerIndex, 1);
        
        if (room.gameState.players.length === 0) {
          if (roomTimers.has(roomId)) {
            clearInterval(roomTimers.get(roomId)!);
            roomTimers.delete(roomId);
          }
          rooms.delete(roomId);
        } else {
          const disconnectedPlayerColor = playerIndex === 0 ? 'black' : 'white';
          const currentPlayerColor = room.gameState.currentPlayer === 1 ? 'black' : 'white';

          if (disconnectedPlayerColor === currentPlayerColor) {
            room.gameState.currentPlayer = room.gameState.currentPlayer === 1 ? 2 : 1;
            room.gameState.validMoves = OthelloGame.getValidMoves(room.gameState.board, room.gameState.currentPlayer);
            
            if (room.gameState.validMoves.length === 0 && OthelloGame.isGameOver(room.gameState.board)) {
              room.gameState.gameStatus = 'finished';
              if (roomTimers.has(roomId)) {
                clearInterval(roomTimers.get(roomId)!);
                roomTimers.delete(roomId);
              }
              const scores = OthelloGame.calculateScores(room.gameState.board);
              if (scores[1] > scores[2]) {
                room.gameState.winnerId = room.gameState.players.find(p => p.color === 'black')?.id;
              } else if (scores[2] > scores[1]) {
                room.gameState.winnerId = room.gameState.players.find(p => p.color === 'white')?.id;
              } else {
                room.gameState.winnerId = 'draw';
              }
              
              // Award coins to winner even if other player disconnected
              awardCoinsToWinner(room);
            }
          }
          io.to(roomId).emit('gameStateUpdate', room.gameState);
        }
      }
    }
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {

  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
