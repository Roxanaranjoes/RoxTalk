// This line imports React so we can create a functional component that renders JSX.
import React from "react";

// This line declares the props interface accepted by the Toast component.
export interface ToastProps {
  // This line defines the textual message presented inside the toast.
  message: string;
  // This line defines the optional visual variant to adjust background color.
  variant?: "info" | "success" | "error";
  // This line defines the callback fired when the toast close button is pressed.
  onClose: () => void;
}

// This line defines the Toast functional component with default props applied via destructuring.
export const Toast: React.FC<ToastProps> = ({
  message,
  variant = "info",
  onClose
}) => {
  // This line maps variants to their corresponding Tailwind class strings.
  const variantClasses: Record<string, string> = {
    info: "bg-[#dbeafe]/90 border border-[#bfdbfe] text-[#1d3a63]",
    success: "bg-[#dcfce7]/95 border border-[#bbf7d0] text-[#1c3f32]",
    error: "bg-[#fee2e2]/95 border border-[#fecaca] text-[#742a2a]"
  };
  // This line returns the JSX markup for the toast element.
  return (
    <div className={`flex w-full items-center justify-between rounded-3xl px-6 py-4 backdrop-blur shadow-xl shadow-[rgba(147,170,204,0.35)] ${variantClasses[variant]}`}>
      <span className="text-sm font-medium">{message}</span>
      <button
        className={`text-sm font-semibold ${variant === "error" ? "text-[#742a2a]/80 hover:text-[#742a2a]" : "text-[#1d3a63]/70 hover:text-[#1d3a63]"}`}
        onClick={onClose}
      >
        Close
      </button>
    </div>
  );
};
