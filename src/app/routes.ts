import { createBrowserRouter } from "react-router";
import LoginPage from "./pages/LoginPage";
import CashierDashboard from "./pages/CashierDashboard";
import CashierWorkPage from "./pages/CashierWorkPage";
import CashierOrdersPage from "./pages/CashierOrdersPage";
import CashierAnalysesPage from "./pages/CashierAnalysesPage";
import SanMinimumPage from "./pages/SanMinimumPage";
import SanMinimumStatsPage from "./pages/SanMinimumStatsPage";
import LaborantDashboard from "./pages/LaborantDashboard";
import LabDirectorDashboard from "./pages/LabDirectorDashboard";
import LabDirectorAnalysesPage from "./pages/LabDirectorAnalysesPage";
import CompanyDirectorDashboard from "./pages/CompanyDirectorDashboard";
import AdminPanel from "./pages/AdminPanel";
import EmployeesPage from "./pages/EmployeesPage";
import DashboardLayout from "./layouts/DashboardLayout";
import AnalysisDetail from "./pages/AnalysisDetail";
import ClientResultPage from "./pages/ClientResultPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/results/:testId",
    Component: ClientResultPage,
  },
  {
    path: "/",
    Component: DashboardLayout,
    children: [
      {
        index: true,
        Component: CashierDashboard,
      },
      {
        path: "cashier/work",
        Component: CashierWorkPage,
      },
      {
        path: "cashier/orders",
        Component: CashierOrdersPage,
      },
      {
        path: "cashier/analyses",
        Component: CashierAnalysesPage,
      },
      {
        path: "cashier",
        Component: CashierDashboard,
      },
      {
        path: "san-minimum/stats",
        Component: SanMinimumStatsPage,
      },
      {
        path: "san-minimum",
        Component: SanMinimumPage,
      },
      {
        path: "laborant",
        Component: LaborantDashboard,
      },
      {
        path: "laborant/analysis/:id",
        Component: AnalysisDetail,
      },
      {
        path: "lab-director",
        Component: LabDirectorDashboard,
      },
      {
        path: "lab-director/analyses",
        Component: LabDirectorAnalysesPage,
      },
      {
        path: "lab-director/analysis/:id",
        Component: AnalysisDetail,
      },
      {
        path: "company-director",
        Component: CompanyDirectorDashboard,
      },
      {
        path: "admin",
        Component: AdminPanel,
      },
      {
        path: "admin/employees",
        Component: EmployeesPage,
      },
    ],
  },
]);