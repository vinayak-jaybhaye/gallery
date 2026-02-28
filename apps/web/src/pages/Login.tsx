import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogle } from "@/api/auth";
import { useAuth } from "@/hooks/useAuth";

declare global {
  interface Window {
    google: any;
  }
}

export default function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const googleInitialized = useRef(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/gallery", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!window.google || googleInitialized.current) return;

    googleInitialized.current = true;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    window.google.accounts.id.renderButton(
      document.getElementById("google-button"),
      {
        theme: "outline",
        size: "large",
      }
    );
  }, []);

  async function handleCredentialResponse(response: any) {
    try {
      setError(null);
      console.log(response.credential)
      const data = await loginWithGoogle(response.credential);
      console.log(data)
      login(data);

      navigate("/gallery");
    } catch (error) {
      setError("Login failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold">Gallery</h1>
        <p className="text-gray-500 mt-2">Sign in with Google</p>

        <div id="google-button" className="mt-6 flex justify-center" />

        {error && (
          <p className="text-red-500 text-sm mt-4">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}