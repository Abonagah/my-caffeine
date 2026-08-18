import { createActor } from "@/backend";
import type { Product } from "@/backend";
import { Unit } from "@/backend";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCanManageProducts } from "@/hooks/useQueries";
import { formatEGP, formatNumber, toArabicDigits } from "@/lib/format";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Package,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const UNIT_LABELS: Record<Unit, string> = {
  kilo: "كيلو",
  gram: "جرام",
  carton: "كرتونة",
  piece: "قطعة",
  unit: "وحدة",
  other: "أخرى",
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { actor } = useActor(createActor);
  const { data: canManageData } = useCanManageProducts();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProducts();
    },
    enabled: !!actor,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<Unit>(Unit.unit);
  const [lowStockThreshold, setLowStockThreshold] = useState("");

  // Only admin or users with product permission can manage products.
  const canManage = !!canManageData;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["lowStockProducts"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("غير متاح");
      await actor.addProduct(
        name.trim(),
        description.trim(),
        Number(salePrice) || 0,
        Number(purchasePrice) || 0,
        Number(quantity) || 0,
        unit,
        Number(lowStockThreshold) || 0,
      );
    },
    onSuccess: () => {
      toast.success("تمت إضافة المنتج بنجاح");
      setFormOpen(false);
      resetForm();
      invalidate();
    },
    onError: () => toast.error("تعذر إضافة المنتج"),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!actor || !editing) throw new Error("غير متاح");
      await actor.updateProduct(
        editing.id,
        name.trim(),
        description.trim(),
        Number(salePrice) || 0,
        Number(purchasePrice) || 0,
        Number(quantity) || 0,
        unit,
        Number(lowStockThreshold) || 0,
      );
    },
    onSuccess: () => {
      toast.success("تم تعديل بيانات المنتج");
      setFormOpen(false);
      resetForm();
      invalidate();
    },
    onError: () => toast.error("تعذر تعديل المنتج"),
  });

  const toggleMutation = useMutation({
    mutationFn: async (product: Product) => {
      if (!actor) throw new Error("غير متاح");
      if (product.isActive) {
        await actor.deactivateProduct(product.id);
      } else {
        // Reactivate by updating with the same data (backend keeps isActive).
        await actor.updateProduct(
          product.id,
          product.name,
          product.description,
          product.salePrice,
          product.purchasePrice,
          product.quantity,
          product.unit,
          product.lowStockThreshold,
        );
      }
    },
    onSuccess: (_data, product) => {
      toast.success(product.isActive ? "تم إيقاف المنتج" : "تم تفعيل المنتج");
      invalidate();
    },
    onError: () => toast.error("تعذر تغيير حالة المنتج"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (product: Product) => {
      if (!actor) throw new Error("غير متاح");
      await actor.deleteProduct(product.id);
    },
    onSuccess: () => {
      toast.success("تم حذف المنتج");
      setDeleteTarget(null);
      invalidate();
    },
    onError: () => toast.error("تعذر حذف المنتج"),
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setSalePrice("");
    setPurchasePrice("");
    setQuantity("");
    setUnit(Unit.unit);
    setLowStockThreshold("");
    setEditing(null);
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setName(product.name);
    setDescription(product.description);
    setSalePrice(String(product.salePrice));
    setPurchasePrice(String(product.purchasePrice));
    setQuantity(String(product.quantity));
    setUnit(product.unit);
    setLowStockThreshold(String(product.lowStockThreshold));
    setFormOpen(true);
  };

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.trim();
    return products.filter((p) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && p.isActive) ||
        (statusFilter === "inactive" && !p.isActive);
      if (!matchesStatus) return false;
      if (!q) return true;
      return `${p.name} ${p.description}`.includes(q);
    });
  }, [products, search, statusFilter]);

  const formSubmitting = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" data-ocid="products_page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">المنتجات</h1>
          <p className="text-sm text-muted-foreground">
            إدارة المنتجات والأسعار والمخزون
          </p>
        </div>
        {canManage && (
          <Button onClick={openAdd} data-ocid="products.add_button">
            <Plus className="size-4" />
            إضافة منتج
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">قائمة المنتجات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم المنتج أو الوصف..."
                className="pr-9"
                data-ocid="products.search_input"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                data-ocid="products.filter.all"
              >
                الكل
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
                data-ocid="products.filter.active"
              >
                نشط
              </Button>
              <Button
                variant={statusFilter === "inactive" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("inactive")}
                data-ocid="products.filter.inactive"
              >
                موقوف
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3" data-ocid="products.loading_state">
              {Array.from({ length: 4 }).map((_, _i) => (
                <Skeleton key="products-skeleton" className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-3 py-12 text-center"
              data-ocid="products.empty_state"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Package className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">
                  {products?.length
                    ? "لا توجد نتائج مطابقة"
                    : "لا توجد منتجات بعد"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {products?.length
                    ? "جرّب تغيير كلمة البحث أو الفلتر"
                    : "ابدأ بإضافة أول منتج لك"}
                </p>
              </div>
              {!products?.length && canManage && (
                <Button onClick={openAdd} data-ocid="products.empty_add_button">
                  <Plus className="size-4" />
                  إضافة منتج
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الوحدة</TableHead>
                    <TableHead className="text-left">سعر البيع</TableHead>
                    <TableHead className="text-left">سعر الشراء</TableHead>
                    <TableHead className="text-left">الكمية</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p, idx) => {
                    const isLow =
                      p.isActive && p.quantity <= p.lowStockThreshold;
                    return (
                      <TableRow key={p.id.toString()}>
                        <TableCell>
                          <span className="font-medium">{p.name}</span>
                          {p.description && (
                            <span className="block max-w-[220px] truncate text-xs text-muted-foreground">
                              {p.description}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{UNIT_LABELS[p.unit]}</TableCell>
                        <TableCell className="text-left">
                          {formatEGP(p.salePrice)}
                        </TableCell>
                        <TableCell className="text-left">
                          {formatEGP(p.purchasePrice)}
                        </TableCell>
                        <TableCell className="text-left">
                          <span className="num font-medium">
                            {formatNumber(p.quantity)}
                          </span>
                          {isLow && (
                            <Badge
                              variant="outline"
                              className="mr-2 border-warning text-warning"
                              data-ocid={`products.low_stock.${idx + 1}`}
                            >
                              <AlertTriangle className="size-3" />
                              منخفض
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={p.isActive ? "default" : "secondary"}
                            data-ocid={`products.status.${idx + 1}`}
                          >
                            {p.isActive ? "نشط" : "موقوف"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left">
                          {canManage ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="تعديل"
                                onClick={() => openEdit(p)}
                                data-ocid={`products.edit_button.${idx + 1}`}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={p.isActive ? "إيقاف" : "تفعيل"}
                                onClick={() => toggleMutation.mutate(p)}
                                disabled={toggleMutation.isPending}
                                data-ocid={`products.toggle_button.${idx + 1}`}
                              >
                                <Power className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="حذف"
                                onClick={() => setDeleteTarget(p)}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                data-ocid={`products.delete_button.${idx + 1}`}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          )}
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

      {/* Add / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
          data-ocid="products.form_dialog"
        >
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل منتج" : "إضافة منتج"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "قم بتحديث بيانات المنتج ثم احفظ التغييرات"
                : "أدخل بيانات المنتج الجديد"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) {
                toast.error("يرجى إدخال اسم المنتج");
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
              <Label htmlFor="product-name">الاسم</Label>
              <Input
                id="product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم المنتج"
                data-ocid="products.name_input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-description">الوصف</Label>
              <Textarea
                id="product-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="وصف مختصر للمنتج"
                data-ocid="products.description_input"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-sale-price">سعر البيع (ج.م)</Label>
                <Input
                  id="product-sale-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0.00"
                  data-ocid="products.sale_price_input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-purchase-price">سعر الشراء (ج.م)</Label>
                <Input
                  id="product-purchase-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0.00"
                  data-ocid="products.purchase_price_input"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-quantity">الكمية</Label>
                <Input
                  id="product-quantity"
                  type="number"
                  step="0.001"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  data-ocid="products.quantity_input"
                />
              </div>
              <div className="space-y-2">
                <Label>الوحدة</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
                  <SelectTrigger
                    className="w-full"
                    data-ocid="products.unit_select"
                  >
                    <SelectValue placeholder="اختر الوحدة" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(UNIT_LABELS) as Unit[]).map((u) => (
                      <SelectItem key={u} value={u}>
                        {UNIT_LABELS[u]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-low-stock">
                حد التنبيه للمخزون المنخفض
              </Label>
              <Input
                id="product-low-stock"
                type="number"
                step="0.001"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="0"
                data-ocid="products.low_stock_input"
              />
              <p className="text-xs text-muted-foreground">
                عند وصول الكمية لهذا الحد أو أقل، يظهر المنتج كمنخفض المخزون
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                data-ocid="products.cancel_button"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={formSubmitting}
                data-ocid="products.submit_button"
              >
                {formSubmitting
                  ? "جارٍ الحفظ..."
                  : editing
                    ? "حفظ التعديلات"
                    : "إضافة المنتج"}
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
        <DialogContent data-ocid="products.delete_dialog">
          <DialogHeader>
            <DialogTitle>حذف المنتج</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `هل أنت متأكد من حذف المنتج "${deleteTarget.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              data-ocid="products.delete_cancel_button"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget)
              }
              disabled={deleteMutation.isPending}
              data-ocid="products.delete_confirm_button"
            >
              {deleteMutation.isPending ? "جارٍ الحذف..." : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
