import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* 404 Icon */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-bg-muted flex items-center justify-center">
          <span className="text-4xl font-bold text-text-muted">404</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-heading font-bold text-text-primary mb-2">
          Page not found
        </h1>

        {/* Description */}
        <p className="text-text-secondary mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-bg-muted text-text-secondary text-sm font-medium hover:bg-surface-selected hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>

          <button
            onClick={() => navigate("/gallery")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-primary text-text-inverse text-sm font-medium hover:bg-accent-strong transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Gallery
          </button>
        </div>
      </div>
    </div>
  );
}