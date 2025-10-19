// This line imports the cookie serialization helper to craft HTTP cookie headers.
import { serialize } from "cookie"; // This comment explains serialize builds properly formatted cookie strings.

// This line defines the cookie name used to store the authenticated user identifier.
export const authCookieName = "roxtalk_user"; // This comment states the cookie name is consistent across APIs.

// This line exports a helper that sets the authentication cookie on the HTTP response.
export const setAuthCookie = (res: import("next").NextApiResponse, userId: string): void => { // This comment clarifies the function accepts a Next.js response and the user id to persist.
  // This line constructs a serialized cookie string with secure defaults.
  const cookieValue = serialize(authCookieName, userId, { // This comment explains we create an HttpOnly cookie that stores the user id.
    // This line marks the cookie as HttpOnly to prevent JavaScript access.
    httpOnly: true, // This comment protects against XSS attacks.
    // This line sets the cookie path to the root so every route can access it.
    path: "/", // This comment ensures the cookie accompanies all requests.
    // This line toggles the secure flag in production to force HTTPS usage.
    secure: process.env.NODE_ENV === "production", // This comment states we only require HTTPS in production.
    // This line ensures the cookie lasts one week to match the session duration.
    maxAge: 60 * 60 * 24 * 7, // This comment calculates seven days in seconds.
    // This line sets SameSite to strict to reduce CSRF risk.
    sameSite: "strict", // This comment clarifies that strict mitigates cross-site requests.
  }); // This comment ends the serialize configuration.
  // This line attaches the Set-Cookie header to the response so the browser persists it.
  res.setHeader("Set-Cookie", cookieValue); // This comment applies the cookie to the outgoing response.
}; // This comment closes the setAuthCookie function.

// This line exports a helper that removes the authentication cookie during logout.
export const clearAuthCookie = (res: import("next").NextApiResponse): void => { // This comment mentions we only need the response object to clear the cookie.
  // This line serializes the cookie with an immediate expiration to instruct the browser to delete it.
  const cookieValue = serialize(authCookieName, "", { // This comment sets an empty value for removal.
    // This line provides a path to ensure we clear the same cookie scope.
    path: "/", // This comment keeps scope identical to the setter.
    // This line sets the expiration to a past date to force deletion.
    expires: new Date(0), // This comment clarifies that the epoch date invalidates the cookie instantly.
  }); // This comment ends the serialize call.
  // This line includes the removal cookie in the response headers.
  res.setHeader("Set-Cookie", cookieValue); // This comment instructs the browser to clear the stored cookie.
}; // This comment closes the clearAuthCookie function.
