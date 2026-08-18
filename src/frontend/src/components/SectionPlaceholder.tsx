import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface SectionPlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

/**
 * Shared placeholder body for sections whose full page is built by a later
 * page task. Renders a clear, intentional empty state with the section title.
 */
export function SectionPlaceholder({
  title,
  description,
  icon: Icon,
}: SectionPlaceholderProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card data-ocid="section_placeholder">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-7" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-display text-lg font-semibold">{title}</p>
            <p className="max-w-md text-sm text-muted-foreground">
              هذا القسم قيد الإعداد وسيُتاح قريبًا ضمن النظام.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
