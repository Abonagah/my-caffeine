import { createActor } from "@/backend";
import type { Dashboard, Invoice, Payment, Product } from "@/backend";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEGP, formatNumber, toArabicDigits } from "@/lib/format";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Boxes,
  FileText,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

/** Fetch the dashboard summary from the backend. */
function useDashboard() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Dashboard>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getDashboard();
    },
    enabled: !!actor && !isFetching,
  });
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "نقدي",
  check: "شيك",
  instapay: "إنستاباي",
  bankTransfer: "تحويل بنكي",
  other: "أخرى",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "مدفوعة",
  unpaid: "غير مدفوعة",
  partial: "مدفوعة جزئياً",
};

const UNIT_LABELS: Record<string, string> = {
  unit: "وحدة",
  piece: "قطعة",
  carton: "كرتونة",
  kilo: "كيلو",
  gram: "جرام",
  other: "أخرى",
};

function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  return toArabicDigits(
    date.toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  dataOcid,
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  tone?: "default" | "success" | "warning" | "destructive";
  dataOcid: string;
}) {
  const toneClasses: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <Card data-ocid={dataOcid}>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="num font-display text-2xl font-bold leading-tight">
            {value}
          </span>
        </div>
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-32" />
        </div>
        <Skeleton className="size-11 rounded-xl" />
      </CardContent>
    </Card>
  );
}

