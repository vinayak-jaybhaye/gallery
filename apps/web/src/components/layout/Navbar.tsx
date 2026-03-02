import { Search, Plus, Settings, HelpCircle, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { useState, useRef, useEffect } from "react";

type NavbarProps = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  searchQuery: string;
  setSearchQuery: (searchQuery: string) => void;
};

export default function Navbar({ collapsed, setCollapsed, searchQuery, setSearchQuery }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-surface-raised  z-40 flex items-center justify-between px-4">
      {/* Left: Logo */}
      <div className="flex items-center justify-around w-64 gap-2">
        <Menu className="w-5 h-5 text-text-secondary lg:hidden" onClick={() => setCollapsed(!collapsed)} />
        <Logo className="h-12 mr-8" />
      </div>

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
      <div className="flex items-center gap-1">
        {/* Mobile Search */}
        <button className="sm:hidden p-2.5 rounded-full hover:bg-bg-muted transition-colors">
          <Search className="w-5 h-5 text-text-secondary" />
        </button>

        <button className="p-2.5 rounded-full hover:bg-bg-muted transition-colors" title="Create">
          <Plus className="w-5 h-5 text-text-secondary" />
        </button>

        <button className="p-2.5 rounded-full hover:bg-bg-muted transition-colors" title="Help">
          <HelpCircle className="w-5 h-5 text-text-secondary" />
        </button>

        <button
          onClick={() => navigate("/accountandsettings")}
          className="p-2.5 rounded-full hover:bg-bg-muted transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-text-secondary" />
        </button>

        {/* User Avatar */}
        <div className="relative ml-2" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-9 h-9 rounded-full bg-accent-primary text-text-inverse flex items-center justify-center text-sm font-bold uppercase cursor-pointer hover:ring-2 hover:ring-accent-primary/50 transition-all"
          >
            {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-surface-raised border border-border-subtle rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-border-subtle">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent-primary text-text-inverse flex items-center justify-center text-lg font-bold uppercase">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-bg-muted rounded-lg transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
