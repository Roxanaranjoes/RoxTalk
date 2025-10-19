// This line imports the mongoose library for MongoDB interactions.
import mongoose from "mongoose"; // This comment clarifies that mongoose handles ODM duties.

// This line declares the shape of a Node.js global object extension for caching connections.
interface GlobalWithMongoose { // This comment explains we extend the global scope to store a cached promise.
  // This line optionally stores a pending or resolved mongoose connection promise.
  mongooseConnectionPromise?: Promise<typeof mongoose>; // This comment ensures TypeScript knows about the optional property.
} // This comment closes the interface definition.

// This line casts the Node.js global object to our extended interface.
const globalWithMongoose = global as typeof global & GlobalWithMongoose; // This comment allows us to attach the cached promise safely.

// This line defines a reusable function that ensures a single MongoDB connection is shared.
export const connectToDatabase = async (): Promise<typeof mongoose> => { // This comment states we return the mongoose module after ensuring connection.
  // This line reads the MongoDB connection string from environment variables inside the function to respect runtime configuration.
  const connectionUri = process.env.MONGODB_URI as string | undefined; // This comment notes we expect MONGODB_URI to be defined for DB access.
  // This line throws a descriptive error if the URI is missing to help developers configure the environment.
  if (!connectionUri) { // This comment verifies the environment configuration before connecting.
    // This line immediately raises an error to prevent undefined behavior without a database.
    throw new Error("MONGODB_URI environment variable is required for database connectivity."); // This comment explains the failure reason.
  } // This comment closes the configuration guard.
  // This line checks if a connection promise already exists on the global scope.
  if (!globalWithMongoose.mongooseConnectionPromise) { // This comment prevents creating multiple parallel connections.
    // This line assigns a new connection promise using the mongoose connect helper.
    globalWithMongoose.mongooseConnectionPromise = mongoose.connect(connectionUri, { // This comment instructs mongoose to initiate a connection.
      // This line sets the server selection timeout to avoid hanging forever.
      serverSelectionTimeoutMS: 5000, // This comment ensures the driver fails fast if the cluster is unreachable.
    }); // This comment concludes the mongoose.connect invocation.
  } // This comment closes the cache initialization branch.
  // This line awaits the cached promise so callers receive a ready mongoose module.
  return globalWithMongoose.mongooseConnectionPromise; // This comment ensures all consumers share the same connection.
}; // This comment closes the connectToDatabase function.
