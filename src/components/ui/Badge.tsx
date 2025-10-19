// This line imports React to define the badge component.
import React from "react";

// This line defines the props supported by the Badge component.
export interface BadgeProps {
  // This line holds the content displayed inside the badge.
  children: React.ReactNode;
  // This line toggles whether the badge should render at all.
  isVisible?: boolean;
  // This line allows additional classes to be merged in.
  className?: string;
}

// This line defines the Badge functional component.
export const Badge: React.FC<BadgeProps> = ({ children, isVisible = true, className = "" }) => {
  // This line returns null when the badge is set to hidden.
  if (!isVisible) {
    // This line stops rendering by returning null.
    return null;
  }
  // This line composes the base classes for the badge element.
  const baseClasses = `inline-flex min-w-6 items-center justify-center rounded-full bg-[#ffe0f4]/90 px-2 text-xs font-semibold text-[#7c3a7f] shadow-md shadow-[rgba(169,184,209,0.25)] ${className}`.trim();
  // This line returns the styled badge element.
  return (
    <span className={baseClasses}>{children}</span>
  );
};
