import { createActor } from "@/backend";
import type {
  CollectionsReport,
  CustomerStatement,
  DebtsReport,
  SalesReport,
} from "@/backend";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatEGP, formatNumber, toArabicDigits } from "@/lib/format";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  CalendarRange,
  FileText,
  Package,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

type PeriodType = "day" | "month" | "range";

/** Convert a Date to nanoseconds since epoch (bigint). */
function toNs(date: Date): bigint {
  return BigInt(date.getTime()) * 1_000_000n;
}

/** Start of the local day (00:00:00) for a given date. */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** End of the local day (23:59:59.999) for a given date. */
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Start of the current local month. */
function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format a Date as yyyy-mm-dd for native date inputs. */
function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse yyyy-mm-dd into a local Date. */
function fromInputDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
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

function SalesReportCard({
  report,
  loading,
}: {
  report: SalesReport | undefined;
  loading: boolean;
}) {
  return (
    <Card data-ocid="sales_report_card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          تقرير المبيعات
        </CardTitle>
        <CardDescription>
          إجمالي المبيعات وعدد الفواتير والكميات المباعة خلال الفترة
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="إجمالي المبيعات"
              value={formatEGP(report?.totalSales ?? 0)}
              icon={TrendingUp}
              tone="success"
              dataOcid="sales_report.total_sales"
            />
            <StatCard
              label="عدد الفواتير"
              value={formatNumber(report?.invoiceCount ?? 0n)}
              icon={FileText}
              dataOcid="sales_report.invoice_count"
            />
            <StatCard
              label="الكميات المباعة"
              value={formatNumber(report?.itemsSold ?? 0)}
              icon={Package}
              dataOcid="sales_report.items_sold"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CollectionsReportCard({
  report,
  loading,
}: {
  report: CollectionsReport | undefined;
  loading: boolean;
}) {
  return (
    <Card data-ocid="collections_report_card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="size-4 text-primary" />
          تقرير التحصيلات
        </CardTitle>
        <CardDescription>
          إجمالي المبالغ المحصلة وعدد عمليات الدفع خلال الفترة
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              label="إجمالي التحصيلات"
              value={formatEGP(report?.totalCollections ?? 0)}
              icon={Banknote}
              tone="success"
              dataOcid="collections_report.total_collections"
            />
            <StatCard
              label="عدد عمليات الدفع"
              value={formatNumber(report?.paymentCount ?? 0n)}
              icon={Wallet}
              dataOcid="collections_report.payment_count"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DebtsTable({
  customers,
  loading,
}: {
  customers: CustomerStatement[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3" data-ocid="debts_loading_state">
        {Array.from({ length: 3 }).map((_, _i) => (
          <Skeleton key="debts-skeleton" className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div
        data-ocid="debts_empty_state"
        className="flex flex-col items-center gap-2 py-8 text-center"
      >
        <Users className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          لا توجد ديون مستحقة على العملاء حالياً
        </p>
      </div>
    );
  }

  return (
    <Table data-ocid="debts_table">
      <TableHeader>
        <TableRow>
          <TableHead>العميل</TableHead>
          <TableHead>الهاتف</TableHead>
          <TableHead className="text-right">الرصيد المستحق</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((statement, index) => (
          <TableRow key={statement.customer.id.toString()}>
            <TableCell data-ocid={`debts.row.${index + 1}`}>
              <span className="font-medium">{statement.customer.name}</span>
            </TableCell>
            <TableCell>
              <span className="num">{statement.customer.phone}</span>
            </TableCell>
            <TableCell className="num text-right font-medium text-destructive">
              {formatEGP(statement.balance)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DebtsReportCard({
  report,
  loading,
}: {
  report: DebtsReport | undefined;
  loading: boolean;
}) {
  return (
    <Card data-ocid="debts_report_card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          تقرير الديون
        </CardTitle>
        <CardDescription>
          إجمالي الديون المستحقة وأرصدة العملاء المدينة
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-lg bg-destructive/10 px-4 py-3">
          <span className="text-sm text-muted-foreground">
            إجمالي ديون العملاء
          </span>
          {loading ? (
            <Skeleton className="h-7 w-32" />
          ) : (
            <span
              className="num font-display text-xl font-bold text-destructive"
              data-ocid="debts_report.total_debts"
            >
              {formatEGP(report?.totalDebts ?? 0)}
            </span>
          )}
        </div>
        <DebtsTable customers={report?.customers ?? []} loading={loading} />
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<PeriodType>("day");
  const [startDate, setStartDate] = useState<string>(() =>
    toInputDate(new Date()),
  );
  const [endDate, setEndDate] = useState<string>(() => toInputDate(new Date()));

  const now = useMemo(() => new Date(), []);

  const { start, end } = useMemo(() => {
    if (period === "day") {
      return { start: toNs(startOfDay(now)), end: toNs(now) };
    }
    if (period === "month") {
      return { start: toNs(startOfMonth(now)), end: toNs(now) };
    }
    const s = fromInputDate(startDate);
    const e = fromInputDate(endDate);
    return {
      start: toNs(startOfDay(s)),
      end: toNs(endOfDay(e)),
    };
  }, [period, startDate, endDate, now]);

  const { actor, isFetching } = useActor(createActor);

  const salesQuery = useQuery<SalesReport>({
    queryKey: ["salesReport", start.toString(), end.toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getSalesReport(start, end);
    },
    enabled: !!actor && !isFetching,
  });

  const collectionsQuery = useQuery<CollectionsReport>({
    queryKey: ["collectionsReport", start.toString(), end.toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCollectionsReport(start, end);
    },
    enabled: !!actor && !isFetching,
  });

  const debtsQuery = useQuery<DebtsReport>({
    queryKey: ["debtsReport"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getDebtsReport();
    },
    enabled: !!actor && !isFetching,
  });

  const loading = salesQuery.isLoading || collectionsQuery.isLoading;
  const isError =
    salesQuery.isError || collectionsQuery.isError || debtsQuery.isError;

  const periodLabel =
    period === "day"
      ? "اليوم"
      : period === "month"
        ? "الشهر الحالي"
        : "الفترة المحددة";

  if (isError) {
    return (
      <div
        data-ocid="reports_error_state"
        className="flex flex-col items-center gap-4 py-16 text-center"
      >
        <AlertTriangle className="size-10 text-destructive" />
        <p className="text-muted-foreground">تعذر تحميل بيانات التقارير</p>
        <button
          type="button"
          onClick={() => {
            salesQuery.refetch();
            collectionsQuery.refetch();
            debtsQuery.refetch();
          }}
          data-ocid="reports_retry_button"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="size-4" />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-ocid="reports_page">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold">التقارير</h1>
        <p className="text-sm text-muted-foreground">
          تقارير المبيعات والتحصيلات والديون حسب الفترة
        </p>
      </div>

      {/* Period selector */}
      <Card data-ocid="period_selector_card">
        <CardContent className="flex flex-col gap-4">
          <Tabs
            value={period}
            onValueChange={(v) => setPeriod(v as PeriodType)}
            data-ocid="period_tabs"
          >
            <TabsList>
              <TabsTrigger value="day" data-ocid="period_tab.day">
                اليوم
              </TabsTrigger>
              <TabsTrigger value="month" data-ocid="period_tab.month">
                الشهر
              </TabsTrigger>
              <TabsTrigger value="range" data-ocid="period_tab.range">
                نطاق تاريخ
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {period === "range" && (
            <div
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              data-ocid="date_range_inputs"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="reports-start-date"
                  className="text-sm font-medium text-muted-foreground"
                >
                  من تاريخ
                </label>
                <input
                  id="reports-start-date"
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-ocid="reports_start_date_input"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="reports-end-date"
                  className="text-sm font-medium text-muted-foreground"
                >
                  إلى تاريخ
                </label>
                <input
                  id="reports-end-date"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-ocid="reports_end_date_input"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarRange className="size-4" />
            <span>
              الفترة المعروضة:{" "}
              <span className="font-medium">{periodLabel}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Sales + collections */}
      <section
        className="grid grid-cols-1 gap-4 xl:grid-cols-2"
        data-ocid="reports_summary_section"
      >
        <SalesReportCard report={salesQuery.data} loading={loading} />
        <CollectionsReportCard
          report={collectionsQuery.data}
          loading={loading}
        />
      </section>

      {/* Debts */}
      <section data-ocid="reports_debts_section">
        <DebtsReportCard
          report={debtsQuery.data}
          loading={debtsQuery.isLoading}
        />
      </section>
    </div>
  );
}
