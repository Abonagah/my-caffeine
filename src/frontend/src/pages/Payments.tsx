import { createActor } from "@/backend";
import { PaymentMethod } from "@/backend";
import type { Customer, Invoice, Payment } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "نقدي",
  bankTransfer: "تحويل بنكي",
  instapay: "إنستاباي",
  check: "شيك",
  other: "أخرى",
};

const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  PaymentMethod.cash,
  PaymentMethod.bankTransfer,
  PaymentMethod.instapay,
  PaymentMethod.check,
  PaymentMethod.other,
];

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

/** Nanoseconds since epoch for the start of a given day. */
function startOfDay(date: Date): bigint {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return BigInt(d.getTime()) * 1_000_000n;
}

/** Nanoseconds since epoch for the start of the current month. */
function startOfMonth(date: Date): bigint {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return BigInt(d.getTime()) * 1_000_000n;
}

function usePayments() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.listPayments();
    },
    enabled: !!actor && !isFetching,
  });
}

function useCustomers() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.listCustomers();
    },
    enabled: !!actor && !isFetching,
  });
}

function useInvoices() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.listInvoices();
    },
    enabled: !!actor && !isFetching,
  });
}

function useCollectionsReport(start: bigint, end: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["collectionsReport", start.toString(), end.toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCollectionsReport(start, end);
    },
    enabled: !!actor && !isFetching,
  });
}

