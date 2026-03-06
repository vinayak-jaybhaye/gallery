import { useState } from "react";
import { PublicLinks, MySharedMedia } from "@/components/media";
import { useOutletContext } from "react-router-dom";
import type { LayoutContext } from "@/components/layout/AppLayout";

type Tab = "shared" | "public";

export default function Shares() {
  const [activeTab, setActiveTab] = useState<Tab>("shared");
  const outlet = useOutletContext<LayoutContext | undefined>();
  const searchQuery = outlet?.searchQuery ?? "";

  return (
    <div className="w-full bg-bg-app">
      {/* Top Bar */}
      <div className="sticky top-16 z-20 border-b border-border-subtle bg-surface-raised">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("shared")}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "shared"
                  ? "border-accent-primary text-accent-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
            >
              Shared Media
            </button>

            <button
              onClick={() => setActiveTab("public")}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "public"
                  ? "border-accent-primary text-accent-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
            >
              Public links
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {activeTab === "shared" && <MySharedMedia searchQuery={searchQuery} />}
        {activeTab === "public" && <PublicLinks searchQuery={searchQuery} />}
      </div>
    </div>
  );
}