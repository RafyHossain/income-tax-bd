import { Menu, Shield } from "lucide-react";
import { useLocation } from "react-router";
import UserDropdown from "@/components/common/UserDropdown";
import Breadcrumbs from "@/components/admin/Breadcrumbs";
import useAuth from "@/hooks/useAuth";

const DashboardHeader = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const { user } = useAuth();
  const isAdminPath = location.pathname.startsWith("/admin");
  const isAdmin = user?.role?.toLowerCase() === "admin";

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-xs">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 md:hidden"
            aria-label="Toggle Navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          {isAdminPath ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <Shield className="h-3 w-3" />
                Admin Console
              </span>
              <Breadcrumbs />
            </div>
          ) : (
            <h1 className="text-base font-semibold text-slate-900">
              Taxpayer Portal
            </h1>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
