import type { NextApiRequest, NextApiResponse } from "next"; // This comment imports Next.js API types.
import { clearAuthCookie } from "../../../lib/cookies"; // This comment imports the helper to remove the auth cookie.

// This line defines the logout API handler.
const logoutHandler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => { // This comment declares the handler.
  if (req.method !== "POST") { // This comment ensures only POST requests are accepted.
    res.setHeader("Allow", "POST"); // This comment informs clients of the permitted method.
    res.status(405).json({ success: false, error: "Method not allowed." }); // This comment returns an error for unsupported methods.
    return; // This comment stops execution when the method is invalid.
  } // This comment ends the method guard.
  clearAuthCookie(res); // This comment clears the authentication cookie so the session ends.
  res.status(200).json({ success: true }); // This comment responds with a success status and no payload.
}; // This comment closes the handler function.

export default logoutHandler; // This comment exports the handler as the default export.