function StatCard({
  label,
  value,
  icon: Icon,
  dataOcid,
}: {
  label: string;
  value: string;
  icon: typeof Banknote;
  dataOcid: string;
}) {
  return (
    <Card data-ocid={dataOcid}>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="num font-display text-2xl font-bold leading-tight">
            {value}
          </span>
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
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

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  invoices: Invoice[];
}

function PaymentForm({
  open,
  onOpenChange,
  customers,
  invoices,
}: PaymentFormProps) {
  const queryClient = useQueryClient();
  const { actor, isFetching } = useActor(createActor);

  const [customerId, setCustomerId] = useState<string>("");
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.cash);

  const customerInvoices = useMemo(() => {
    const id = customerId ? BigInt(customerId) : null;
    return id ? invoices.filter((inv) => inv.customerId === id) : [];
  }, [customerId, invoices]);

  const addPayment = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const invId = invoiceId ? BigInt(invoiceId) : null;
      return actor.addPayment(
        BigInt(customerId),
        invId,
        Number(amount),
        method,
      );
    },
    onSuccess: () => {
      toast.success("تم تسجيل الدفعة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["collectionsReport"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onOpenChange(false);
      setCustomerId("");
      setInvoiceId("");
      setAmount("");
      setMethod(PaymentMethod.cash);
    },
    onError: () => {
      toast.error("تعذر تسجيل الدفعة، حاول مرة أخرى");
    },
  });

  const canSubmit =
    !!customerId &&
    !!amount &&
    Number(amount) > 0 &&
    !!actor &&
    !isFetching &&
    !addPayment.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) addPayment.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-ocid="payment_form_modal" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>تسجيل دفعة</DialogTitle>
          <DialogDescription>
            سجّل دفعة على حساب عميل أو على فاتورة محددة
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-customer">العميل</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger
                id="payment-customer"
                data-ocid="payment_form.customer_select"
                className="w-full"
              >
                <SelectValue placeholder="اختر العميل" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem
                    key={customer.id.toString()}
                    value={customer.id.toString()}
                  >
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-invoice">الفاتورة (اختياري)</Label>
            <Select
              value={invoiceId}
              onValueChange={setInvoiceId}
              disabled={!customerId}
            >
              <SelectTrigger
                id="payment-invoice"
                data-ocid="payment_form.invoice_select"
                className="w-full"
              >
                <SelectValue
                  placeholder={
                    customerId ? "اختر الفاتورة (اختياري)" : "اختر العميل أولاً"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {customerInvoices.map((invoice) => (
                  <SelectItem
                    key={invoice.id.toString()}
                    value={invoice.id.toString()}
                  >
                    فاتورة رقم {formatNumber(invoice.id)} —{" "}
                    {formatEGP(invoice.total)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-amount">المبلغ</Label>
            <Input
              id="payment-amount"
              data-ocid="payment_form.amount_input"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-method">طريقة الدفع</Label>
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as PaymentMethod)}
            >
              <SelectTrigger
                id="payment-method"
                data-ocid="payment_form.method_select"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-ocid="payment_form.cancel_button"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              data-ocid="payment_form.submit_button"
            >
              {addPayment.isPending ? "جارٍ الحفظ..." : "تسجيل الدفعة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PaymentsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  const { data: payments, isLoading, isError, refetch } = usePayments();
  const { data: customers } = useCustomers();
  const { data: invoices } = useInvoices();

  const now = new Date();
  const todayReport = useCollectionsReport(
    startOfDay(now),
    startOfDay(new Date(now.getTime() + 86_400_000)),
  );
  const monthReport = useCollectionsReport(
    startOfMonth(now),
    startOfDay(new Date(now.getTime() + 86_400_000)),
  );

  const customerName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of customers ?? []) {
      map.set(c.id.toString(), c.name);
    }
    return map;
  }, [customers]);

  const filteredPayments = useMemo(() => {
    const q = search.trim();
    return (payments ?? []).filter((payment) => {
      if (methodFilter !== "all" && payment.method !== methodFilter) {
        return false;
      }
      if (!q) return true;
      const name = customerName.get(payment.customerId.toString()) ?? "";
      const invoiceText = payment.invoiceId
        ? formatNumber(payment.invoiceId)
        : "";
      return (
        name.includes(q) ||
        invoiceText.includes(q) ||
        PAYMENT_METHOD_LABELS[payment.method].includes(q)
      );
    });
  }, [payments, search, methodFilter, customerName]);

  return (
    <div className="flex flex-col gap-6" data-ocid="payments_page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">المدفوعات</h1>
          <p className="text-sm text-muted-foreground">
            تسجيل ومتابعة مدفوعات العملاء والتحصيلات
          </p>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          data-ocid="payments.add_button"
        >
          <Plus />
          تسجيل دفعة
        </Button>
      </div>

      {/* Collections summary */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        data-ocid="payments_stats_section"
      >
        {todayReport.isLoading || monthReport.isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="تحصيلات اليوم"
              value={formatEGP(todayReport.data?.totalCollections ?? 0)}
              icon={CalendarDays}
              dataOcid="stat.today_collections"
            />
            <StatCard
              label="تحصيلات الشهر"
              value={formatEGP(monthReport.data?.totalCollections ?? 0)}
              icon={Banknote}
              dataOcid="stat.month_collections"
            />
          </>
        )}
      </section>

      {/* Payments list */}
      <Card data-ocid="payments_list_card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-4 text-primary" />
            سجل المدفوعات
          </CardTitle>
          <CardDescription>
            جميع المدفوعات المسجلة على حسابات العملاء والفواتير
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-ocid="payments.search_input"
                className="pr-9"
                placeholder="ابحث بالعميل أو رقم الفاتورة أو طريقة الدفع..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger
                data-ocid="payments.method_filter"
                className="w-full sm:w-48"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الطرق</SelectItem>
                {PAYMENT_METHOD_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isError ? (
            <div
              data-ocid="payments_error_state"
              className="flex flex-col items-center gap-4 py-12 text-center"
            >
              <AlertTriangle className="size-10 text-destructive" />
              <p className="text-muted-foreground">
                تعذر تحميل بيانات المدفوعات
              </p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                data-ocid="payments_retry_button"
              >
                إعادة المحاولة
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-3" data-ocid="payments_loading_state">
              {Array.from({ length: 4 }).map((_, _i) => (
                <Skeleton key="payments-skeleton" className="h-10 w-full" />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div
              data-ocid="payments_empty_state"
              className="flex flex-col items-center gap-2 py-12 text-center"
            >
              <Wallet className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {payments?.length
                  ? "لا توجد مدفوعات مطابقة لبحثك"
                  : "لا توجد مدفوعات مسجلة بعد"}
              </p>
              {!payments?.length && (
                <Button
                  variant="outline"
                  onClick={() => setFormOpen(true)}
                  data-ocid="payments.empty_add_button"
                >
                  <Plus />
                  تسجيل أول دفعة
                </Button>
              )}
            </div>
          ) : (
            <Table data-ocid="payments_table">
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>الفاتورة</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment, index) => (
                  <TableRow key={payment.id.toString()}>
                    <TableCell data-ocid={`payments.row.${index + 1}`}>
                      {formatDate(payment.createdAt)}
                    </TableCell>
                    <TableCell>
                      {customerName.get(payment.customerId.toString()) ??
                        `عميل رقم ${formatNumber(payment.customerId)}`}
                    </TableCell>
                    <TableCell>
                      {payment.invoiceId ? (
                        <span className="num">
                          #{formatNumber(payment.invoiceId)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {PAYMENT_METHOD_LABELS[payment.method]}
                      </Badge>
                    </TableCell>
                    <TableCell className="num text-right font-medium">
                      {formatEGP(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PaymentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        customers={customers ?? []}
        invoices={invoices ?? []}
      />
    </div>
  );
}
