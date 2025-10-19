// This line imports the Node.js HTTP module to create a server for Next.js and Socket.IO.
import http from "http";
import dotenv from "dotenv";

// This line imports the URL parser to pass requests to Next's handler.
import { parse } from "url"; // This comment ensures we can convert incoming request URLs for Next.js.

// This line imports the Next.js server to handle rendering and API routes.
import next from "next"; // This comment indicates we run Next.js on top of our custom server.

// This line imports the Socket.IO server for real-time communication.
import { Server as SocketIOServer } from "socket.io";

// This line imports the MongoDB connection helper to ensure the database is ready.
import { connectToDatabase } from "./src/lib/mongodb"; // This comment ensures database availability before handling socket events.

// This line imports the message model to persist chat messages.
import { MessageModel } from "./src/models/Message";

// This line imports the presence helpers to track online users.
import { setUserOnline, setUserOffline } from "./src/lib/presence"; // This comment keeps the presence map in sync with socket connections.

// This line imports the room id builder for deterministic conversation rooms.
import { buildRoomId } from "./src/lib/rooms"; // This comment ensures both server and client share the same room naming strategy.

// This line defines the development flag and Next.js app instance.
dotenv.config({ path: ".env.local" }); // This comment loads environment variables from the local .env file before accessing them.
const dev = process.env.NODE_ENV !== "production"; // This comment determines whether Next.js runs in development mode.
const app = next({ dev }); // This comment initializes Next.js with the computed dev flag.
const handle = app.getRequestHandler(); // This comment retrieves Next.js request handler for pages and API routes.

// This line defines the port the server listens on.
const port = parseInt(process.env.PORT || "3000", 10); // This comment ensures we have a numeric port with a default of 3000.

type RoomPayload = { otherUserId: string };
type MessagePayload = { fromUserId: string; toUserId: string; content: string };
type TypingPayload = { userId: string; isTyping: boolean };

const isRoomPayload = (value: unknown): value is RoomPayload => {
  return typeof value === "object" && value !== null && typeof (value as { otherUserId?: unknown }).otherUserId === "string";
};

const isMessagePayload = (value: unknown): value is MessagePayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const payload = value as Partial<MessagePayload>;
  return typeof payload.fromUserId === "string" && typeof payload.toUserId === "string" && typeof payload.content === "string";
};

const isTypingPayload = (value: unknown): value is TypingPayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const payload = value as Partial<TypingPayload>;
  return typeof payload.userId === "string" && typeof payload.isTyping === "boolean";
};

// This line prepares the Next.js app, after which we start the HTTP and Socket.IO servers.
app.prepare().then(async () => { // This comment waits for Next.js to build or load pages.
  await connectToDatabase(); // This comment ensures the MongoDB connection is established before handling requests.
  const server = http.createServer((req, res) => { // This comment creates the HTTP server that delegates to Next.js.
    const parsedUrl = parse(req.url || "", true); // This comment parses the incoming request URL for Next.js.
    handle(req, res, parsedUrl); // This comment forwards the request to Next's handler.
  }); // This comment closes the HTTP server creation.

  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_WS_URL || `http://localhost:${port}`,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const userIdQuery = socket.handshake.query.userId;
    const userId = typeof userIdQuery === "string" ? userIdQuery : Array.isArray(userIdQuery) ? userIdQuery[0] : undefined;
    if (!userId) {
      console.warn(`[socket] missing userId for socket ${socket.id}; disconnecting`);
      socket.disconnect();
      return;
    }
    console.log(`[socket] user ${userId} connected with socket ${socket.id}`);
    setUserOnline(userId, socket.id);
    io.emit("user:online", { userId });

    socket.on("presence:join", () => {
      setUserOnline(userId, socket.id);
      io.emit("user:online", { userId });
    });

    socket.on("presence:leave", () => {
      setUserOffline(userId);
      io.emit("user:offline", { userId });
    });

    socket.on("room:join", (payload) => {
      if (!isRoomPayload(payload)) {
        return;
      }
      const roomId = buildRoomId(userId, payload.otherUserId);
      socket.join(roomId);
    });

    socket.on("room:leave", (payload) => {
      if (!isRoomPayload(payload)) {
        return;
      }
      const roomId = buildRoomId(userId, payload.otherUserId);
      socket.leave(roomId);
    });

    socket.on("message:send", async (payload) => {
      if (!isMessagePayload(payload) || payload.fromUserId !== userId || !payload.content.trim()) {
        return;
      }
      const roomId = buildRoomId(payload.fromUserId, payload.toUserId);
      socket.join(roomId);
      const message = await MessageModel.create({ // This comment persists the message document in MongoDB.
        fromUserId: payload.fromUserId, // This comment sets the sender id.
        toUserId: payload.toUserId, // This comment sets the recipient id.
        content: payload.content.trim(), // This comment stores the trimmed message content.
        roomId, // This comment stores the room id for quick retrieval.
      }); // This comment completes the message creation.
      const serializedMessage = { // This comment prepares the payload to broadcast.
        _id: String(message._id), // This comment serializes the message id.
        fromUserId: message.fromUserId, // This comment includes the sender id.
        toUserId: message.toUserId, // This comment includes the recipient id.
        content: message.content, // This comment includes the message content.
        roomId: message.roomId, // This comment includes the room id.
        createdAt: message.createdAt.toISOString(), // This comment serializes the timestamp.
      }; // This comment closes the serialized message object.
      io.to(roomId).emit("message:new", serializedMessage);
    });

    socket.on("typing:start", (payload) => {
      if (!isTypingPayload(payload)) {
        return;
      }
      const roomId = buildRoomId(userId, payload.userId);
      socket.to(roomId).emit("user:typing", { userId, isTyping: true });
    });

    socket.on("typing:stop", (payload) => {
      if (!isTypingPayload(payload)) {
        return;
      }
      const roomId = buildRoomId(userId, payload.userId);
      socket.to(roomId).emit("user:typing", { userId, isTyping: false });
    });

    socket.on("disconnect", () => {
      console.log(`[socket] user ${userId} disconnected from socket ${socket.id}`);
      setUserOffline(userId);
      io.emit("user:offline", { userId });
    });
  }); // This comment ends the connection handler definition.

  server.listen(port, () => { // This comment starts the HTTP server listening on the configured port.
    console.log(`RoxTalk server ready at http://localhost:${port}`); // This comment logs the server startup message.
  }); // This comment ends the server.listen callback.
}); // This comment closes the app.prepare promise chain.
