import React from "react";

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  isError?: boolean;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  helperText,
  isError = false,
  className = "",
  ...rest
}) => {
  const areaClasses = `w-full rounded-2xl border ${isError ? "border-[#f59fab] focus-visible:outline-[#f59fab]" : "border-sky-200/70 focus-visible:outline-[#b7d8ff]"} bg-white/80 backdrop-blur px-4 py-3 text-[var(--rt-foreground)] placeholder-[#7a809c] shadow-inner shadow-[rgba(167,186,218,0.35)] transition-all ${className}`.trim();
  return (
    <label className="block space-y-2 text-sm text-[#4b5375]">
      {label ? (
        <span className="font-medium text-[#2f2a4a]">{label}</span>
      ) : null}
      <textarea className={areaClasses} {...rest} />
      {helperText ? (
        <span className={`text-xs ${isError ? "text-[#e05671]" : "text-[#7a809c]"}`}>{helperText}</span>
      ) : null}
    </label>
  );
};
