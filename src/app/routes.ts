import { createBrowserRouter } from "react-router";
import LoginPage from "./pages/LoginPage";
import CashierDashboard from "./pages/CashierDashboard";
import CashierWorkPage from "./pages/CashierWorkPage";
import CashierAnalysesPage from "./pages/CashierAnalysesPage";
import LaborantDashboard from "./pages/LaborantDashboard";
import LabDirectorDashboard from "./pages/LabDirectorDashboard";
import CompanyDirectorDashboard from "./pages/CompanyDirectorDashboard";
import AdminPanel from "./pages/AdminPanel";
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
        path: "cashier/analyses",
        Component: CashierAnalysesPage,
      },
      {
        path: "cashier",
        Component: CashierDashboard,
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
        path: "company-director",
        Component: CompanyDirectorDashboard,
      },
      {
        path: "admin",
        Component: AdminPanel,
      },
    ],
  },
]);