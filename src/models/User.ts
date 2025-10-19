// This line imports the mongoose library to define schemas and models.
import mongoose, { Schema, model, models } from "mongoose"; // This comment states we use Schema for structure and model/models for retrieval or creation.

// This line defines the TypeScript representation of a User document.
export interface UserDocument extends mongoose.Document { // This comment indicates we extend mongoose.Document for built-in fields.
  // This line stores the human readable name of the user.
  name: string; // This comment clarifies the display name is required.
  // This line stores the unique email used for authentication.
  email: string; // This comment mentions the email must be unique.
  // This line stores the hashed password string.
  passwordHash: string; // This comment ensures we never persist plain passwords.
  // This line stores the timestamp for when the account was created.
  createdAt: Date; // This comment indicates mongoose will manage this timestamp automatically.
  // This line stores an updated timestamp maintained by mongoose.
  updatedAt: Date; // This comment ensures we track the last modification time.
} // This comment closes the UserDocument interface.

// This line defines the schema structure for the User collection.
const userSchema = new Schema<UserDocument>( // This comment states we create a strongly typed schema.
  { // This comment opens the schema fields definition.
    // This line defines the name field with string type and a required flag.
    name: { type: String, required: true }, // This comment ensures mongoose enforces presence of a name.
    // This line defines the email field with unique constraint and required flag.
    email: { type: String, required: true, unique: true }, // This comment notes we store a unique email address.
    // This line defines the password hash field.
    passwordHash: { type: String, required: true }, // This comment confirms we always store a hashed password.
  }, // This comment closes the schema fields object.
  { // This comment opens the schema options block.
    // This line enables automatic createdAt and updatedAt timestamps.
    timestamps: true, // This comment instructs mongoose to manage timestamp fields.
  } // This comment closes the schema options object.
); // This comment concludes the schema instantiation.

// This line either retrieves the existing User model or creates a new one to avoid recompilation issues.
export const UserModel = models.User || model<UserDocument>("User", userSchema); // This comment ensures we reuse the model when hot reloading.
