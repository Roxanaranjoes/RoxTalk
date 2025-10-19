// This line imports the Next.js API request and response types for typing helpers.
import type { NextApiRequest } from "next"; // This comment clarifies we use the request type to inspect cookies.

// This line imports the cookie parser to read cookies from the header when necessary.
import { parse } from "cookie"; // This comment ensures we can parse cookies even if Next did not populate req.cookies.

// This line imports Mongoose user model to fetch user documents.
import { UserModel, type UserDocument } from "../models/User"; // This comment enables us to query the database for the current user.

// This line imports the cookie helper to know the cookie name.
import { authCookieName } from "./cookies"; // This comment ensures we reference the same cookie key everywhere.

// This line imports the MongoDB connection helper to ensure the database is available.
import { connectToDatabase } from "./mongodb"; // This comment ensures the DB connection is ready before querying.

// This line defines an asynchronous helper that retrieves the authenticated user from the request.
export const getAuthenticatedUser = async (req: NextApiRequest): Promise<UserDocument | null> => { // This comment states the function returns the user document or null.
  // This line ensures the MongoDB connection is established.
  await connectToDatabase(); // This comment confirms database availability for the upcoming query.
  // This line attempts to read the cookie map directly from the request if available.
  const cookiesSource = req.cookies && Object.keys(req.cookies).length > 0 ? req.cookies : parse(req.headers.cookie || ""); // This comment falls back to manual parsing when Next does not populate req.cookies.
  // This line extracts the authentication value from the cookies.
  const userId = cookiesSource[authCookieName]; // This comment retrieves the persisted user identifier.
  // This line returns null when the identifier is missing.
  if (!userId) { // This comment handles unauthenticated requests gracefully.
    return null; // This comment signals that no authenticated user exists.
  } // This comment closes the missing token guard.
  // This line queries the database for the user corresponding to the cookie's user id.
  const user = await UserModel.findById(userId); // This comment fetches the user document from MongoDB.
  // This line returns the found user or null if the id was not present.
  return user; // This comment hands the result back to the caller.
}; // This comment closes the getAuthenticatedUser helper.
