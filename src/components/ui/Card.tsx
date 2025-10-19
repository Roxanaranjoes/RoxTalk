// This line imports React for creating the card component.
import React from "react";

// This line defines the props accepted by the Card component.
export interface CardProps {
  // This line allows passing additional Tailwind classes.
  className?: string;
  // This line holds the card content to render.
  children: React.ReactNode;
}

// This line defines the Card component that renders a stylized container.
export const Card: React.FC<CardProps> = ({ className = "", children }) => {
  const baseClasses = `rounded-3xl border border-sky-200/60 bg-gradient-to-br from-white/95 via-[#f7f1ff]/90 to-[#e7f6ff]/85 backdrop-blur-2xl shadow-2xl shadow-[rgba(147,170,204,0.18)] p-8 text-[var(--rt-foreground)] ${className}`.trim();
  return <div className={baseClasses}>{children}</div>;
};
