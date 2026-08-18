import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import { useIsAdmin } from "@/hooks/useQueries";
import CustomersPage from "@/pages/Customers";
import DashboardPage from "@/pages/Dashboard";
import InventoryPage from "@/pages/Inventory";
import InvoicesPage from "@/pages/Invoices";
import LoginPage from "@/pages/Login";
import PaymentsPage from "@/pages/Payments";
import ProductsPage from "@/pages/Products";
import ReportsPage from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

/**
 * Wraps the app shell (sidebar + header + footer) around protected routes.
 * Redirects unauthenticated users to the login page.
 */
function ProtectedLayout() {
  const { isAuthenticated, isInitializing } = useInternetIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, isInitializing, navigate]);

  if (isInitializing || !isAuthenticated) {
    return null;
  }

  return <Layout />;
}

/**
 * Admin-only gate for the settings route. Non-admin users are redirected
 * back to the dashboard.
 */
function AdminGate() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAdmin === false) {
      navigate({ to: "/" });
    }
  }, [isLoading, isAdmin, navigate]);

  if (isLoading || isAdmin !== true) {
    return null;
  }

  return <SettingsPage />;
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: ProtectedLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/",
  component: DashboardPage,
});

const customersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/customers",
  component: CustomersPage,
});

const productsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/products",
  component: ProductsPage,
});

const invoicesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/invoices",
  component: InvoicesPage,
});

const paymentsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/payments",
  component: PaymentsPage,
});

const inventoryRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/inventory",
  component: InventoryPage,
});

const reportsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/reports",
  component: ReportsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/settings",
  component: AdminGate,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    indexRoute,
    customersRoute,
    productsRoute,
    invoicesRoute,
    paymentsRoute,
    inventoryRoute,
    reportsRoute,
    settingsRoute,
  ]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  );
}
