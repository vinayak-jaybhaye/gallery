import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type LoaderSize = "sm" | "md" | "lg";

const spinnerSizeClass: Record<LoaderSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
};

const textSizeClass: Record<LoaderSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export type LoaderProps = {
  label?: string;
  size?: LoaderSize;
  icon?: ReactNode;
  fullScreen?: boolean;
  className?: string;
};

export default function Loader({
  label,
  size = "md",
  icon,
  fullScreen = false,
  className = "",
}: LoaderProps) {
  const content = (
    <div className={`flex flex-col items-center gap-4 ${className}`.trim()}>
      {icon}
      <div className={`inline-flex items-center gap-2 text-text-muted ${textSizeClass[size]}`}>
        <Loader2 className={`${spinnerSizeClass[size]} animate-spin`} />
        {label ? <span className="font-medium">{label}</span> : null}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-app">
        {content}
      </div>
    );
  }

  return content;
}