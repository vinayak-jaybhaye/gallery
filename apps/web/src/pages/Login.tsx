import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogle, loginWithEmailPassword } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { getErrorMessage } from "@/lib/utils";
import { Shield, Cloud, Smartphone } from "lucide-react";
import Logo from "@/components/Logo";

declare global {
  interface Window {
    google: any;
  }
}

const features = [
  {
    icon: Cloud,
    title: "Cloud Storage",
    description: "Your photos safely stored and accessible anywhere",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description: "End-to-end encryption for your peace of mind",
  },
  {
    icon: Smartphone,
    title: "Access Anywhere",
    description: "View and manage photos from any device",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
      const data = await loginWithGoogle(response.credential);
      login(data);

      navigate("/gallery");
    } catch (error) {
      setError(getErrorMessage(error, "Login failed. Please try again."));
    }
  }

  async function handleEmailPasswordLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await loginWithEmailPassword(email, password);
      login(data);
      navigate("/gallery");
    } catch (err) {
      setError(getErrorMessage(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-bg-app">
      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-primary via-accent-strong to-accent-primary" />

        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <Logo className="h-24" />
          </div>

          {/* Tagline */}
          <h1 className="text-4xl xl:text-5xl font-heading font-bold text-white leading-tight mb-6">
            Your memories,<br />
            beautifully organized
          </h1>
          <p className="text-lg text-white/80 mb-12 max-w-md">
            Store, organize, and relive your precious moments with a modern photo gallery built for you.
          </p>

          {/* Features */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-white/70 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden px-6 py-4 flex items-center gap-3">
          <Logo className="h-12 mt-4" />
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 sm:px-8 lg:px-12 xl:px-20">
          <div className="w-full max-w-md">
            {/* Welcome text */}
            <div className="mb-8 lg:mb-10">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary mb-2">
                Welcome back
              </h2>
              <p className="text-text-secondary">
                Sign in to continue to your gallery
              </p>
            </div>

            {/* Google Sign In - Primary option */}
            <div className="mb-6">
              <div id="google-button" className="flex justify-center [&>div]:w-full [&>div>div]:w-full" />
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-subtle" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-bg-app text-text-muted">or sign in with email</span>
              </div>
            </div>

            {/* Email Password Auth */}
            <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-raised border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-raised border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                />
              </div>

              {error && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
                  <p className="text-error text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent-primary text-text-inverse py-3 rounded-xl font-semibold hover:bg-accent-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="mt-8 text-center text-xs text-text-muted">
              By signing in, you agree to our{" "}
              <a href="#" className="text-accent-primary hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="text-accent-primary hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>

        {/* Bottom branding for mobile */}
        <div className="lg:hidden px-6 py-6 text-center border-t border-border-subtle">
          <p className="text-sm text-text-muted">
            Secure photo storage for your memories
          </p>
        </div>
      </div>
    </div>
  );
}