import { createActor } from "@/backend";
import type {
  Customer,
  Invoice,
  InvoiceItem,
  PaymentStatus,
  Product,
} from "@/backend";
import { MovementType } from "@/backend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEGP, formatNumber, toArabicDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Loader2,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Backend query hooks                                                 */
/* ------------------------------------------------------------------ */

function useInvoices() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listInvoices();
    },
    enabled: !!actor && !isFetching,
  });
}

function useCustomers() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listCustomers();
    },
    enabled: !!actor && !isFetching,
  });
}

function useProducts() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

function useSettings() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "مدفوعة",
  partial: "جزئية",
  unpaid: "غير مدفوعة",
};

function statusVariant(status: PaymentStatus) {
  if (status === "paid") return "default" as const;
  if (status === "partial") return "secondary" as const;
  return "destructive" as const;
}

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Form item model                                                     */
/* ------------------------------------------------------------------ */

interface FormItem {
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
}

function emptyItem(): FormItem {
  return { productId: "", productName: "", quantity: "", unitPrice: "" };
}

function itemLineTotal(item: FormItem): number {
  const qty = Number.parseFloat(item.quantity);
  const price = Number.parseFloat(item.unitPrice);
  if (Number.isNaN(qty) || Number.isNaN(price)) return 0;
  return round2(qty * price);
}

function invoiceToFormItems(invoice: Invoice): FormItem[] {
  if (invoice.items.length === 0) return [emptyItem()];
  return invoice.items.map((it) => ({
    productId: String(it.productId),
    productName: it.productName,
    quantity: String(it.quantity),
    unitPrice: String(it.unitPrice),
  }));
}

/* ------------------------------------------------------------------ */
/* Invoice form dialog                                                 */
/* ------------------------------------------------------------------ */

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  customers: Customer[];
  products: Product[];
  defaultTaxRate: number;
  onSubmit: (payload: {
    customerId: bigint;
    items: InvoiceItem[];
    discount: number;
    tax: number;
  }) => Promise<void>;
}

