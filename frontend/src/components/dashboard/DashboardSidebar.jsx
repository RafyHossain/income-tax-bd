import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  User,
  Wallet,
  Receipt,
  Calculator,
  TrendingUp,
  FileText,
  LogOut,
  X,
  House,
  ShieldCheck,
  Users,
  ListChecks,
  MapPin,
  Sliders,
  Percent,
  Coins,
  PiggyBank,
  Calendar,
  FilePlus,
  History,
  Banknote,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";

// User / Taxpayer navigation items
const taxpayerMenus = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Profile",
    path: "/dashboard/profile",
    icon: User,
  },
  {
    name: "Income",
    path: "/dashboard/income",
    icon: Wallet,
  },
  {
    name: "Expense",
    path: "/dashboard/expense",
    icon: Receipt,
  },
  {
    name: "Investment & Rebate",
    path: "/dashboard/tax-deductions",
    icon: TrendingUp,
  },
  {
    name: "Tax Credits",
    path: "/dashboard/tax-credits",
    icon: Coins,
  },
  {
    name: "Tax Calculation",
    path: "/dashboard/tax-calculation",
    icon: Calculator,
  },
  {
    name: "Calculation History",
    path: "/dashboard/tax-calculation-history",
    icon: FileText,
  },
];

const taxFilingMenus = [
  {
    name: "My Tax Returns",
    path: "/dashboard/tax-returns",
    icon: FileText,
  },
  {
    name: "Create Tax Return",
    path: "/dashboard/tax-returns/create",
    icon: FilePlus,
  },
  {
    name: "Filing History",
    path: "/dashboard/tax-returns/history",
    icon: History,
  },
  {
    name: "My Refund Claims",
    path: "/dashboard/refunds",
    icon: Banknote,
  },
];

// Admin Tax Configuration sub-items
const taxConfigSubItems = [
  {
    name: "Tax Rules / Slabs",
    path: "/admin/tax-rules",
    icon: Calculator,
  },
  {
    name: "Tax-Free Thresholds",
    path: "/admin/tax-thresholds",
    icon: Sliders,
  },
  {
    name: "Income Exemptions",
    path: "/admin/income-exemption-rules",
    icon: PiggyBank,
  },
  {
    name: "Tax Deduction Rules",
    path: "/admin/tax-deduction-rules",
    icon: ListChecks,
  },
  {
    name: "Tax Rebate Rules",
    path: "/admin/tax-rebate-rules",
    icon: Percent,
  },
  {
    name: "Minimum Tax Rules",
    path: "/admin/minimum-tax-rules",
    icon: MapPin,
  },
  {
    name: "Surcharge Rules",
    path: "/admin/surcharge-rules",
    icon: Coins,
  },
];

const DashboardSidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role?.toLowerCase() === "admin";
  const isAdminPath = location.pathname.startsWith("/admin");

  // Check if current route is within Tax Configuration group
  const isTaxConfigActive = taxConfigSubItems.some(
    (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
  );

  const [taxConfigOpen, setTaxConfigOpen] = useState(true);

  const handleLogout = () => {
    logout();
    setSidebarOpen(false);
    navigate("/", { replace: true });
  };

  const handleGoHome = () => {
    setSidebarOpen(false);
    navigate("/");
  };

  const renderNavLink = (menu) => {
    const Icon = menu.icon;

    return (
      <NavLink
        key={menu.path}
        to={menu.path}
        end={menu.path === "/dashboard" || menu.path === "/admin"}
        onClick={() => setSidebarOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
            isActive
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 font-semibold"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`
        }
      >
        <Icon className="h-4.5 w-4.5 shrink-0" />
        <span className="truncate">{menu.name}</span>
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close dashboard menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:sticky md:top-0 md:translate-x-0`}
      >
        {/* Sidebar Header */}
        <div className="shrink-0 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm shadow-xs shadow-emerald-600/30">
                IT
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-slate-900">
                  Income Tax BD
                </h2>
                <p className="text-[11px] font-medium text-slate-500">
                  {isAdmin ? "Admin Console" : "Taxpayer Portal"}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close dashboard menu"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* User Information */}
          {user && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 p-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-emerald-700">
                {user.full_name
                  ?.split(" ")
                  .map((name) => name[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-xs font-semibold text-slate-900">
                  {user.full_name}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      isAdmin ? "bg-indigo-500" : "bg-emerald-500"
                    }`}
                  />
                  <p className="truncate text-[10px] uppercase font-bold text-slate-500">
                    {user.role || "User"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {/* Strictly Admin Navigation when user is an admin */}
          {isAdmin ? (
            <div className="space-y-1">
              {/* 1. Dashboard */}
              <NavLink
                to="/admin"
                end
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <LayoutDashboard className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate">Dashboard</span>
              </NavLink>

              {/* 2. Users */}
              <NavLink
                to="/admin/users"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <Users className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate">Users</span>
              </NavLink>

              {/* 3. Tax Years */}
              <NavLink
                to="/admin/tax-years"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <Calendar className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate">Tax Years</span>
              </NavLink>

              {/* 4. Tax Configuration (Collapsible Group) */}
              <div>
                <button
                  type="button"
                  onClick={() => setTaxConfigOpen((prev) => !prev)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    isTaxConfigActive
                      ? "text-emerald-700 font-semibold bg-emerald-50/70"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sliders className="h-4.5 w-4.5 shrink-0" />
                    <span>Tax Configuration</span>
                  </div>
                  {taxConfigOpen ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </button>

                {taxConfigOpen && (
                  <div className="mt-1 ml-4 space-y-0.5 border-l-2 border-slate-100 pl-2">
                    {taxConfigSubItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      return (
                        <NavLink
                          key={subItem.path}
                          to={subItem.path}
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                              isActive
                                ? "bg-emerald-600 text-white font-semibold shadow-xs"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`
                          }
                        >
                          <SubIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{subItem.name}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 5. Tax Returns */}
              <NavLink
                to="/admin/tax-returns"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <FileText className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate">Tax Returns</span>
              </NavLink>

              {/* 6. Payments & Refunds */}
              <NavLink
                to="/admin/refunds"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <Banknote className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate">Payments & Refunds</span>
              </NavLink>
            </div>
          ) : (
            /* Taxpayer Navigation Section */
            <>
              <div>
                <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Tax Management
                </p>
                <div className="space-y-1">
                  {taxpayerMenus.map(renderNavLink)}
                </div>
              </div>

              <div>
                <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Tax Filing
                </p>
                <div className="space-y-1">
                  {taxFilingMenus.map(renderNavLink)}
                </div>
              </div>
            </>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="shrink-0 space-y-1 border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={handleGoHome}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <House className="h-4.5 w-4.5 shrink-0" />
            <span>Public Home</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
