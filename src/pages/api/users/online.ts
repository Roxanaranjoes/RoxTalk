import type { NextApiRequest, NextApiResponse } from "next"; // This comment imports Next.js API route types.
import { getOnlineUsers } from "../../../lib/presence"; // This comment imports the presence helper to read online users.

// This line defines the API handler for retrieving currently online user ids.
const onlineHandler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => { // This comment declares the handler function.
  if (req.method !== "GET") { // This comment ensures only GET requests are allowed.
    res.setHeader("Allow", "GET"); // This comment tells clients which method is accepted.
    res.status(405).json({ success: false, error: "Method not allowed." }); // This comment returns a 405 error for invalid methods.
    return; // This comment stops execution for unsupported methods.
  } // This comment closes the method guard.
  const onlineMap = getOnlineUsers(); // This comment retrieves the current presence map.
  const userIds = Object.keys(onlineMap); // This comment extracts the user ids from the map.
  res.status(200).json({ userIds }); // This comment responds with the list of online user ids.
}; // This comment ends the handler function.

export default onlineHandler; // This comment exports the handler for Next.js routing.
