import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean; // Đổi tên từ 'connected' thành 'isConnected' cho rõ ràng
}

// Khởi tạo context với giá trị mặc định là undefined, để có thể kiểm tra null trong useSocket
const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) { // Kiểm tra undefined thay vì !context
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false); // Đổi tên state

  useEffect(() => {
    // Sửa URL kết nối Socket.IO tại đây
    // Đảm bảo kết nối tới backend đang chạy trên port 3001
    // Xóa process.env.NEXT_PUBLIC_SOCKET_URL để tránh nhầm lẫn
    const socketInstance = io('https://othello-huong.onrender.com', {
      transports: ['websocket'], // Ưu tiên websocket, bỏ 'polling' và 'timeout' nếu không cần thiết
    });

    socketInstance.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true); // Cập nhật state
      toast.success('Đã kết nối máy chủ game!'); // Thông báo kết nối thành công
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false); // Cập nhật state
      toast.error('Mất kết nối máy chủ game!'); // Thông báo mất kết nối
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error);
      toast.error(`Lỗi kết nối máy chủ: ${error.message}`); // Thông báo lỗi kết nối chi tiết hơn
    });

    socketInstance.on('error', (message: string) => {
      toast.error(message); // Hiển thị lỗi từ server
    });

    setSocket(socketInstance);

    // Dọn dẹp kết nối khi component unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []); // [] đảm bảo useEffect chỉ chạy một lần khi component mount

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
