import type { NextApiRequest, NextApiResponse } from "next"; // This comment imports Next.js API types for the handler signature.
import { connectToDatabase } from "../../../lib/mongodb"; // This comment ensures MongoDB is connected before querying.
import { UserModel } from "../../../models/User"; // This comment imports the User model to fetch users.
import { getAuthenticatedUser } from "../../../lib/auth"; // This comment ensures the requester is authenticated.

// This line defines the API handler that returns all registered users.
const listUsersHandler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => { // This comment declares the handler function.
  if (req.method !== "GET") { // This comment allows only GET requests.
    res.setHeader("Allow", "GET"); // This comment informs clients about the allowed method.
    res.status(405).json({ success: false, error: "Method not allowed." }); // This comment responds with an error for unsupported methods.
    return; // This comment stops execution when the method is invalid.
  } // This comment ends the method guard.
  const requester = await getAuthenticatedUser(req); // This comment ensures the call is authenticated.
  if (!requester) { // This comment checks if authentication failed.
    res.status(401).json({ success: false, error: "Authentication required." }); // This comment returns an unauthorized error.
    return; // This comment prevents unauthenticated access to the user list.
  } // This comment closes the authentication guard.
  await connectToDatabase(); // This comment ensures the database is ready for queries.
  const users = await UserModel.find().sort({ name: 1 }); // This comment retrieves all users sorted alphabetically.
  const sanitizedUsers = users.map((user) => ({ // This comment maps user documents into sanitized payloads.
    _id: String(user._id), // This comment serializes the user id.
    name: user.name, // This comment includes the display name.
    email: user.email, // This comment includes the email address.
    location: user.location ?? "", // This comment adds the profile location.
    bio: user.bio ?? "", // This comment adds the profile biography.
    avatar: user.avatar ?? "",
    createdAt: user.createdAt.toISOString(), // This comment serializes the creation timestamp.
  })); // This comment closes the mapping to sanitized users.
  res.status(200).json({ success: true, data: sanitizedUsers }); // This comment returns the sanitized user list.
}; // This comment ends the handler function.

export default listUsersHandler; // This comment exports the handler for Next.js routing.
