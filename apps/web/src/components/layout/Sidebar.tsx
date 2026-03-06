import { NavLink } from "react-router-dom";
import {
  Image,
  FolderOpen,
  Star,
  PlayCircle,
  Trash2,
  Upload,
  Cloud,
} from "lucide-react";
import Logo from "../Logo";

const mainNavItems = [
  { path: "/gallery", icon: Image, label: "Photos" },
];

const collectionItems = [
  { path: "/albums", icon: FolderOpen, label: "Albums" },
  { path: "/favorites", icon: Star, label: "Favorites" },
  { path: "/videos", icon: PlayCircle, label: "Videos" },
  { path: "/images", icon: Image, label: "Images" },
  { path: "/trash", icon: Trash2, label: "Trash" },
  { path: "/uploads", icon: Upload, label: "Uploads" },
  { path: "/shared", icon: Cloud, label: "Shared With Me" },
  { path: "/my-shares", icon: Cloud, label: "My Shares" },
];

interface SidebarProps {
  collapsed?: boolean;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  collapsed = false,
  isMobile = false,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const isCollapsed = collapsed && !isMobile;

  function handleNavigate() {
    if (isMobile) {
      onCloseMobile?.();
    }
  }

  return (
    <>
      {isMobile && mobileOpen && (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 top-16 z-25 bg-black/40 lg:hidden"
          onClick={(e) => {
            e.stopPropagation();
            onCloseMobile?.();
          }}
        />
      )}
      <aside
        className={`
          fixed top-16 bottom-0 left-0 bg-surface-raised border-r border-border-subtle z-30
          flex flex-col transition-all duration-300 ease-in-out overflow-hidden
          w-64 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 ${isCollapsed ? "lg:w-16" : "lg:w-64"}
        `}
      >
        {/* Navigation */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto">
          {/* Main Nav */}
          <ul className="space-y-1">
            {mainNavItems.map(({ path, icon: Icon, label }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  title={label}
                  onClick={handleNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-full text-[15px] font-medium transition-colors ${isCollapsed ? "justify-center" : ""
                    } ${isActive
                      ? "bg-accent-soft text-accent-primary"
                      : "text-text-secondary hover:bg-bg-muted hover:text-text-primary"
                    }`
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span>{label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Divider */}
          <div className="my-3  mx-2 border-t border-border-subtle" />

          {/* Collections Label */}
          {!isCollapsed && (
            <p className="px-3 py-2 text-xs font-medium text-text-muted uppercase tracking-wider">
              Collections
            </p>
          )}

          {/* Collection Items */}
          <ul className="space-y-1">
            {collectionItems.map(({ path, icon: Icon, label }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  title={label}
                  onClick={handleNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-full text-[15px] font-medium transition-colors ${isCollapsed ? "justify-center" : ""
                    } ${isActive
                      ? "bg-accent-soft text-accent-primary"
                      : "text-text-secondary hover:bg-bg-muted hover:text-text-primary"
                    }`
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logo - Fixed at bottom */}
        <Logo className={`${collapsed && "hidden"}`} />
      </aside>
    </>
  );
}