function LowStockList({
  products,
  loading,
}: {
  products: Product[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3" data-ocid="low_stock_loading_state">
        {Array.from({ length: 3 }).map((_, _i) => (
          <Skeleton key="low-stock-skeleton" className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div
        data-ocid="low_stock_empty_state"
        className="flex flex-col items-center gap-2 py-8 text-center"
      >
        <Boxes className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          لا توجد منتجات منخفضة المخزون حالياً
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3" data-ocid="low_stock_list">
      {products.map((product, index) => (
        <li
          key={product.id.toString()}
          data-ocid={`low_stock.item.${index + 1}`}
          className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <AlertTriangle className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                المتبقي:{" "}
                <span className="num">
                  {formatNumber(product.quantity)} {UNIT_LABELS[product.unit]}
                </span>
              </p>
            </div>
          </div>
          <Badge variant="destructive" className="shrink-0">
            منخفض
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function RecentInvoicesTable({
  invoices,
  loading,
}: {
  invoices: Invoice[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3" data-ocid="recent_invoices_loading_state">
        {Array.from({ length: 4 }).map((_, _i) => (
          <Skeleton key="recent-invoices-skeleton" className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div
        data-ocid="recent_invoices_empty_state"
        className="flex flex-col items-center gap-2 py-8 text-center"
      >
        <FileText className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">لا توجد فواتير بعد</p>
      </div>
    );
  }

  return (
    <Table data-ocid="recent_invoices_table">
      <TableHeader>
        <TableRow>
          <TableHead>رقم الفاتورة</TableHead>
          <TableHead>التاريخ</TableHead>
          <TableHead className="text-right">الإجمالي</TableHead>
          <TableHead>الحالة</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice, index) => (
          <TableRow key={invoice.id.toString()}>
            <TableCell data-ocid={`recent_invoice.row.${index + 1}`}>
              <span className="num">#{formatNumber(invoice.id)}</span>
            </TableCell>
            <TableCell>{formatDate(invoice.createdAt)}</TableCell>
            <TableCell className="num text-right font-medium">
              {formatEGP(invoice.total)}
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  invoice.paymentStatus === "paid"
                    ? "secondary"
                    : invoice.paymentStatus === "partial"
                      ? "outline"
                      : "destructive"
                }
              >
                {PAYMENT_STATUS_LABELS[invoice.paymentStatus]}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RecentPaymentsTable({
  payments,
  loading,
}: {
  payments: Payment[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3" data-ocid="recent_payments_loading_state">
        {Array.from({ length: 4 }).map((_, _i) => (
          <Skeleton key="recent-payments-skeleton" className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div
        data-ocid="recent_payments_empty_state"
        className="flex flex-col items-center gap-2 py-8 text-center"
      >
        <Wallet className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">لا توجد مدفوعات بعد</p>
      </div>
    );
  }

  return (
    <Table data-ocid="recent_payments_table">
      <TableHeader>
        <TableRow>
          <TableHead>التاريخ</TableHead>
          <TableHead>طريقة الدفع</TableHead>
          <TableHead className="text-right">المبلغ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment, index) => (
          <TableRow key={payment.id.toString()}>
            <TableCell>{formatDate(payment.createdAt)}</TableCell>
            <TableCell data-ocid={`recent_payment.row.${index + 1}`}>
              {PAYMENT_METHOD_LABELS[payment.method]}
            </TableCell>
            <TableCell className="num text-right font-medium">
              {formatEGP(payment.amount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard();

  if (isError) {
    return (
      <div
        data-ocid="dashboard_error_state"
        className="flex flex-col items-center gap-4 py-16 text-center"
      >
        <AlertTriangle className="size-10 text-destructive" />
        <p className="text-muted-foreground">تعذر تحميل بيانات لوحة التحكم</p>
        <button
          type="button"
          onClick={() => refetch()}
          data-ocid="dashboard_retry_button"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-ocid="dashboard_page">
      <div>
        <h1 className="font-display text-2xl font-bold">لوحة التحكم</h1>
        <p className="text-sm text-muted-foreground">
          نظرة عامة على نشاط المنشأة ومؤشرات الأداء
        </p>
      </div>

      {/* Key metrics */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        data-ocid="dashboard_stats_section"
      >
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="مبيعات اليوم"
              value={formatEGP(data?.todaySales ?? 0)}
              icon={TrendingUp}
              tone="success"
              dataOcid="stat.today_sales"
            />
            <StatCard
              label="مبيعات الشهر"
              value={formatEGP(data?.monthSales ?? 0)}
              icon={ArrowUpRight}
              tone="default"
              dataOcid="stat.month_sales"
            />
            <StatCard
              label="تحصيلات اليوم"
              value={formatEGP(data?.todayCollections ?? 0)}
              icon={Banknote}
              tone="success"
              dataOcid="stat.today_collections"
            />
            <StatCard
              label="تحصيلات الشهر"
              value={formatEGP(data?.monthCollections ?? 0)}
              icon={ArrowDownLeft}
              tone="default"
              dataOcid="stat.month_collections"
            />
          </>
        )}
      </section>

      {/* Debts + low stock */}
      <section
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        data-ocid="dashboard_alerts_section"
      >
        <Card data-ocid="stat.total_debts" className="lg:col-span-1">
          <CardContent className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">
                إجمالي ديون العملاء
              </span>
              {isLoading ? (
                <Skeleton className="h-7 w-32" />
              ) : (
                <span className="num font-display text-2xl font-bold leading-tight text-destructive">
                  {formatEGP(data?.totalDebts ?? 0)}
                </span>
              )}
            </div>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" />
              منتجات منخفضة المخزون
            </CardTitle>
            <CardDescription>
              منتجات وصلت إلى حد الطلب الأدنى وتحتاج إلى إعادة توريد
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LowStockList
              products={data?.lowStockProducts ?? []}
              loading={isLoading}
            />
          </CardContent>
        </Card>
      </section>

      {/* Recent activity */}
      <section
        className="grid grid-cols-1 gap-4 xl:grid-cols-2"
        data-ocid="dashboard_activity_section"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              آخر الفواتير
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentInvoicesTable
              invoices={data?.recentInvoices ?? []}
              loading={isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4 text-primary" />
              آخر المدفوعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentPaymentsTable
              payments={data?.recentPayments ?? []}
              loading={isLoading}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
