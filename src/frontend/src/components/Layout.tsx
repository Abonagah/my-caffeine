import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/customers", label: "العملاء", icon: Users },
  { to: "/products", label: "المنتجات", icon: Package },
  { to: "/invoices", label: "المبيعات والفواتير", icon: FileText },
  { to: "/payments", label: "المدفوعات", icon: Wallet },
  { to: "/inventory", label: "المخزون", icon: Boxes },
  { to: "/reports", label: "التقارير", icon: BarChart3 },
  { to: "/settings", label: "الإعدادات", icon: Settings },
] as const;

function AppSidebar() {
  const { pathname } = useLocation();

  return (
    <Sidebar side="right" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="size-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-bold">إمداد</span>
            <span className="text-xs text-muted-foreground">
              للمستلزمات الورقية
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>الأقسام</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.to === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      data-ocid={`nav.${item.to.replace("/", "") || "home"}`}
                    >
                      <Link to={item.to}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <LogoutButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function LogoutButton() {
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    clear();
    queryClient.clear();
  };

  return (
    <SidebarMenuButton
      asChild
      data-ocid="logout_button"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      <button type="button" onClick={handleLogout}>
        <LogOut />
        <span>تسجيل الخروج</span>
      </button>
    </SidebarMenuButton>
  );
}

export function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4">
          <SidebarTrigger />
          <span className="font-display text-sm font-semibold text-muted-foreground">
            إمداد للمستلزمات الورقية
          </span>
        </header>
        <main className="flex-1 bg-background p-4 md:p-6">
          <Outlet />
        </main>
        <footer className="border-t bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} إمداد للمستلزمات الورقية
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
