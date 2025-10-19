import type { NextApiRequest, NextApiResponse } from "next"; // This comment imports Next.js API route types.
import { z } from "zod"; // This comment imports Zod for validating query parameters.
import { connectToDatabase } from "../../../lib/mongodb"; // This comment ensures database connectivity.
import { MessageModel } from "../../../models/Message"; // This comment imports the Message model for querying.
import { getAuthenticatedUser } from "../../../lib/auth"; // This comment imports the helper to resolve the current user.
import { buildRoomId } from "../../../lib/rooms"; // This comment imports the room id helper to query messages.

// This line defines the schema used to validate the incoming query parameters.
const historySchema = z.object({ // This comment starts the Zod schema definition.
  userId: z.string().min(1, "Conversation userId is required."), // This comment ensures the target user id is provided.
}); // This comment completes the schema definition.

// This line defines the API handler that returns conversation history.
const historyHandler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => { // This comment declares the handler function.
  if (req.method !== "GET") { // This comment ensures only GET requests are handled.
    res.setHeader("Allow", "GET"); // This comment informs clients which method is supported.
    res.status(405).json({ success: false, error: "Method not allowed." }); // This comment responds with a method not allowed error.
    return; // This comment stops execution for invalid methods.
  } // This comment closes the method guard.
  const rawUserId = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId; // This comment normalizes the userId query parameter into a single string.
  const queryInput = historySchema.safeParse({ userId: rawUserId }); // This comment validates the normalized query using Zod.
  if (!queryInput.success) { // This comment checks for validation errors.
    const message = queryInput.error.errors[0]?.message || "Invalid query string."; // This comment extracts the validation error message.
    res.status(400).json({ success: false, error: message }); // This comment responds with a bad request status.
    return; // This comment prevents further processing due to invalid input.
  } // This comment ends the validation failure branch.
  const authenticatedUser = await getAuthenticatedUser(req); // This comment fetches the current authenticated user.
  if (!authenticatedUser) { // This comment checks if authentication failed.
    res.status(401).json({ success: false, error: "Authentication required." }); // This comment responds with an unauthorized error.
    return; // This comment stops execution because no user is authenticated.
  } // This comment closes the authentication guard.
  await connectToDatabase(); // This comment ensures MongoDB is connected before querying.
  const targetUserId = queryInput.data.userId; // This comment pulls the other participant id from the parsed query.
  const roomId = buildRoomId(String(authenticatedUser._id), targetUserId); // This comment computes the deterministic room id using stringified ids.
  const messages = await MessageModel.find({ roomId }).sort({ createdAt: 1 }); // This comment fetches all messages in chronological order.
  const serializedMessages = messages.map((message) => ({ // This comment maps database documents to plain JSON payloads.
    _id: String(message._id), // This comment serializes the message id.
    fromUserId: message.fromUserId, // This comment includes the sender id.
    toUserId: message.toUserId, // This comment includes the recipient id.
    content: message.content, // This comment includes the message content.
    roomId: message.roomId, // This comment includes the room id for reference.
    createdAt: message.createdAt.toISOString(), // This comment serializes the creation timestamp.
  })); // This comment finishes mapping messages.
  res.status(200).json({ success: true, data: serializedMessages }); // This comment responds with the messages array.
}; // This comment ends the handler function.

export default historyHandler; // This comment exports the handler for Next.js routing.
