import { Search, Settings, Menu, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import Avatar from "@/components/Avatar";
import { useState, useRef, useEffect } from "react";

type NavbarProps = {
  onMenuToggle: () => void;
  searchQuery: string;
  setSearchQuery: (searchQuery: string) => void;
};

export default function Navbar({ onMenuToggle, searchQuery, setSearchQuery }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showMobileSearch) return;
    mobileSearchInputRef.current?.focus();
  }, [showMobileSearch]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function handleGoToSettings() {
    setShowUserMenu(false);
    navigate("/accountandsettings");
  }

  function handleGoToGallery() {
    navigate("/gallery/");
  }

  function handleOpenMobileSearch() {
    setShowMobileSearch(true);
    setShowUserMenu(false);
  }

  function handleCloseMobileSearch() {
    setShowMobileSearch(false);
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-16 min-w-0 items-center justify-between bg-surface-raised px-4">
      {/* Left: Logo */}
      <div className="flex shrink-0 items-center gap-2 lg:w-64">
        <button
          data-sidebar-toggle="true"
          aria-label="Toggle sidebar"
          className="rounded-full p-2.5 hover:bg-bg-muted transition-colors"
          onClick={onMenuToggle}
        >
          <Menu className="w-5 h-5 text-text-secondary" />
        </button>
        <button
          type="button"
          onClick={handleGoToGallery}
          aria-label="Go to gallery"
          className={`rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${showMobileSearch ? "hidden sm:block" : ""}`}
        >
          <Logo className="h-12" />
        </button>
      </div>

      {/* Mobile Search Bar */}
      {showMobileSearch && (
        <div className="mx-2 min-w-0 flex-1 sm:hidden">
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              ref={mobileSearchInputRef}
              type="text"
              placeholder="Search your photos and albums"
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
              className="w-full min-w-0 max-w-full rounded-full bg-bg-muted py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted transition-all focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            />
          </div>
        </div>
      )}

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-2xl mx-4 hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            placeholder="Search your photos and albums"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            className="w-full pl-10 pr-4 py-2.5 bg-bg-muted rounded-full text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Mobile Search */}
        {!showMobileSearch ? (
          <button
            onClick={handleOpenMobileSearch}
            className="sm:hidden p-2.5 rounded-full hover:bg-bg-muted transition-colors"
            aria-label="Open search"
          >
            <Search className="w-5 h-5 text-text-secondary" />
          </button>
        ) : (
          <button
            onClick={handleCloseMobileSearch}
            className="sm:hidden p-2.5 rounded-full hover:bg-bg-muted transition-colors"
            aria-label="Close search"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        )}

        {/* User Avatar */}
        <div className={`relative ml-2 ${showMobileSearch ? "hidden sm:block" : ""}`}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="rounded-full hover:ring-2 hover:ring-accent-primary/50 transition-all"
          >
            <Avatar
              src={user?.avatarUrl}
              email={user?.email}
              alt="User Avatar"
            />
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <>
              <div
                aria-label="Close user menu"
                className="fixed inset-0 top-16 z-30 bg-transparent"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowUserMenu(false);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu(false);
                }}
              />
              <div className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-xl border border-border-subtle bg-surface-raised shadow-lg">
                <div className="border-b border-border-subtle p-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={user?.avatarUrl}
                      email={user?.email}
                      alt="User Avatar"
                      className="h-12 w-12 text-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {user?.email?.split("@")[0] || "User"}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button
                    onClick={handleGoToSettings}
                    className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-text-secondary hover:bg-bg-muted rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-bg-muted rounded-lg transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}