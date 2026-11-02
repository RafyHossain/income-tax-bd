import { createBrowserRouter } from "react-router";
import MainLayout from "@/layouts/MainLayout";
import AuthLayout from "@/layouts/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout";
import Home from "@/pages/Home";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import Dashboard from "@/pages/dashboard/Dashboard";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "./ProtectedRoute";
import Income from "@/pages/income/Income";
import Expense from "@/pages/expense/Expense";
import Profile from "@/pages/profile/Profile";
import TaxCalculation from "@/pages/tax/TaxCalculation";
import TaxDeductions from "@/pages/tax/TaxDeductions";
import TaxCredits from "@/pages/tax/TaxCredits";
import TaxCalculationHistory from "@/pages/tax/TaxCalculationHistory";
import TaxCalculationDetails from "@/pages/tax/TaxCalculationDetails";
import TaxReturnsList from "@/pages/tax-returns/TaxReturnsList";
import CreateTaxReturn from "@/pages/tax-returns/CreateTaxReturn";
import TaxReturnDetails from "@/pages/tax-returns/TaxReturnDetails";
import TaxReturnHistory from "@/pages/tax-returns/TaxReturnHistory";
import MyRefunds from "@/pages/tax-returns/MyRefunds";
import TaxPaymentPlaceholder from "@/pages/tax-returns/TaxPaymentPlaceholder";
import AdminRoute from "./AdminRoute";

// Admin Module Pages (Eight Tax Rule Modules + Dashboard + Users + Refunds)
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminTaxYears from "@/pages/admin/AdminTaxYears";
import AdminTaxRules from "@/pages/admin/AdminTaxRules";
import AdminTaxThresholds from "@/pages/admin/AdminTaxThresholds";
import AdminMinimumTaxRules from "@/pages/admin/AdminMinimumTaxRules";
import AdminIncomeExemptionRules from "@/pages/admin/AdminIncomeExemptionRules";
import AdminTaxDeductionRules from "@/pages/admin/AdminTaxDeductionRules";
import AdminTaxRebateRules from "@/pages/admin/AdminTaxRebateRules";
import AdminSurchargeRules from "@/pages/admin/AdminSurchargeRules";
import AdminRefunds from "@/pages/admin/AdminRefunds";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminTaxCalculations from "@/pages/admin/AdminTaxCalculations";
import AdminTaxReturns from "@/pages/admin/AdminTaxReturns";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <Home />,
      },
    ],
  },

  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
    ],
  },

  {
    path: "/admin",
    element: (
      <AdminRoute>
        <DashboardLayout />
      </AdminRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: "tax-years",
        element: <AdminTaxYears />,
      },
      {
        path: "tax-rules",
        element: <AdminTaxRules />,
      },
      {
        path: "tax-thresholds",
        element: <AdminTaxThresholds />,
      },
      {
        path: "minimum-tax-rules",
        element: <AdminMinimumTaxRules />,
      },
      {
        path: "income-exemption-rules",
        element: <AdminIncomeExemptionRules />,
      },
      {
        path: "salary-exemption-rules",
        element: <AdminIncomeExemptionRules />,
      },
      {
        path: "tax-deduction-rules",
        element: <AdminTaxDeductionRules />,
      },
      {
        path: "tax-rebate-rules",
        element: <AdminTaxRebateRules />,
      },
      {
        path: "surcharge-rules",
        element: <AdminSurchargeRules />,
      },
      {
        path: "users",
        element: <AdminUsers />,
      },
      {
        path: "refunds",
        element: <AdminRefunds />,
      },
      {
        path: "payments-refunds",
        element: <AdminRefunds />,
      },
      {
        path: "tax-calculations",
        element: <AdminTaxCalculations />,
      },
      {
        path: "tax-returns",
        element: <AdminTaxReturns />,
      },
    ],
  },

  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "income",
        element: <Income />,
      },
      {
        path: "expense",
        element: <Expense />,
      },
      {
        path: "tax-deductions",
        element: <TaxDeductions />,
      },
      {
        path: "tax-credits",
        element: <TaxCredits />,
      },
      {
        path: "tax-calculation",
        element: <TaxCalculation />,
      },
      {
        path: "tax-calculation-history",
        element: <TaxCalculationHistory />,
      },
      {
        path: "tax-calculation-history/:id",
        element: <TaxCalculationDetails />,
      },
      {
        path: "tax-returns",
        element: <TaxReturnsList />,
      },
      {
        path: "tax-returns/create",
        element: <CreateTaxReturn />,
      },
      {
        path: "tax-returns/history",
        element: <TaxReturnHistory />,
      },
      {
        path: "tax-returns/:id",
        element: <TaxReturnDetails />,
      },
      {
        path: "tax-returns/:id/payment",
        element: <TaxPaymentPlaceholder />,
      },
      {
        path: "tax-returns/payment",
        element: <TaxPaymentPlaceholder />,
      },
      {
        path: "refunds",
        element: <MyRefunds />,
      },
    ],
  },
]);

export default router;
