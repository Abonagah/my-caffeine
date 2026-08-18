import { MovementType } from "@/backend";
import type { Product, Unit } from "@/backend";
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
import {
  useInventory,
  useLowStockProducts,
  useProducts,
  useRecordMovement,
} from "@/hooks/useQueries";
import { formatNumber } from "@/lib/format";
import { AlertTriangle, Boxes, Loader2, PackagePlus, Plus } from "lucide-react";
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

const MOVEMENT_LABELS: Record<MovementType, string> = {
  sale: "بيع",
  add: "إضافة",
  refund: "مرتجع",
  adjust: "تعديل",
};

const MOVEMENT_VARIANTS: Record<
  MovementType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  sale: "destructive",
  add: "default",
  refund: "secondary",
  adjust: "outline",
};

function formatDate(ns: bigint): string {
  const ms = Number(ns) / 1_000_000;
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

function StockStatus({ product }: { product: Product }) {
  if (product.quantity <= 0) {
    return <Badge variant="destructive">نفد المخزون</Badge>;
  }
  if (product.quantity < product.lowStockThreshold) {
    return <Badge variant="secondary">منخفض</Badge>;
  }
  return <Badge variant="default">متوفر</Badge>;
}

export default function InventoryPage() {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: movements = [], isLoading: movementsLoading } = useInventory();
  const { data: lowStock = [], isLoading: lowStockLoading } =
    useLowStockProducts();
  const recordMovement = useRecordMovement();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState("");

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id.toString(), p);
    return map;
  }, [products]);

  const sortedMovements = useMemo(
    () =>
      [...movements].sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
      ),
    [movements],
  );

  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive),
    [products],
  );

  const handleAddStock = () => {
    const product = productById.get(selectedProductId);
    const qty = Number(quantity);
    if (!product) {
      toast.error("اختر منتجًا لإضافة المخزون");
      return;
    }
    if (!qty || qty <= 0) {
      toast.error("أدخل كمية صحيحة أكبر من صفر");
      return;
    }
    recordMovement.mutate(
      { productId: product.id, movementType: MovementType.add, quantity: qty },
      {
        onSuccess: () => {
          toast.success(
            `تمت إضافة ${formatNumber(qty)} إلى مخزون ${product.name}`,
          );
          setDialogOpen(false);
          setSelectedProductId("");
          setQuantity("");
        },
        onError: () => {
          toast.error("تعذر إضافة المخزون، حاول مرة أخرى");
        },
      },
    );
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold">المخزون</h1>
        <p className="text-muted-foreground">
          متابعة الكميات المتاحة من المنتجات وسجل حركة المخزون
        </p>
      </div>

      {/* تنبيه انخفاض المخزون */}
      {!lowStockLoading && lowStock.length > 0 && (
        <Card
          data-ocid="low_stock_section"
          className="border-warning/40 bg-warning/5"
        >
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <div className="flex size-10 items-center justify-center rounded-full bg-warning/15 text-warning">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base">
                تنبيه: منتجات تحتاج إلى إعادة تزويد
              </CardTitle>
              <CardDescription>
                {formatNumber(lowStock.length)} منتج وصل إلى الحد الأدنى للمخزون
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((p, i) => (
                <Badge
                  key={p.id.toString()}
                  variant="secondary"
                  data-ocid={`low_stock_item.${i}`}
                >
                  {p.name} — {formatNumber(p.quantity)} {UNIT_LABELS[p.unit]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* المخزون الحالي */}
      <Card data-ocid="stock_table_card">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">المخزون الحالي</CardTitle>
            <CardDescription>
              الكميات المتاحة لكل منتج مع الحد الأدنى للمخزون
            </CardDescription>
          </div>
          <Button
            data-ocid="add_stock_button"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-4" />
            إضافة مخزون
          </Button>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="flex flex-col gap-3" data-ocid="loading_state">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : activeProducts.length === 0 ? (
            <div
              data-ocid="empty_state"
              className="flex flex-col items-center gap-3 py-12 text-center"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Boxes className="size-6" />
              </div>
              <p className="font-display text-base font-semibold">
                لا توجد منتجات بعد
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                أضف منتجات من صفحة المنتجات لعرض مخزونها هنا.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right">الوحدة</TableHead>
                    <TableHead className="text-right">الحد الأدنى</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeProducts.map((p, i) => (
                    <TableRow
                      key={p.id.toString()}
                      data-ocid={`stock_row.${i}`}
                    >
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="num text-right">
                        {formatNumber(p.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {UNIT_LABELS[p.unit]}
                      </TableCell>
                      <TableCell className="num text-right">
                        {formatNumber(p.lowStockThreshold)}
                      </TableCell>
                      <TableCell className="text-right">
                        <StockStatus product={p} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* سجل حركة المخزون */}
      <Card data-ocid="movement_history_card">
        <CardHeader>
          <CardTitle className="text-base">سجل حركة المخزون</CardTitle>
          <CardDescription>
            كل العمليات على المخزون: بيع، إضافة، مرتجع، تعديل
          </CardDescription>
        </CardHeader>
        <CardContent>
          {movementsLoading ? (
            <div className="flex flex-col gap-3" data-ocid="loading_state">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sortedMovements.length === 0 ? (
            <div
              data-ocid="empty_state"
              className="flex flex-col items-center gap-3 py-12 text-center"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <PackagePlus className="size-6" />
              </div>
              <p className="font-display text-base font-semibold">
                لا توجد حركات مخزون بعد
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                ستظهر هنا كل عمليات البيع والإضافة والمرتجعات والتعديلات.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العملية</TableHead>
                    <TableHead>المنتج</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMovements.map((m, i) => {
                    const product = productById.get(m.productId.toString());
                    return (
                      <TableRow
                        key={m.id.toString()}
                        data-ocid={`movement_row.${i}`}
                      >
                        <TableCell>
                          <Badge variant={MOVEMENT_VARIANTS[m.movementType]}>
                            {MOVEMENT_LABELS[m.movementType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {product?.name ??
                            `منتج #${formatNumber(m.productId)}`}
                        </TableCell>
                        <TableCell className="num text-right">
                          {formatNumber(m.quantity)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDate(m.createdAt)}
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

      {/* نافذة إضافة مخزون */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="add_stock_dialog">
          <DialogHeader>
            <DialogTitle>إضافة مخزون</DialogTitle>
            <DialogDescription>
              اختر المنتج وأدخل الكمية المراد إضافتها إلى المخزون.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="product-select">المنتج</Label>
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
              >
                <SelectTrigger id="product-select" data-ocid="product_select">
                  <SelectValue placeholder="اختر المنتج" />
                </SelectTrigger>
                <SelectContent>
                  {activeProducts.map((p) => (
                    <SelectItem key={p.id.toString()} value={p.id.toString()}>
                      {p.name} ({formatNumber(p.quantity)} {UNIT_LABELS[p.unit]}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="quantity-input">الكمية المضافة</Label>
              <Input
                id="quantity-input"
                data-ocid="quantity_input"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="مثال: ١٠"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              data-ocid="cancel_button"
              onClick={() => setDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              data-ocid="submit_button"
              onClick={handleAddStock}
              disabled={recordMovement.isPending}
            >
              {recordMovement.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
