

// This line imports React because we define a functional component that uses JSX.
import React from "react";

// This line declares the props interface for the Input component while extending native input attributes.
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // This line defines an optional label string to display above the input field.
  label?: string;
  // This line defines optional helper text that appears below the input for hints or errors.
  helperText?: string;
  // This line defines an optional boolean that toggles the error styling.
  isError?: boolean;
}

// This line defines the Input functional component with default values applied to certain props.
export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  isError = false,
  className = "",
  ...rest
}) => {
  // This line builds the Tailwind classes for the base input appearance including conditional error styling.
  const inputClasses = `w-full rounded-2xl border ${isError ? "border-[#f59fab] focus-visible:outline-[#f59fab]" : "border-sky-200/70 focus-visible:outline-[#b7d8ff]"} bg-white/80 backdrop-blur px-4 py-3 text-[var(--rt-foreground)] placeholder-[#7a809c] shadow-inner shadow-[rgba(167,186,218,0.35)] transition-all ${className}`.trim();
  // This line returns the JSX structure containing the label, input element, and helper text.
  return (
    <label className="block space-y-2 text-sm text-[#4b5375]">
      {label ? (
        <span className="font-medium text-[#2f2a4a]">{label}</span>
      ) : null}
      <input className={inputClasses} {...rest} />
      {helperText ? (
        <span className={`text-xs ${isError ? "text-[#e05671]" : "text-[#7a809c]"}`}>{helperText}</span>
      ) : null}
    </label>
  );
};