function InvoiceFormDialog({
  open,
  onOpenChange,
  invoice,
  customers,
  products,
  defaultTaxRate,
  onSubmit,
}: InvoiceFormDialogProps) {
  const isEdit = invoice !== null;
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<FormItem[]>([emptyItem()]);
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState(String(defaultTaxRate || 0));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (invoice) {
      setCustomerId(String(invoice.customerId));
      setItems(invoiceToFormItems(invoice));
      setDiscount(String(invoice.discount));
      setTax(String(invoice.tax));
    } else {
      setCustomerId("");
      setItems([emptyItem()]);
      setDiscount("0");
      setTax(String(defaultTaxRate || 0));
    }
  }, [open, invoice, defaultTaxRate]);

  const subtotal = useMemo(
    () => round2(items.reduce((sum, it) => sum + itemLineTotal(it), 0)),
    [items],
  );
  const discountNum = Number.parseFloat(discount) || 0;
  const taxRate = Number.parseFloat(tax) || 0;
  const taxAmount = round2((subtotal * taxRate) / 100);
  const total = round2(subtotal - discountNum + taxAmount);

  const activeProducts = products.filter((p) => p.isActive);

  function updateItem(index: number, patch: Partial<FormItem>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );
  }

  function selectProduct(index: number, productId: string) {
    const product = products.find((p) => String(p.id) === productId);
    updateItem(index, {
      productId,
      productName: product ? product.name : "",
      unitPrice: product ? String(product.salePrice) : "",
    });
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) =>
      prev.length === 1 ? [emptyItem()] : prev.filter((_, i) => i !== index),
    );
  }

  const validItems = items.filter(
    (it) => it.productId && Number.parseFloat(it.quantity) > 0,
  );

  async function handleSubmit() {
    if (!customerId) {
      toast.error("اختر العميل أولًا");
      return;
    }
    if (validItems.length === 0) {
      toast.error("أضف بندًا واحدًا على الأقل بكمية صحيحة");
      return;
    }
    const payloadItems: InvoiceItem[] = validItems.map((it) => ({
      productId: BigInt(it.productId),
      productName: it.productName,
      quantity: Number.parseFloat(it.quantity),
      unitPrice: Number.parseFloat(it.unitPrice),
      lineTotal: itemLineTotal(it),
    }));
    setSubmitting(true);
    try {
      await onSubmit({
        customerId: BigInt(customerId),
        items: payloadItems,
        discount: discountNum,
        tax: taxRate,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "تعديل الفاتورة" : "إنشاء فاتورة جديدة"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "عدّل بيانات الفاتورة وسيتم تحديث المخزون وحساب العميل تلقائيًا."
              : "اختر العميل وأضف بنود المنتجات وسيتم حساب الإجمالي تلقائيًا."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="invoice-customer">العميل</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger
                id="invoice-customer"
                className="w-full"
                data-ocid="invoice.customer_select"
              >
                <SelectValue placeholder="اختر العميل" />
              </SelectTrigger>
              <SelectContent>
                {customers
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <SelectItem key={String(c.id)} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>بنود الفاتورة</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                data-ocid="invoice.add_item_button"
              >
                <Plus /> إضافة بند
              </Button>
            </div>

            <div className="grid gap-3">
              {items.map((item, index) => {
                const product = products.find(
                  (p) => String(p.id) === item.productId,
                );
                const stock = product ? product.quantity : 0;
                return (
                  <div
                    key={item.productId || `item-${index}`}
                    className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end"
                    data-ocid={`invoice.item.${index + 1}`}
                  >
                    <div className="grid gap-1.5">
                      <Label className="text-xs">المنتج</Label>
                      <Select
                        value={item.productId || undefined}
                        onValueChange={(v) => selectProduct(index, v)}
                      >
                        <SelectTrigger
                          className="w-full"
                          data-ocid={`invoice.item.${index + 1}.product_select`}
                        >
                          <SelectValue placeholder="اختر المنتج" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeProducts.map((p) => (
                            <SelectItem key={String(p.id)} value={String(p.id)}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {product && (
                        <p className="text-xs text-muted-foreground">
                          المتاح: {formatNumber(stock)} · السعر:{" "}
                          {formatEGP(product.salePrice)}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">الكمية</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, { quantity: e.target.value })
                        }
                        className="w-24"
                        data-ocid={`invoice.item.${index + 1}.quantity_input`}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">سعر الوحدة</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(index, { unitPrice: e.target.value })
                        }
                        className="w-28"
                        data-ocid={`invoice.item.${index + 1}.price_input`}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">الإجمالي</Label>
                      <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm">
                        <span className="num">
                          {formatNumber(itemLineTotal(item))}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      aria-label="حذف البند"
                      data-ocid={`invoice.item.${index + 1}.remove_button`}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="invoice-discount">الخصم (ج.م)</Label>
              <Input
                id="invoice-discount"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                data-ocid="invoice.discount_input"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="invoice-tax">نسبة الضريبة (٪)</Label>
              <Input
                id="invoice-tax"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                data-ocid="invoice.tax_input"
              />
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 p-4 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">الإجمالي الفرعي</span>
              <span className="num font-medium">{formatEGP(subtotal)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">الخصم</span>
              <span className="num font-medium">
                - {formatEGP(discountNum)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">الضريبة</span>
              <span className="num font-medium">+ {formatEGP(taxAmount)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t pt-2 font-display text-base font-bold">
              <span>الصافي</span>
              <span className="num">{formatEGP(total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-ocid="invoice.cancel_button"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            data-ocid="invoice.submit_button"
          >
            {submitting && <Loader2 className="animate-spin" />}
            {isEdit ? "حفظ التعديلات" : "إنشاء الفاتورة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Printable invoice                                                   */
/* ------------------------------------------------------------------ */

interface PrintableInvoiceProps {
  invoice: Invoice;
  customer: Customer | undefined;
  companyName: string;
}

function PrintableInvoice({
  invoice,
  customer,
  companyName,
}: PrintableInvoiceProps) {
  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-black">
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold">
            {companyName || "إمداد للمستلزمات الورقية"}
          </h1>
          <p className="text-sm">فاتورة بيع</p>
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold">
            رقم الفاتورة: {formatNumber(invoice.id)}
          </p>
          <p className="text-sm">{formatDateTime(invoice.createdAt)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-semibold">العميل</p>
          <p>{customer ? customer.name : "عميل محذوف"}</p>
          {customer?.phone && <p>{customer.phone}</p>}
          {customer?.address && <p>{customer.address}</p>}
        </div>
        <div className="text-left">
          <p className="font-semibold">حالة الدفع</p>
          <p>{STATUS_LABELS[invoice.paymentStatus]}</p>
        </div>
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="py-2 text-right">المنتج</th>
            <th className="py-2 text-center">الكمية</th>
            <th className="py-2 text-center">سعر الوحدة</th>
            <th className="py-2 text-left">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it, i) => (
            <tr key={it.productId || `print-${i}`} className="border-b">
              <td className="py-2 text-right">{it.productName}</td>
              <td className="py-2 text-center">{formatNumber(it.quantity)}</td>
              <td className="py-2 text-center">{formatNumber(it.unitPrice)}</td>
              <td className="py-2 text-left">{formatNumber(it.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-64 text-sm">
          <div className="flex justify-between py-1">
            <span>الإجمالي الفرعي</span>
            <span>{formatNumber(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>الخصم</span>
            <span>- {formatNumber(invoice.discount)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>الضريبة</span>
            <span>+ {formatNumber(invoice.tax)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-black pt-2 font-bold">
            <span>الصافي</span>
            <span>{formatNumber(invoice.total)}</span>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-gray-500">
        شكرًا لتعاملكم معنا
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function InvoicesPage() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  const invoicesQuery = useInvoices();
  const customersQuery = useCustomers();
  const productsQuery = useProducts();
  const settingsQuery = useSettings();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [returnTarget, setReturnTarget] = useState<Invoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  const invoices = invoicesQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const defaultTaxRate = settingsQuery.data?.taxRate ?? 0;

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) {
      map.set(String(c.id), c);
    }
    return map;
  }, [customers]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: {
      customerId: bigint;
      items: InvoiceItem[];
      discount: number;
      tax: number;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.createInvoice(
        payload.customerId,
        payload.items,
        payload.discount,
        payload.tax,
      );
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم إنشاء الفاتورة بنجاح");
    },
    onError: () => toast.error("تعذر إنشاء الفاتورة"),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: bigint;
      customerId: bigint;
      items: InvoiceItem[];
      discount: number;
      tax: number;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateInvoice(
        payload.id,
        payload.customerId,
        payload.items,
        payload.discount,
        payload.tax,
      );
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم تحديث الفاتورة بنجاح");
    },
    onError: () => toast.error("تعذر تحديث الفاتورة"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteInvoice(id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم حذف الفاتورة وإرجاع المخزون");
    },
    onError: () => toast.error("تعذر حذف الفاتورة"),
  });

  const returnMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      if (!actor) throw new Error("Actor not available");
      for (const item of invoice.items) {
        await actor.recordMovement(
          item.productId,
          MovementType.refund,
          item.quantity,
        );
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم إرجاع الكميات إلى المخزون");
    },
    onError: () => toast.error("تعذر إرجاع الكميات"),
  });

  const handleSubmit = async (payload: {
    customerId: bigint;
    items: InvoiceItem[];
    discount: number;
    tax: number;
  }) => {
    if (editingInvoice) {
      await updateMutation.mutateAsync({
        id: editingInvoice.id,
        ...payload,
      });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const openCreate = () => {
    setEditingInvoice(null);
    setFormOpen(true);
  };

  const openEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormOpen(true);
  };

  const handlePrint = (invoice: Invoice) => {
    setPrintInvoice(invoice);
    setTimeout(() => window.print(), 100);
  };

  useEffect(() => {
    const onAfterPrint = () => setPrintInvoice(null);
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim();
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.paymentStatus !== statusFilter) {
        return false;
      }
      const customer = customerMap.get(String(inv.customerId));
      const matchesSearch =
        !q ||
        String(inv.id).includes(q) ||
        (customer ? customer.name.includes(q) : false);
      if (!matchesSearch) return false;

      if (fromDate || toDate) {
        const date = new Date(Number(inv.createdAt) / 1_000_000);
        const day = date.toISOString().slice(0, 10);
        if (fromDate && day < fromDate) return false;
        if (toDate && day > toDate) return false;
      }
      return true;
    });
  }, [invoices, search, statusFilter, fromDate, toDate, customerMap]);

  const loading =
    invoicesQuery.isLoading ||
    customersQuery.isLoading ||
    productsQuery.isLoading;

  const printCustomer = printInvoice
    ? customerMap.get(String(printInvoice.customerId))
    : undefined;

  return (
    <>
      {printInvoice && (
        <div className="hidden print:block">
          <PrintableInvoice
            invoice={printInvoice}
            customer={printCustomer}
            companyName={settingsQuery.data?.companyName ?? ""}
          />
        </div>
      )}

      <div className="print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-2xl font-bold">
                المبيعات والفواتير
              </h1>
              <p className="text-muted-foreground">
                إنشاء ومتابعة فواتير البيع وإدارة المرتجعات
              </p>
            </div>
            <Button onClick={openCreate} data-ocid="invoice.create_button">
              <Plus /> إنشاء فاتورة
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">قائمة الفواتير</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                  <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="بحث برقم الفاتورة أو اسم العميل"
                    className="pr-9"
                    data-ocid="invoice.search_input"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger
                    className="w-full"
                    data-ocid="invoice.status_filter"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="paid">مدفوعة</SelectItem>
                    <SelectItem value="partial">جزئية</SelectItem>
                    <SelectItem value="unpaid">غير مدفوعة</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid gap-1">
                  <Label className="text-xs">من تاريخ</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    data-ocid="invoice.from_date"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    data-ocid="invoice.to_date"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div
                  className="flex flex-col items-center gap-3 py-16 text-center"
                  data-ocid="invoice.empty_state"
                >
                  <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <FileText className="size-7" />
                  </div>
                  <p className="font-display text-lg font-semibold">
                    {invoices.length === 0
                      ? "لا توجد فواتير بعد"
                      : "لا توجد نتائج مطابقة"}
                  </p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    {invoices.length === 0
                      ? "ابدأ بإنشاء أول فاتورة بيع لعميل."
                      : "جرّب تعديل البحث أو الفلاتر."}
                  </p>
                  {invoices.length === 0 && (
                    <Button
                      onClick={openCreate}
                      data-ocid="invoice.empty_create_button"
                    >
                      <Plus /> إنشاء فاتورة
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-ocid="invoice.table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الفاتورة</TableHead>
                        <TableHead>العميل</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead className="text-left">الإجمالي</TableHead>
                        <TableHead>حالة الدفع</TableHead>
                        <TableHead className="text-left">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((inv, idx) => {
                        const customer = customerMap.get(
                          String(inv.customerId),
                        );
                        return (
                          <TableRow
                            key={String(inv.id)}
                            data-ocid={`invoice.row.${idx + 1}`}
                          >
                            <TableCell className="num font-medium">
                              {formatNumber(inv.id)}
                            </TableCell>
                            <TableCell>
                              {customer ? customer.name : "عميل محذوف"}
                            </TableCell>
                            <TableCell>{formatDate(inv.createdAt)}</TableCell>
                            <TableCell className="num text-left font-semibold">
                              {formatEGP(inv.total)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(inv.paymentStatus)}>
                                {STATUS_LABELS[inv.paymentStatus]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePrint(inv)}
                                  aria-label="طباعة الفاتورة"
                                  data-ocid={`invoice.print_button.${idx + 1}`}
                                >
                                  <Printer />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEdit(inv)}
                                  aria-label="تعديل الفاتورة"
                                  data-ocid={`invoice.edit_button.${idx + 1}`}
                                >
                                  <Pencil />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setReturnTarget(inv)}
                                  aria-label="مرتجع الفاتورة"
                                  data-ocid={`invoice.return_button.${idx + 1}`}
                                >
                                  <RotateCcw />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteTarget(inv)}
                                  aria-label="حذف الفاتورة"
                                  data-ocid={`invoice.delete_button.${idx + 1}`}
                                >
                                  <Trash2 className="text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <InvoiceFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          invoice={editingInvoice}
          customers={customers}
          products={products}
          defaultTaxRate={defaultTaxRate}
          onSubmit={handleSubmit}
        />

        <AlertDialog
          open={deleteTarget !== null}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
        >
          <AlertDialogContent data-ocid="invoice.delete_dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>حذف الفاتورة</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف الفاتورة رقم{" "}
                {deleteTarget ? formatNumber(deleteTarget.id) : ""} وإرجاع
                الكميات إلى المخزون وتحديث حساب العميل. هل أنت متأكد؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-ocid="invoice.delete_cancel">
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deleteTarget && deleteMutation.mutate(deleteTarget.id)
                }
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-ocid="invoice.delete_confirm"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={returnTarget !== null}
          onOpenChange={(o) => !o && setReturnTarget(null)}
        >
          <AlertDialogContent data-ocid="invoice.return_dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>مرتجع الفاتورة</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم إرجاع كميات جميع بنود الفاتورة رقم{" "}
                {returnTarget ? formatNumber(returnTarget.id) : ""} إلى المخزون
                وتحديث حساب العميل. هل أنت متأكد؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-ocid="invoice.return_cancel">
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  returnTarget && returnMutation.mutate(returnTarget)
                }
                data-ocid="invoice.return_confirm"
              >
                تأكيد المرتجع
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
