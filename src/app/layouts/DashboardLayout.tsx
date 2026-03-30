import React, { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { 
  Menu, 
  X, 
  Microscope, 
  ClipboardCheck, 
  BarChart3, 
  ClipboardList,
  FlaskConical,
  Settings, 
  Bell,
  ChevronDown,
  LogOut,
  User,
  Sun,
  Moon,
  Activity
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Badge } from "../components/ui/badge";
import { useTheme } from "../components/ThemeProvider";
import { getPathForRole, getStoredUser, isAuthenticated, logoutApi, normalizeRoleKey } from "../../services/auth";
import { fetchRoles, roleCodeToLabel, roleReferenceLabel, type ReferenceItem } from "../../services/referenceDataApi";
import { toast } from "sonner";

type DashboardNavItem = {
  id: string;
  name: string;
  shortName: string;
  path: string;
  icon: LucideIcon;
  color: string;
};

/** Kassir: avvalo asosiy ishlar, keyin statistika (oldingi yagona band). */
const cashierNavItems: DashboardNavItem[] = [
  {
    id: "cashier-stats",
    name: "Statistika",
    shortName: "Hisobot",
    path: "/cashier",
    icon: BarChart3,
    color: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "cashier-work",
    name: "Asosiy ishlar",
    shortName: "Kassa",
    path: "/cashier/work",
    icon: ClipboardList,
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "cashier-analyses",
    name: "Tahlillar",
    shortName: "Tahlillar",
    path: "/cashier/analyses",
    icon: FlaskConical,
    color: "text-teal-600 dark:text-teal-400",
  },
];

const roles: DashboardNavItem[] = [
  { id: "laborant", name: "Laborant", shortName: "Laborant", path: "/laborant", icon: Microscope, color: "text-green-600 dark:text-green-400" },
  { id: "lab-director", name: "Laboratoriya Direktori", shortName: "Direktor", path: "/lab-director", icon: ClipboardCheck, color: "text-purple-600 dark:text-purple-400" },
  { id: "company-director", name: "Kompaniya Direktori", shortName: "Bosh Direktor", path: "/company-director", icon: BarChart3, color: "text-orange-600 dark:text-orange-400" },
  { id: "admin", name: "Administrator", shortName: "Admin", path: "/admin", icon: Settings, color: "text-red-600 dark:text-red-400" },
];

/** GET /roles `name` (normalize qilingan) → sidebar bandi — yo‘l va ikonka */
const ROLE_NAV_BY_CODE: Record<string, DashboardNavItem> = {
  LABORANT: roles[0],
  LABORATORY_ASSISTANT: roles[0],
  LABORATORY_DIRECTOR: roles[1],
  LAB_DIRECTOR: roles[1],
  COMPANY_DIRECTOR: roles[2],
  DIRECTOR: roles[2],
  ADMIN: roles[3],
  ADMINISTRATOR: roles[3],
};

function mergeNavLabelFromApi(base: DashboardNavItem, roleKey: string, apiRoles: ReferenceItem[]): DashboardNavItem {
  const api = apiRoles.find((r) => normalizeRoleKey(typeof r.name === "string" ? r.name : "") === roleKey);
  if (api) {
    const label = roleReferenceLabel(api);
    return { ...base, name: label, shortName: base.shortName };
  }
  return { ...base, name: roleCodeToLabel(roleKey) || base.name };
}

function resolveRolesForUser(role: string | undefined, apiRoles: ReferenceItem[]): DashboardNavItem[] {
  const allowedPath = getPathForRole(role);
  if (allowedPath.startsWith("/cashier")) {
    return cashierNavItems;
  }
  const key = normalizeRoleKey(role ?? "");
  const fromCode = key ? ROLE_NAV_BY_CODE[key] : undefined;
  const fromPath = roles.find((r) => r.path === allowedPath);
  const base = fromCode ?? fromPath;
  if (!base) {
    return [
      {
        id: "fallback",
        name: roleCodeToLabel(role ?? "") || "Boshqaruv",
        shortName: "",
        path: allowedPath,
        icon: Activity,
        color: "text-muted-foreground",
      },
    ];
  }
  if (key) {
    return [mergeNavLabelFromApi(base, key, apiRoles)];
  }
  return [base];
}

function navPathMatches(pathname: string, navPath: string): boolean {
  if (navPath === "/cashier") {
    return pathname === "/cashier" || pathname === "/";
  }
  if (navPath === "/cashier/work") {
    return pathname === "/cashier/work" || pathname.startsWith("/cashier/work/");
  }
  if (navPath === "/cashier/analyses") {
    return pathname === "/cashier/analyses" || pathname.startsWith("/cashier/analyses/");
  }
  return pathname === navPath || pathname.startsWith(`${navPath}/`);
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [apiRoles, setApiRoles] = useState<ReferenceItem[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const user = getStoredUser();

  useEffect(() => {
    let cancelled = false;
    void fetchRoles()
      .then((list) => {
        if (!cancelled) setApiRoles(list);
      })
      .catch(() => {
        if (!cancelled) setApiRoles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const allowedRoles = resolveRolesForUser(user?.role, apiRoles);
  const currentRoleLabel =
    allowedRoles.find((r) => navPathMatches(location.pathname, r.path))?.name ??
    allowedRoles[0]?.name ??
    "Boshqaruv";

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const handleRoleChange = (roleName: string, path: string) => {
    void roleName;
    navigate(path);
  };

  const isActive = (path: string) => navPathMatches(location.pathname, path);

  const displayName =
    user?.firstName || user?.lastName
      ? [user.firstName, user.lastName].filter(Boolean).join(" ")
      : user?.username ?? "Foydalanuvchi";

  const handleLogout = async () => {
    try {
      await logoutApi();
      toast.success("Tizimdan chiqildi");
      navigate("/login", { replace: true });
    } catch {
      toast.error("Chiqishda xatolik");
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background transition-colors duration-300">
      {/* Animated Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-72 bg-card border-r border-border flex flex-col shadow-xl dark:shadow-2xl dark:shadow-black/50"
          >
            {/* Logo Section */}
            <motion.div 
              className="p-6 border-b border-border"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3">
                <motion.div 
                  className="h-12 w-12 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Activity className="h-7 w-7 text-white" strokeWidth={2.5} />
                </motion.div>
                <div>
                  <h1 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-teal-600 dark:from-blue-400 dark:to-teal-400 bg-clip-text text-transparent">
                    MedLab Pro
                  </h1>
                  <p className="text-xs text-muted-foreground">Sanitariya va epidemiologiya</p>
                </div>
              </div>
            </motion.div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {allowedRoles.map((role, index) => {
                const Icon = role.icon;
                const active = isActive(role.path);
                return (
                  <motion.button
                    key={role.id}
                    onClick={() => handleRoleChange(role.name, role.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                      active
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "text-foreground hover:bg-muted"
                    }`}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.5} />
                    </motion.div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold">{role.name}</p>
                      <p className={`text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {role.shortName}
                      </p>
                    </div>
                    {active && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="h-2 w-2 bg-white rounded-full"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </nav>

            {/* User Profile Section */}
            <motion.div 
              className="p-4 border-t border-border"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-xl hover:bg-muted/80 transition-colors cursor-pointer">
                <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-md">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.role ? roleCodeToLabel(String(user.role)) : "—"}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <motion.header 
          className="h-20 bg-card/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-6 shadow-sm sticky top-0 z-10"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-xl hover:bg-muted"
              >
                <motion.div
                  animate={{ rotate: sidebarOpen ? 0 : 180 }}
                  transition={{ duration: 0.3 }}
                >
                  {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </motion.div>
              </Button>
            </motion.div>
            <div>
              <motion.h2 
                className="font-bold text-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {currentRoleLabel}
              </motion.h2>
              <p className="text-xs text-muted-foreground">Boshqaruv Paneli</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-xl hover:bg-muted relative overflow-hidden"
              >
                <motion.div
                  initial={false}
                  animate={{ rotate: theme === "dark" ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {theme === "dark" ? (
                    <Moon className="h-5 w-5 text-blue-400" />
                  ) : (
                    <Sun className="h-5 w-5 text-amber-500" />
                  )}
                </motion.div>
              </Button>
            </motion.div>

            {/* Notifications */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted relative">
                <Bell className="h-5 w-5" />
                <motion.div
                  className="absolute -top-1 -right-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  <Badge className="h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs rounded-full">
                    3
                  </Badge>
                </motion.div>
              </Button>
            </motion.div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost" className="flex items-center gap-2 rounded-xl hover:bg-muted">
                    <div className="h-9 w-9 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center shadow-md">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel>Mening akkauntim</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-lg cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profil sozlamalari
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Parametrlar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => void handleLogout()}
                  className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Chiqish
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}