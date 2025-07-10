import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import redis from './redis.js';


const pubClient = redis.duplicate();
const subClient = pubClient.duplicate();

/**
 * @type {Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>}
 */
export let io = null;

export function createSocketServer(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL,
            credentials: true,
            preflightContinue: true,
        },
        adapter: createAdapter(pubClient, subClient)
    });

    io.on("connection", (socket) => {
    console.log(" New socket connection:", socket.id);

    const session = socket.request.session;

    if (!session?.userId) {
      console.log(" No session.userId found, disconnecting...");
      return socket.disconnect();
    }

    console.log(" User authenticated with session.userId:", session.userId);

    // Optionally join room based on userId for private emits
    socket.join(session.userId);

  });
   
  return io;
}


export default { io };
