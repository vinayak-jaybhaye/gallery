import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Image } from "lucide-react";
import { Loader } from "@/components/ui";

type Props = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <Loader
        fullScreen
        label="Loading..."
        icon={
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft animate-pulse">
            <Image className="h-8 w-8 text-accent-primary" />
          </div>
        }
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}