import type { NextApiRequest, NextApiResponse } from "next"; // This comment imports Next.js API request and response types.
import { z } from "zod"; // This comment imports Zod for payload validation.
import bcrypt from "bcrypt"; // This comment imports bcrypt for password comparison.
import { connectToDatabase } from "../../../lib/mongodb"; // This comment ensures database connectivity.
import { UserModel } from "../../../models/User"; // This comment imports the User model for querying.
import { setAuthCookie } from "../../../lib/cookies"; // This comment imports the cookie helper to store the token.

// This line defines the schema used to validate login payloads.
const loginSchema = z.object({ // This comment starts the schema definition.
  email: z.string().email("Please provide a valid email address."), // This comment ensures the email is properly formatted.
  password: z.string().min(1, "Password is required."), // This comment ensures the password field is not empty.
}); // This comment completes the schema definition.

// This line defines the login API route handler.
const loginHandler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => { // This comment declares the handler.
  if (req.method !== "POST") { // This comment validates the HTTP method.
    res.setHeader("Allow", "POST"); // This comment informs the client which method is permitted.
    res.status(405).json({ success: false, error: "Method not allowed." }); // This comment responds with a method not allowed error.
    return; // This comment halts execution for invalid methods.
  } // This comment ends the method guard.
  const parseResult = loginSchema.safeParse(req.body); // This comment validates the incoming payload.
  if (!parseResult.success) { // This comment checks for validation failures.
    const message = parseResult.error.errors[0]?.message || "Invalid request payload."; // This comment reads the first validation error.
    res.status(400).json({ success: false, error: message }); // This comment returns a bad request response with details.
    return; // This comment stops further processing.
  } // This comment closes the validation guard.
  const { email, password } = parseResult.data; // This comment destructures the validated login payload.
  await connectToDatabase(); // This comment ensures a MongoDB connection is available.
  const user = await UserModel.findOne({ email }); // This comment fetches the user document using the email.
  if (!user) { // This comment detects missing accounts.
    res.status(401).json({ success: false, error: "Invalid email or password." }); // This comment responds with a generic credential error.
    return; // This comment stops execution because authentication failed.
  } // This comment ends the missing user guard.
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash); // This comment compares the provided password with the stored hash.
  if (!isPasswordValid) { // This comment checks whether the password comparison failed.
    res.status(401).json({ success: false, error: "Invalid email or password." }); // This comment returns the same generic error to avoid leaking details.
    return; // This comment halts execution due to invalid credentials.
  } // This comment closes the invalid password guard.
  setAuthCookie(res, String(user._id)); // This comment stores the user id in an HttpOnly cookie for session tracking.
  res.status(200).json({ // This comment sends a successful response.
    success: true, // This comment indicates the login succeeded.
    data: { _id: String(user._id), name: user.name, email: user.email, location: user.location ?? "", bio: user.bio ?? "", avatar: user.avatar ?? "", createdAt: user.createdAt.toISOString(), isOnline: true }, // This comment returns the sanitized user object.
  }); // This comment completes the JSON response.
}; // This comment ends the handler function.

export default loginHandler; // This comment exports the handler for Next.js routing.
