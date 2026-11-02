import { Link, useNavigate } from "react-router";
import {
  LayoutDashboard,
  LogOut,
  User,
} from "lucide-react";

import useAuth from "@/hooks/useAuth";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

const UserDropdown = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials =
    user?.full_name
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const isAdmin = user?.role?.toLowerCase() === "admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full outline-none ring-offset-2 transition focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          aria-label="Open user menu"
        >
          <Avatar className="h-9 w-9 cursor-pointer border border-slate-200">
            <AvatarImage
              src={user?.photoURL}
              alt={user?.full_name || "User"}
            />

            <AvatarFallback className="bg-slate-100 text-sm font-semibold text-slate-700">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 border-slate-200 bg-white p-1 shadow-lg"
      >
        {/* User Information */}
        <DropdownMenuLabel className="p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border border-slate-200">
              <AvatarImage
                src={user?.photoURL}
                alt={user?.full_name || "User"}
              />

              <AvatarFallback className="bg-slate-100 font-semibold text-slate-700">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user?.full_name}
              </p>

              <p className="mt-0.5 truncate text-xs text-slate-500">
                {user?.email}
              </p>

              <span className="mt-2 inline-flex rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium capitalize text-slate-600">
                {user?.role || "User"}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Dashboard / Console */}
        <DropdownMenuItem asChild>
          <Link
            to={isAdmin ? "/admin" : "/dashboard"}
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm"
          >
            <LayoutDashboard className="h-4 w-4 text-slate-500" />
            <span>{isAdmin ? "Admin Console" : "Dashboard"}</span>
          </Link>
        </DropdownMenuItem>

        {/* Profile (Only for taxpayer users) */}
        {!isAdmin && (
          <DropdownMenuItem asChild>
            <Link
              to="/dashboard/profile"
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm"
            >
              <User className="h-4 w-4 text-slate-500" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer rounded-md px-3 py-2 text-sm text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;