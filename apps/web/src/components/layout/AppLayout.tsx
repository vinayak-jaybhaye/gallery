import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Upload from "@/components/uploads/Upload";
import { useEffect, useState } from "react";

export type LayoutContext = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);

    updateIsMobile();
    mediaQuery.addEventListener("change", updateIsMobile);

    return () => mediaQuery.removeEventListener("change", updateIsMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileSidebarOpen(false);
    }
  }, [isMobile]);

  function handleMenuToggle() {
    if (isMobile) {
      setMobileSidebarOpen((prev) => !prev);
      return;
    }

    setCollapsed((prev) => !prev);
  }

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Top Navbar */}
      <Navbar
        onMenuToggle={handleMenuToggle}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <div className="relative pt-16">
        {/* Left Sidebar */}
        <Sidebar
          collapsed={collapsed}
          isMobile={isMobile}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content */}
        <main
          className={`min-h-[calc(100vh-4rem)] transition-[margin] duration-300 ease-in-out ${collapsed ? "lg:ml-16" : "lg:ml-64"
            }`}
        >
          <Outlet context={{ searchQuery, setSearchQuery } satisfies LayoutContext} />
        </main>
      </div>

      {/* Global Upload FAB */}
      <Upload />
    </div>
  );
}