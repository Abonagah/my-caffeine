import { createActor } from "@/backend";
import type { CompanySettings } from "@/backend";
import { UserRole } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatPercent, toArabicDigits } from "@/lib/format";
import { useActor } from "@caffeineai/core-infrastructure";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  PackageCheck,
  Save,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { actor } = useActor(createActor);

  const { data: settings, isLoading } = useQuery<CompanySettings>({
    queryKey: ["settings"],
    queryFn: async () => {
      if (!actor) throw new Error("غير متاح");
      return actor.getSettings();
    },
    enabled: !!actor,
  });

  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("");

  useEffect(() => {
    if (!settings) return;
    setCompanyName(settings.companyName ?? "");
    setAddress(settings.address ?? "");
    setPhone(settings.phone ?? "");
    setTaxRate(settings.taxRate != null ? String(settings.taxRate) : "");
    setLowStockThreshold(
      settings.lowStockThreshold != null
        ? String(settings.lowStockThreshold)
        : "",
    );
  }, [settings]);

  const [principalId, setPrincipalId] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.user);

  const [permPrincipalId, setPermPrincipalId] = useState("");

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("غير متاح");
      await actor.updateSettings(
        companyName.trim(),
        address.trim(),
        phone.trim(),
        Number(taxRate) || 0,
        Number(lowStockThreshold) || 0,
      );
    },
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات بنجاح");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => toast.error("تعذر حفظ الإعدادات"),
  });

  const assignRoleMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("غير متاح");
      const principal = Principal.fromText(principalId.trim());
      await actor.assignCallerUserRole(principal, role);
    },
    onSuccess: () => {
      toast.success("تم تعيين الدور بنجاح");
      setPrincipalId("");
    },
    onError: () => toast.error("تعذر تعيين الدور — تأكد من صحة المعرّف"),
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error("يرجى إدخال اسم الشركة");
      return;
    }
    saveSettingsMutation.mutate();
  };

  const handleAssignRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalId.trim()) {
      toast.error("يرجى إدخال معرّف المستخدم");
      return;
    }
    assignRoleMutation.mutate();
  };

  const grantPermissionMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("غير متاح");
      const principal = Principal.fromText(permPrincipalId.trim());
      await actor.grantProductPermission(principal);
    },
    onSuccess: () => {
      toast.success("تم منح صلاحية إدارة المنتجات");
      setPermPrincipalId("");
    },
    onError: () => toast.error("تعذر منح الصلاحية — تأكد من صحة المعرّف"),
  });

  const revokePermissionMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("غير متاح");
      const principal = Principal.fromText(permPrincipalId.trim());
      await actor.revokeProductPermission(principal);
    },
    onSuccess: () => {
      toast.success("تم سحب صلاحية إدارة المنتجات");
      setPermPrincipalId("");
    },
    onError: () => toast.error("تعذر سحب الصلاحية — تأكد من صحة المعرّف"),
  });

  const handleGrantPermission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permPrincipalId.trim()) {
      toast.error("يرجى إدخال معرّف المستخدم");
      return;
    }
    grantPermissionMutation.mutate();
  };

  const handleRevokePermission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permPrincipalId.trim()) {
      toast.error("يرجى إدخال معرّف المستخدم");
      return;
    }
    revokePermissionMutation.mutate();
  };

  return (
    <div className="space-y-6" data-ocid="settings_page">
      <div>
        <h1 className="font-display text-2xl font-bold">الإعدادات</h1>
        <p className="text-sm text-muted-foreground">
          بيانات الشركة وإدارة المستخدمين والصلاحيات
        </p>
      </div>

      {/* Company settings */}
      <Card data-ocid="settings.company_card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4" />
            بيانات الشركة
          </CardTitle>
          <CardDescription>
            البيانات التي تظهر على الفواتير وإعدادات النظام العامة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3" data-ocid="settings.loading_state">
              {Array.from({ length: 4 }).map((_, _i) => (
                <Skeleton key="settings-skeleton" className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-company-name">اسم الشركة</Label>
                  <Input
                    id="settings-company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="اسم الشركة"
                    data-ocid="settings.company_name_input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-phone">رقم الهاتف</Label>
                  <Input
                    id="settings-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                    className="text-right"
                    data-ocid="settings.phone_input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-address">العنوان</Label>
                <Input
                  id="settings-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="عنوان الشركة"
                  data-ocid="settings.address_input"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-tax-rate">نسبة الضريبة (٪)</Label>
                  <Input
                    id="settings-tax-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="0"
                    data-ocid="settings.tax_rate_input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-low-stock">
                    حد التنبيه للمخزون المنخفض
                  </Label>
                  <Input
                    id="settings-low-stock"
                    type="number"
                    step="0.001"
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    placeholder="0"
                    data-ocid="settings.low_stock_input"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  data-ocid="settings.save_button"
                >
                  <Save className="size-4" />
                  {saveSettingsMutation.isPending
                    ? "جارٍ الحفظ..."
                    : "حفظ الإعدادات"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* User / role management */}
      <Card data-ocid="settings.users_card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="size-4" />
            إدارة المستخدمين والصلاحيات
          </CardTitle>
          <CardDescription>
            عيّن دورًا (مدير أو موظف) لمستخدم عبر معرّفه (Principal)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAssignRole} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-principal">
                معرّف المستخدم (Principal)
              </Label>
              <Input
                id="settings-principal"
                value={principalId}
                onChange={(e) => setPrincipalId(e.target.value)}
                placeholder="aaaaa-bbbbb-ccccc-ddddd-eeeee"
                dir="ltr"
                className="text-left font-mono"
                data-ocid="settings.principal_input"
              />
              <p className="text-xs text-muted-foreground">
                يمكن للمستخدم العثور على معرّفه من صفحة تسجيل الدخول
              </p>
            </div>
            <div className="space-y-2">
              <Label>الدور</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as UserRole)}
              >
                <SelectTrigger
                  className="w-full"
                  data-ocid="settings.role_select"
                >
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير</SelectItem>
                  <SelectItem value="user">موظف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4" />
                <span>
                  المدير يملك كل الصلاحيات، والموظف يدير المنتجات والفواتير
                </span>
              </div>
              <Button
                type="submit"
                disabled={assignRoleMutation.isPending}
                data-ocid="settings.assign_role_button"
              >
                {assignRoleMutation.isPending
                  ? "جارٍ التعيين..."
                  : "تعيين الدور"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Product permission management */}
      <Card data-ocid="settings.product_permission_card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="size-4" />
            صلاحية إدارة المنتجات
          </CardTitle>
          <CardDescription>
            امنح أو اسحب صلاحية إضافة وحذف المنتجات لموظف عبر معرّفه (Principal)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGrantPermission} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-perm-principal">
                معرّف المستخدم (Principal)
              </Label>
              <Input
                id="settings-perm-principal"
                value={permPrincipalId}
                onChange={(e) => setPermPrincipalId(e.target.value)}
                placeholder="aaaaa-bbbbb-ccccc-ddddd-eeeee"
                dir="ltr"
                className="text-left font-mono"
                data-ocid="settings.perm_principal_input"
              />
              <p className="text-xs text-muted-foreground">
                الموظف لا يستطيع إضافة أو حذف المنتجات إلا بعد منحه هذه الصلاحية
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={revokePermissionMutation.isPending}
                onClick={handleRevokePermission}
                data-ocid="settings.revoke_permission_button"
              >
                {revokePermissionMutation.isPending
                  ? "جارٍ السحب..."
                  : "سحب الصلاحية"}
              </Button>
              <Button
                type="submit"
                disabled={grantPermissionMutation.isPending}
                data-ocid="settings.grant_permission_button"
              >
                {grantPermissionMutation.isPending
                  ? "جارٍ المنح..."
                  : "منح الصلاحية"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
