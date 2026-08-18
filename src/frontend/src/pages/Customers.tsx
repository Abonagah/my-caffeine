import { createActor } from "@/backend";
import type { Customer, CustomerStatement, Invoice, Payment } from "@/backend";
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
  Eye,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type StatementRow = {
  id: string;
  date: bigint;
  label: string;
  detail: string;
  debit: number;
  credit: number;
  running: number;
};

/** Fetch every customer together with its statement (balance + history). */
function useCustomersWithStatements() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<CustomerStatement[]>({
    queryKey: ["customers", "statements"],
    queryFn: async () => {
      if (!actor) return [];
      const customers = await actor.listCustomers();
      const statements = await Promise.all(
        customers.map((c) => actor.getCustomerStatement(c.id)),
      );
      return statements;
    },
    enabled: !!actor && !isFetching,
  });
}

/** Build a chronological statement of invoices (debit) and payments (credit). */
function buildStatementRows(statement: CustomerStatement): StatementRow[] {
  const rows: StatementRow[] = [];

  for (const inv of statement.invoices) {
    rows.push({
      id: `inv-${inv.id}`,
      date: inv.createdAt,
      label: "فاتورة",
      detail: `فاتورة رقم ${toArabicDigits(Number(inv.id))}`,
      debit: inv.total,
      credit: 0,
      running: 0,
    });
  }

  for (const pay of statement.payments) {
    rows.push({
      id: `pay-${pay.id}`,
      date: pay.createdAt,
      label: "دفعة",
      detail: pay.invoiceId
        ? `دفعة على فاتورة رقم ${toArabicDigits(Number(pay.invoiceId))}`
        : "دفعة على الحساب",
      debit: 0,
      credit: pay.amount,
      running: 0,
    });
  }

  rows.sort((a, b) => Number(a.date - b.date));

  let running = 0;
  for (const row of rows) {
    running += row.debit - row.credit;
    row.running = running;
  }

  return rows;
}

function formatDate(ts: bigint): string {
  const d = new Date(Number(ts) / 1_000_000);
  const day = toArabicDigits(d.getDate());
  const month = toArabicDigits(d.getMonth() + 1);
  const year = toArabicDigits(d.getFullYear());
  return `${day}/${month}/${year}`;
}

