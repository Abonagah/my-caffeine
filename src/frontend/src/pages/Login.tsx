import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Package } from "lucide-react";

export default function LoginPage() {
  const { login, isInitializing, isLoggingIn } = useInternetIdentity();
  const disabled = isInitializing || isLoggingIn;

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md" data-ocid="login_card">
        <CardContent className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Package className="size-8" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-2xl font-bold">
              إمداد للمستلزمات الورقية
            </h1>
            <p className="text-muted-foreground">
              سجّل الدخول للوصول إلى نظام إدارة المنشأة
            </p>
          </div>
          <Button
            size="lg"
            className="w-full"
            onClick={() => login()}
            disabled={disabled}
            data-ocid="login_button"
          >
            {isInitializing
              ? "جارٍ التحميل..."
              : isLoggingIn
                ? "جارٍ تسجيل الدخول..."
                : "تسجيل الدخول عبر الهوية الرقمية"}
          </Button>
          <p className="text-xs text-muted-foreground">
            أول مستخدم يسجّل الدخول يصبح مديرًا للنظام تلقائيًا
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
