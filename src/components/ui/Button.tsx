

// This line imports React so we can define a functional component with JSX support.
import React from "react";

// This line declares the props interface for the Button component including standard button attributes.
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // This line introduces an optional visual variant that controls the color scheme.
  variant?: "primary" | "secondary" | "ghost";
  // This line introduces an optional loading flag to disable the button while showing progress.
  isLoading?: boolean;
}

// This line defines the Button functional component with default props applied via destructuring.
export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  isLoading = false,
  disabled,
  className = "",
  children,
  ...rest
}) => {
  // This line assembles the base Tailwind classes that define the shared button appearance.
  const baseClasses = "inline-flex items-center justify-center rounded-2xl px-4 py-2 font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 shadow-lg shadow-[rgba(169,184,209,0.25)]";
  // This line defines the gradient-filled style for the primary variant.
  const primaryClasses = "bg-gradient-to-r from-[#a8ddff] to-[#fbc7ff] text-[#2f2a4a] border border-sky-200/70 hover:from-[#9fd3ff] hover:to-[#f5baff] focus-visible:outline-[#9fc4ff] disabled:opacity-60";
  // This line defines the translucent style for the secondary variant.
  const secondaryClasses = "bg-white/70 text-[#2f2a4a] border border-sky-200/60 backdrop-blur hover:bg-white/80 focus-visible:outline-[#b7d8ff] disabled:opacity-60";
  // This line defines the minimalist style for the ghost variant.
  const ghostClasses = "bg-transparent text-[#5b6287] border border-transparent hover:bg-white/60 hover:text-[#2f2a4a] focus-visible:outline-[#c7dbff] disabled:opacity-60";
  // This line picks the variant specific classes based on the variant prop.
  const variantClasses = variant === "primary" ? primaryClasses : variant === "secondary" ? secondaryClasses : ghostClasses;
  // This line merges the base classes, chosen variant classes, and any caller supplied classes.
  const composedClasses = `${baseClasses} ${variantClasses} ${className}`.trim();
  // This line returns the rendered JSX for the button element.
  return (
    <button
      className={composedClasses}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <span className="animate-pulse text-sm">Loading...</span>
      ) : (
        children
      )}
    </button>
  );
};
