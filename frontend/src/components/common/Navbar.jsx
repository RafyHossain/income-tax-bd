import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { LogOut, Menu, X } from "lucide-react";

import Logo from "./Logo";
import NavItem from "./NavItem";
import UserDropdown from "./UserDropdown";

import useAuth from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden flex-1 justify-center md:flex">
          <div className="flex items-center gap-8">
            <NavItem to="/">Home</NavItem>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              How It Works
            </a>
            {!isAdmin && (
              <NavItem to="/dashboard/tax-calculation">Tax Calculation</NavItem>
            )}
            {user && (
              <NavItem to={isAdmin ? "/admin" : "/dashboard"}>
                {isAdmin ? "Admin Console" : "Dashboard"}
              </NavItem>
            )}
          </div>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <UserDropdown />

              <Button
                variant="outline"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link to="/login">Sign In</Link>
              </Button>

              <Button asChild>
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-100 bg-white p-4 space-y-3 md:hidden">
          <div className="flex flex-col space-y-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Home
            </Link>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              How It Works
            </a>
            {!isAdmin && (
              <Link
                to="/dashboard/tax-calculation"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                Tax Calculation
              </Link>
            )}
            {user && (
              <Link
                to={isAdmin ? "/admin" : "/dashboard"}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                {isAdmin ? "Admin Console" : "Dashboard"}
              </Link>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3">
            {user ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 truncate">
                  {user.full_name}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" asChild onClick={() => setMobileMenuOpen(false)}>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button className="flex-1" asChild onClick={() => setMobileMenuOpen(false)}>
                  <Link to="/register">Register</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;