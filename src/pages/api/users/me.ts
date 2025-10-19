import type { NextApiRequest, NextApiResponse } from "next"; // This comment imports Next.js API types.
import { getAuthenticatedUser } from "../../../lib/auth"; // This comment imports the helper that resolves the authenticated user.

// This line defines the handler for retrieving the current authenticated user.
const meHandler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => { // This comment declares the handler function.
  if (req.method !== "GET") { // This comment ensures only GET requests are processed.
    res.setHeader("Allow", "GET"); // This comment informs clients that only GET is allowed.
    res.status(405).json({ success: false, error: "Method not allowed." }); // This comment responds with an error for invalid methods.
    return; // This comment stops further processing.
  } // This comment ends the method guard.
  const user = await getAuthenticatedUser(req); // This comment fetches the authenticated user from the request.
  if (!user) { // This comment checks whether the user is absent.
    res.status(401).json({ success: false, error: "Authentication required." }); // This comment returns an unauthorized status.
    return; // This comment exits because no user is authenticated.
  } // This comment closes the missing user guard.
  res.status(200).json({ // This comment prepares the success response.
    success: true, // This comment indicates the request succeeded.
    data: { _id: String(user._id), name: user.name, email: user.email, createdAt: user.createdAt.toISOString(), isOnline: true }, // This comment returns the sanitized user payload.
  }); // This comment finalizes the JSON response.
}; // This comment ends the handler function.

export default meHandler; // This comment exports the handler for Next.js API routing.
