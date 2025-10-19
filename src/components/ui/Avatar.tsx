// This line imports React so we can define a functional component with JSX.
import React from "react";

// This line declares the props accepted by the Avatar component.
export interface AvatarProps {
  // This line defines the display name used to compute initials.
  name: string;
  // This line defines an optional flag that toggles the online presence indicator.
  isOnline?: boolean;
  // This line defines an optional class that customizes the avatar size.
  sizeClass?: string;
}

// This line implements a helper that converts a name into uppercase initials.
const getInitials = (name: string): string => {
  // This line splits the name into parts using whitespace.
  const parts = name.trim().split(" ");
  // This line grabs the first letter of the first name part if available.
  const first = parts[0]?.charAt(0) ?? "";
  // This line grabs the first letter of the last name part for multi-part names.
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? "" : "";
  // This line builds the final initials string and defaults to the first letter if needed.
  return `${first}${last}`.toUpperCase() || first.toUpperCase();
};

// This line defines the Avatar functional component that renders the circle and presence badge.
export const Avatar: React.FC<AvatarProps> = ({
  name,
  isOnline = false,
  sizeClass = "h-12 w-12"
}) => {
  // This line computes the initials text using the helper function.
  const initials = getInitials(name);
  // This line assembles the Tailwind classes that style the circular avatar background.
  const avatarClasses = `${sizeClass} relative flex items-center justify-center rounded-full border border-[#d4dcf8] bg-gradient-to-br from-[#cde4ff] via-[#f3e0ff] to-[#ffe0f4] text-[#2f2a4a] font-semibold uppercase shadow-lg shadow-[rgba(169,184,209,0.35)] backdrop-blur`.trim();
  // This line returns the JSX structure for the avatar.
  return (
    <div className={avatarClasses}>
      <span>{initials || "?"}</span>
      <span
        className={`absolute bottom-1 right-1 h-3 w-3 rounded-full border border-white/80 ${isOnline ? "bg-emerald-300" : "bg-[#c0c6da]"}`}
      />
    </div>
  );
};
