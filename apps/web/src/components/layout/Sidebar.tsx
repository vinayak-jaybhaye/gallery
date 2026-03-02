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
];

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  return (
    <aside
      className={`
        fixed top-16 left-0 h-[calc(100vh-4rem)] bg-surface-raised border-r border-border-subtle z-30
        flex flex-col transition-all duration-300 ease-in-out overflow-hidden
        ${collapsed ? "w-16" : "w-64"}
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
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-full text-sm font-medium transition-colors ${collapsed ? "justify-center" : ""
                  } ${isActive
                    ? "bg-accent-soft text-accent-primary"
                    : "text-text-secondary hover:bg-bg-muted hover:text-text-primary"
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Divider */}
        <div className="my-3  mx-2 border-t border-border-subtle" />

        {/* Collections Label */}
        {!collapsed && (
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
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-colors ${collapsed ? "justify-center" : ""
                  } ${isActive
                    ? "bg-accent-soft text-accent-primary"
                    : "text-text-secondary hover:bg-bg-muted hover:text-text-primary"
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Storage - Fixed at bottom */}
      <div className="p-2 border-t border-border-subtle">
        <NavLink
          to="/storage"
          title="Storage"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-colors text-text-secondary hover:bg-bg-muted hover:text-text-primary ${collapsed ? "justify-center" : ""
            }`}
        >
          <Cloud className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span>Storage</span>
              <div className="mt-1">
                <div className="h-1 bg-bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-[5%] bg-accent-primary rounded-full" />
                </div>
                <p className="text-xs text-text-muted mt-1">112.2 MB of 2 TB used</p>
              </div>
            </div>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
