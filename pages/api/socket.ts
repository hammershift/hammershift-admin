import { NextApiRequest, NextApiResponse } from 'next';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { initializeOrderBookServer } from '../../src/app/lib/websocket/orderBookServer';

/**
 * Socket.IO initialization endpoint
 *
 * This route initializes the Socket.IO server when first accessed.
 * It attaches to the Next.js HTTP server and enables WebSocket support.
 */

export const config = {
  api: {
    bodyParser: false,
  },
};

type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io?: SocketIOServer;
    };
  };
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (res.socket.server.io) {
    console.log('[Socket.IO] Already initialized');
    res.status(200).json({ message: 'Socket.IO already initialized' });
    return;
  }

  console.log('[Socket.IO] Initializing server...');

  const io = initializeOrderBookServer(res.socket.server as HTTPServer);
  res.socket.server.io = io;

  console.log('[Socket.IO] Server initialized successfully');
  res.status(200).json({ message: 'Socket.IO initialized' });
}
