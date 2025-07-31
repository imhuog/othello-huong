import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';
import { Player } from '../types'; // Thêm import này
import ThemeSelector from './ThemeSelector';
import toast from 'react-hot-toast';

const GameInfo: React.FC = () => {
  const { gameState, roomId, newGame, startGame, isAIGame, aiDifficulty } = useGame();
  const { socket } = useSocket();
  const [showRules, setShowRules] = useState(false);

  if (!gameState) return null;

  const currentPlayer = gameState.players.find(p => p.id === socket?.id);
  const isHost = gameState.players[0]?.id === socket?.id;
  const canStartGame = gameState.gameStatus === 'waiting' && gameState.players.length === 2;
  const isGameFinished = gameState.gameStatus === 'finished';

  const getWinner = () => {
    const player1Score = gameState.scores[1];
    const player2Score = gameState.scores[2];
    
    if (player1Score > player2Score) {
      return { 
        player: gameState.players[0], 
        score: player1Score,
        opponentScore: player2Score
      };
    } else if (player2Score > player1Score) {
      return { 
        player: gameState.players[1], 
        score: player2Score,
        opponentScore: player1Score
      };
    }
    return null; // Tie
  };

  const copyRoomLink = async () => {
    try {
      const link = `${window.location.origin}?room=${roomId}`;
      await navigator.clipboard.writeText(link);
      
      // Hiển thị thông báo thành công
      toast.success('🔗 Đã copy link vào clipboard!', {
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white',
          fontWeight: 'bold',
          border: '2px solid #059669',
        },
        icon: '✅',
      });
    } catch (err) {
      console.error('Không thể copy link:', err);
      // Hiển thị thông báo lỗi
      toast.error('❌ Không thể copy link!', {
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white',
          fontWeight: 'bold',
          border: '2px solid #dc2626',
        },
      });
    }
  };

  // Helper function để lấy emoji quân cờ đúng
  const getPlayerPieceEmoji = (player: Player, playerIndex: number) => {
    // Kiểm tra nếu player có pieceEmoji tùy chỉnh
    if (player.pieceEmoji) {
      return playerIndex === 0 ? player.pieceEmoji.black : player.pieceEmoji.white;
    }
    
    // Fallback về emoji mặc định
    return playerIndex === 0 ? '⚫' : '⚪';
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Room Info */}
      <motion.div
        className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 md:p-6 w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6 gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {isAIGame ? `🤖 AI ${aiDifficulty?.toUpperCase()}` : '🎮 Thông tin phòng'}
          </h2>
          <div className="flex justify-center sm:justify-end">
            <ThemeSelector />
          </div>
        </div>

        {!isAIGame && roomId && (
          <div className="space-y-3 mb-4 md:mb-6">
            <div className="bg-black/20 rounded-lg p-3 md:p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span className="text-gray-300 font-medium text-sm">Mã phòng:</span>
                  <code className="bg-black/40 px-3 py-2 rounded-lg text-yellow-400 font-mono text-base sm:text-lg font-bold tracking-wider text-center">
                    {roomId}
                  </code>
                </div>
                <motion.button
                  onClick={copyRoomLink}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  📋 Copy link mời bạn
                </motion.button>
              </div>
            </div>
          </div>
        )}

        {/* Players */}
        <div className="space-y-3 mb-4 md:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-white">👥 Người chơi</h3>
          <div className="grid grid-cols-1 gap-3">
            {gameState.players.map((player, index) => (
              <motion.div
                key={player.id}
                className={`
                  p-3 sm:p-4 rounded-lg border-2 transition-all duration-300
                  ${gameState.currentPlayer === index + 1 && gameState.gameStatus === 'playing'
                    ? 'border-yellow-400 bg-yellow-400/20 shadow-lg shadow-yellow-400/20'
                    : 'border-gray-600 bg-gray-700/30'
                  }
                `}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <span className="text-2xl sm:text-4xl flex-shrink-0">{player.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-semibold text-white text-sm sm:text-lg truncate">
                          {player.name}
                        </span>
                        {player.id === socket?.id && (
                          <span className="text-xs bg-green-500 px-2 py-1 rounded-full text-white font-medium flex-shrink-0">
                            Bạn
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-400 mt-1 flex items-center gap-2">
                        <span>Người chơi {index + 1} {getPlayerPieceEmoji(player, index)}</span>
                        {/* Display coins for human players */}
                        {player.id !== 'AI' && player.coins !== undefined && typeof player.coins === 'number' && (
                          <motion.div 
                            className="flex items-center gap-1 bg-yellow-500/20 px-2 py-1 rounded-full border border-yellow-500/30"
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <span className="text-yellow-400">🪙</span>
                            <span className="text-yellow-300 font-bold text-xs">{player.coins}</span>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl sm:text-3xl font-bold text-white">
                      {gameState.scores[index + 1]}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">
                      điểm
                    </div>
                  </div>
                </div>
                
                {gameState.gameStatus === 'waiting' && (
                  <div className="mt-3 flex justify-center">
                    <span className={`
                      text-xs sm:text-sm px-3 py-1 rounded-full font-medium
                      ${player.isReady 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-500 text-gray-200'
                      }
                    `}>
                      {player.isReady ? '✅ Sẵn sàng' : '⏳ Đang chờ...'}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Game Status */}
        <div className="mb-4 md:mb-6">
          <div className="bg-black/20 rounded-lg p-3 sm:p-4 text-center">
            {gameState.gameStatus === 'waiting' && (
              <div className="space-y-3 sm:space-y-4">
                <p className="text-gray-300 text-sm sm:text-lg">
                  {gameState.players.length === 1 
                    ? '⏳ Đang chờ người chơi thứ 2...'
                    : '🎯 Cả hai người chơi đã vào phòng!'
                  }
                </p>
                
                {canStartGame && isHost && (
                  <motion.button
                    onClick={startGame}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors text-sm sm:text-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🚀 Bắt đầu game!
                  </motion.button>
                )}
                
                {canStartGame && !isHost && (
                  <motion.button
                    onClick={startGame}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors text-sm sm:text-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ✅ Tôi đã sẵn sàng!
                  </motion.button>
                )}
              </div>
            )}

            {gameState.gameStatus === 'playing' && (
              <div className="text-green-400 font-semibold text-sm sm:text-lg">
                🎮 Game đang diễn ra...
              </div>
            )}

            {isGameFinished && (
              <motion.div
                className="space-y-3 sm:space-y-4"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: 'spring' }}
              >
                {(() => {
                  const winner = getWinner();
                  if (winner) {
                    return (
                      <div className="p-4 sm:p-6 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-xl border-2 border-yellow-400">
                        <div className="text-3xl sm:text-5xl mb-2 sm:mb-3">🏆</div>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-400 mb-2 sm:mb-3">
                          🎉 {winner.player.name} thắng!
                        </div>
                        <div className="text-white text-sm sm:text-lg font-semibold p-2 sm:p-3 border-2 border-yellow-400/50 rounded-lg bg-yellow-400/10 mb-3">
                          Tỷ số: {winner.score} - {winner.opponentScore}
                        </div>
                        
                        {/* Show coins earned if winner is current player and not AI */}
                        {(gameState as any).coinsAwarded && (gameState as any).coinsAwarded.playerId === socket?.id && winner.player.id !== 'AI' && (
                          <motion.div
                            className="flex items-center justify-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-lg border border-yellow-500/30"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.5, type: "spring" }}
                          >
                            <span className="text-2xl">🪙</span>
                            <span className="text-yellow-300 font-bold">
                              +{(gameState as any).coinsAwarded.amount} xu được thưởng!
                            </span>
                          </motion.div>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl border-2 border-blue-400">
                        <div className="text-3xl sm:text-5xl mb-2 sm:mb-3">🤝</div>
                        <div className="text-lg sm:text-2xl font-bold text-blue-400 mb-2 sm:mb-3">
                          Hòa!
                        </div>
                        <div className="text-white text-sm sm:text-lg font-semibold">
                          Tỷ số: {gameState.scores[1]} - {gameState.scores[2]}
                        </div>
                      </div>
                    );
                  }
                })()}
              </motion.div>
            )}
          </div>
        </div>

        {/* Game Controls */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <motion.button
            onClick={newGame}
            className="flex-1 px-4 py-2 sm:py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>🔄</span>
            <span>Ván mới</span>
          </motion.button>

          <motion.button
            onClick={() => setShowRules(true)}
            className="flex-1 px-4 py-2 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>📋</span>
            <span>Luật chơi</span>
          </motion.button>

          <motion.button
            onClick={() => window.location.href = '/'}
            className="flex-1 px-4 py-2 sm:py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>🏠</span>
            <span>Về menu</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Rules Modal */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRules(false)}
          >
            <motion.div
              className="bg-gray-800 rounded-xl p-4 sm:p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-white">📋 Luật chơi Othello</h3>
                <button
                  onClick={() => setShowRules(false)}
                  className="text-gray-400 hover:text-white text-xl sm:text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4 text-gray-300 text-sm sm:text-base">
                <div>
                  <h4 className="font-semibold text-white mb-2">🎯 Mục tiêu:</h4>
                  <p>Chiếm được nhiều ô trên bàn cờ nhất có thể bằng cách lật quân của đối thủ.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">🎮 Cách chơi:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Hai người chơi luân phiên đặt quân trên bàn cờ 8x8</li>
                    <li>Người chơi 1 (⚫) đi trước, người chơi 2 (⚪) đi sau</li>
                    <li>Mỗi nước đi phải "kẹp" ít nhất một quân đối thủ</li>
                    <li>Tất cả quân bị "kẹp" sẽ được lật thành màu của mình</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">📏 Quy tắc "kẹp":</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Quân mới đặt và quân cùng màu tạo thành một "đường thẳng"</li>
                    <li>Giữa chúng phải có ít nhất một quân đối thủ</li>
                    <li>Có thể kẹp theo 8 hướng: ngang, dọc, chéo</li>
                    <li>Một nước đi có thể kẹp nhiều hướng cùng lúc</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">⏰ Giới hạn thời gian:</h4>
                  <p>Mỗi người chơi có 30 giây để suy nghĩ mỗi nước đi. Hết thời gian sẽ bị bỏ lượt.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">🪙 Hệ thống xu:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Người thắng cuộc sẽ được thưởng <strong className="text-yellow-400">10 xu</strong></li>
                    <li>Nếu hòa, không ai được xu</li>
                    <li>Xu được tích lũy qua các ván chơi</li>
                    <li>Chơi với AI cũng được xu như bình thường</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">🏁 Kết thúc game:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Game kết thúc khi cả hai người không thể đi nước nào</li>
                    <li>Người có nhiều quân hơn sẽ thắng</li>
                    <li>Nếu bằng điểm thì là hòa</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">🤖 Chế độ AI:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Dễ:</strong> AI đi ngẫu nhiên</li>
                    <li><strong>Trung bình:</strong> AI ưu tiên góc và cạnh</li>
                    <li><strong>Khó:</strong> AI sử dụng thuật toán đánh giá vị trí</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 text-center">
                <button
                  onClick={() => setShowRules(false)}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Đã hiểu!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameInfo;
