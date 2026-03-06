import { useState } from "react";

type AvatarProps = {
  src?: string | null;
  email?: string | null;
  alt?: string;
  className?: string;
};

export default function Avatar({ src, email, alt = "User avatar", className }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const showImage = Boolean(src) && !imageError;
  const fallbackLetter = email?.trim().charAt(0).toUpperCase() || "U";

  if (showImage) {
    return (
      <img
        src={src ?? ""}
        alt={alt}
        onError={() => setImageError(true)}
        className={`h-8 w-8 md:h-9 md:w-9 rounded-full object-cover ${className ?? ""}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-primary text-sm font-bold uppercase text-text-inverse ${className ?? ""}`}
    >
      {fallbackLetter}
    </div>
  );
}