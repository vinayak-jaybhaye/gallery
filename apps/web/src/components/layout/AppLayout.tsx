import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Upload from "@/components/uploads/Upload";
import { useState } from "react";

export type LayoutContext = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Top Navbar */}
      <Navbar collapsed={collapsed} setCollapsed={setCollapsed} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {/* Left Sidebar */}
      <Sidebar collapsed={collapsed} />

      {/* Main Content - offset by navbar height (h-16 = 4rem) and sidebar width */}
      <main
        className={`pt-16 min-h-screen transition-all duration-300 ease-in-out ${collapsed ? "ml-16" : "ml-64"
          }`}
      >
        <Outlet context={{ searchQuery, setSearchQuery } satisfies LayoutContext} />
      </main>

      {/* Global Upload FAB */}
      <Upload />
    </div>
  );
}