function BalanceBadge({ balance }: { balance: number }) {
  if (balance > 0) {
    return (
      <Badge variant="destructive" data-ocid="balance_debit">
        مدين {formatEGP(balance)}
      </Badge>
    );
  }
  if (balance < 0) {
    return (
      <Badge variant="secondary" data-ocid="balance_credit">
        دائن {formatEGP(Math.abs(balance))}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" data-ocid="balance_zero">
      متزن
    </Badge>
  );
}

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { actor } = useActor(createActor);

  const { data: statements, isLoading } = useCustomersWithStatements();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerStatement | null>(
    null,
  );
  const [statementTarget, setStatementTarget] =
    useState<CustomerStatement | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("غير متاح");
      await actor.addCustomer(name.trim(), phone.trim(), address.trim());
    },
    onSuccess: () => {
      toast.success("تمت إضافة العميل بنجاح");
      setFormOpen(false);
      resetForm();
      invalidate();
    },
    onError: () => toast.error("تعذر إضافة العميل"),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!actor || !editing) throw new Error("غير متاح");
      await actor.updateCustomer(
        editing.id,
        name.trim(),
        phone.trim(),
        address.trim(),
      );
    },
    onSuccess: () => {
      toast.success("تم تعديل بيانات العميل");
      setFormOpen(false);
      resetForm();
      invalidate();
    },
    onError: () => toast.error("تعذر تعديل العميل"),
  });

  const toggleMutation = useMutation({
    mutationFn: async (customer: Customer) => {
      if (!actor) throw new Error("غير متاح");
      if (customer.isActive) {
        await actor.deactivateCustomer(customer.id);
      } else {
        // Reactivate by updating with the same data (backend keeps isActive).
        await actor.updateCustomer(
          customer.id,
          customer.name,
          customer.phone,
          customer.address,
        );
      }
    },
    onSuccess: (_data, customer) => {
      toast.success(customer.isActive ? "تم إيقاف العميل" : "تم تفعيل العميل");
      invalidate();
    },
    onError: () => toast.error("تعذر تغيير حالة العميل"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (customer: Customer) => {
      if (!actor) throw new Error("غير متاح");
      await actor.deleteCustomer(customer.id);
    },
    onSuccess: () => {
      toast.success("تم حذف العميل");
      setDeleteTarget(null);
      invalidate();
    },
    onError: () => toast.error("تعذر حذف العميل"),
  });

  const resetForm = () => {
    setName("");
    setPhone("");
    setAddress("");
    setEditing(null);
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setName(customer.name);
    setPhone(customer.phone);
    setAddress(customer.address);
    setFormOpen(true);
  };

  const filtered = useMemo(() => {
    if (!statements) return [];
    const q = search.trim();
    return statements.filter((s) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.customer.isActive) ||
        (statusFilter === "inactive" && !s.customer.isActive);
      if (!matchesStatus) return false;
      if (!q) return true;
      const haystack = `${s.customer.name} ${s.customer.phone} ${s.customer.address}`;
      return haystack.includes(q);
    });
  }, [statements, search, statusFilter]);

  const canDelete = (s: CustomerStatement) => s.invoices.length === 0;

  const formSubmitting = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" data-ocid="customers_page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">العملاء</h1>
          <p className="text-sm text-muted-foreground">
            إدارة حسابات العملاء وأرصدتهم وكشوف الحساب
          </p>
        </div>
        <Button onClick={openAdd} data-ocid="customers.add_button">
          <Plus className="size-4" />
          إضافة عميل
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">قائمة العملاء</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الهاتف أو العنوان..."
                className="pr-9"
                data-ocid="customers.search_input"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                data-ocid="customers.filter.all"
              >
                الكل
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
                data-ocid="customers.filter.active"
              >
                نشط
              </Button>
              <Button
                variant={statusFilter === "inactive" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("inactive")}
                data-ocid="customers.filter.inactive"
              >
                موقوف
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3" data-ocid="customers.loading_state">
              {Array.from({ length: 4 }, (_, i) => i).map((i) => (
                <Skeleton key={`skeleton-${i}`} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-3 py-12 text-center"
              data-ocid="customers.empty_state"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Users className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">
                  {statements?.length
                    ? "لا توجد نتائج مطابقة"
                    : "لا يوجد عملاء بعد"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {statements?.length
                    ? "جرّب تغيير كلمة البحث أو الفلتر"
                    : "ابدأ بإضافة أول عميل لك"}
                </p>
              </div>
              {!statements?.length && (
                <Button
                  onClick={openAdd}
                  data-ocid="customers.empty_add_button"
                >
                  <Plus className="size-4" />
                  إضافة عميل
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead className="text-left">الرصيد</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s, idx) => (
                    <TableRow key={s.customer.id.toString()}>
                      <TableCell className="font-medium">
                        {s.customer.name}
                      </TableCell>
                      <TableCell className="num">{s.customer.phone}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {s.customer.address || "—"}
                      </TableCell>
                      <TableCell className="text-left">
                        <BalanceBadge balance={s.balance} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.customer.isActive ? "default" : "secondary"
                          }
                          data-ocid={`customers.status.${idx + 1}`}
                        >
                          {s.customer.isActive ? "نشط" : "موقوف"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="كشف حساب"
                            onClick={() => setStatementTarget(s)}
                            data-ocid={`customers.statement_button.${idx + 1}`}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="تعديل"
                            onClick={() => openEdit(s.customer)}
                            data-ocid={`customers.edit_button.${idx + 1}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={s.customer.isActive ? "إيقاف" : "تفعيل"}
                            onClick={() => toggleMutation.mutate(s.customer)}
                            disabled={toggleMutation.isPending}
                            data-ocid={`customers.toggle_button.${idx + 1}`}
                          >
                            <Power className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="حذف"
                            onClick={() => setDeleteTarget(s)}
                            disabled={!canDelete(s)}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            data-ocid={`customers.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent data-ocid="customers.form_dialog">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل عميل" : "إضافة عميل"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "قم بتحديث بيانات العميل ثم احفظ التغييرات"
                : "أدخل بيانات العميل الجديد"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) {
                toast.error("يرجى إدخال اسم العميل");
                return;
              }
              if (editing) {
                updateMutation.mutate();
              } else {
                addMutation.mutate();
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="customer-name">الاسم</Label>
              <Input
                id="customer-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم العميل"
                data-ocid="customers.name_input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">رقم الهاتف</Label>
              <Input
                id="customer-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                className="text-right"
                data-ocid="customers.phone_input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-address">العنوان</Label>
              <Input
                id="customer-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="عنوان العميل"
                data-ocid="customers.address_input"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                data-ocid="customers.cancel_button"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={formSubmitting}
                data-ocid="customers.submit_button"
              >
                {formSubmitting
                  ? "جارٍ الحفظ..."
                  : editing
                    ? "حفظ التعديلات"
                    : "إضافة العميل"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent data-ocid="customers.delete_dialog">
          <DialogHeader>
            <DialogTitle>حذف العميل</DialogTitle>
            <DialogDescription>
              {deleteTarget && canDelete(deleteTarget)
                ? `هل أنت متأكد من حذف العميل "${deleteTarget.customer.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : "لا يمكن حذف هذا العميل لأنه مرتبط بفواتير سابقة. يمكنك إيقافه بدلاً من ذلك."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              data-ocid="customers.delete_cancel_button"
            >
              إلغاء
            </Button>
            {deleteTarget && canDelete(deleteTarget) && (
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteTarget.customer)}
                disabled={deleteMutation.isPending}
                data-ocid="customers.delete_confirm_button"
              >
                {deleteMutation.isPending ? "جارٍ الحذف..." : "حذف"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Statement dialog */}
      <Dialog
        open={!!statementTarget}
        onOpenChange={(open) => !open && setStatementTarget(null)}
      >
        <DialogContent
          className="max-h-[85vh] overflow-y-auto sm:max-w-3xl"
          data-ocid="customers.statement_dialog"
        >
          {statementTarget && <StatementView statement={statementTarget} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatementView({ statement }: { statement: CustomerStatement }) {
  const rows = useMemo(() => buildStatementRows(statement), [statement]);

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle>كشف حساب</DialogTitle>
        <DialogDescription>
          {statement.customer.name}
          {statement.customer.phone ? ` — ${statement.customer.phone}` : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-4">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
          <div className="mt-1">
            <BalanceBadge balance={statement.balance} />
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {toArabicDigits(statement.invoices.length)} فاتورة ·{" "}
          {toArabicDigits(statement.payments.length)} دفعة
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-10 text-center"
          data-ocid="customers.statement_empty"
        >
          <Users className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            لا توجد حركات على هذا الحساب بعد
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>البيان</TableHead>
                <TableHead className="text-left">مدين</TableHead>
                <TableHead className="text-left">دائن</TableHead>
                <TableHead className="text-left">الرصيد</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={row.id}>
                  <TableCell className="num whitespace-nowrap">
                    {formatDate(row.date)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{row.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {row.detail}
                    </span>
                  </TableCell>
                  <TableCell className="text-left">
                    {row.debit > 0 ? (
                      <span className="text-destructive">
                        {formatEGP(row.debit)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-left">
                    {row.credit > 0 ? formatEGP(row.credit) : "—"}
                  </TableCell>
                  <TableCell
                    className="text-left font-medium"
                    data-ocid={`customers.statement_balance.${idx + 1}`}
                  >
                    {row.running > 0
                      ? `مدين ${formatEGP(row.running)}`
                      : row.running < 0
                        ? `دائن ${formatEGP(Math.abs(row.running))}`
                        : "متزن"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
