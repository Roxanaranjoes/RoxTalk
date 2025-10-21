import type { NextApiRequest, NextApiResponse } from "next"; // This comment imports Next.js API route types.
import { z } from "zod"; // This comment imports Zod for input validation.
import bcrypt from "bcrypt"; // This comment imports bcrypt for secure password hashing.
import { connectToDatabase } from "../../../lib/mongodb"; // This comment ensures the MongoDB connection is ready.
import { UserModel } from "../../../models/User"; // This comment imports the User model for persistence.
import { setAuthCookie } from "../../../lib/cookies"; // This comment imports the cookie helper to store the user id cookie value.

// This line defines the Zod schema used to validate the registration payload.
const registerSchema = z.object({ // This comment starts the schema definition.
  name: z.string().min(2, "Name must be at least two characters long."), // This comment validates the name string.
  email: z.string().email("Please provide a valid email address."), // This comment validates the email format.
  password: z.string().min(6, "Password must be at least six characters long."), // This comment ensures the password has adequate length.
}); // This comment completes the schema definition.

// This line defines the register API handler.
const registerHandler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => { // This comment declares the main handler function.
  if (req.method !== "POST") { // This comment enforces that only POST is allowed.
    res.setHeader("Allow", "POST"); // This comment informs clients about the allowed method.
    res.status(405).json({ success: false, error: "Method not allowed." }); // This comment returns a descriptive error for invalid methods.
    return; // This comment stops further execution.
  } // This comment ends the method guard.
  const parseResult = registerSchema.safeParse(req.body); // This comment validates the request body against the schema.
  if (!parseResult.success) { // This comment checks if validation failed.
    const message = parseResult.error.errors[0]?.message || "Invalid request payload."; // This comment extracts the first validation error message.
    res.status(400).json({ success: false, error: message }); // This comment responds with a bad request status and the error.
    return; // This comment stops processing due to invalid input.
  } // This comment ends the validation failure branch.
  const { name, email, password } = parseResult.data; // This comment destructures the validated payload.
  await connectToDatabase(); // This comment ensures a MongoDB connection is available.
  const existingUser = await UserModel.findOne({ email }); // This comment checks whether the email is already registered.
  if (existingUser) { // This comment handles duplicate email detection.
    res.status(409).json({ success: false, error: "An account with this email already exists." }); // This comment returns a conflict error.
    return; // This comment stops further execution because duplication prevents registration.
  } // This comment ends the duplicate guard.
  const passwordHash = await bcrypt.hash(password, 12); // This comment hashes the password with a strong cost factor.
  const user = await UserModel.create({ name, email, passwordHash }); // This comment creates the new user document in MongoDB.
  setAuthCookie(res, String(user._id)); // This comment stores the user id in a secure HttpOnly cookie.
  res.status(201).json({ // This comment prepares the successful response.
    success: true, // This comment indicates the registration succeeded.
    data: { _id: String(user._id), name: user.name, email: user.email, location: user.location ?? "", bio: user.bio ?? "", avatar: user.avatar ?? "", createdAt: user.createdAt.toISOString(), isOnline: true }, // This comment returns the sanitized user profile.
  }); // This comment ends the JSON response.
}; // This comment closes the handler function.

export default registerHandler; // This comment exports the handler as default for Next.js routing.
