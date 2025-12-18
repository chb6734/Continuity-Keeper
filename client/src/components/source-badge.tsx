import { Badge } from "@/components/ui/badge";
import { User, ScanText, Bot } from "lucide-react";

interface SourceBadgeProps {
  source: "patient" | "ocr" | "system";
}

const sourceConfig = {
  patient: {
    label: "환자 기록",
    icon: User,
    variant: "secondary" as const,
  },
  ocr: {
    label: "OCR 추출",
    icon: ScanText,
    variant: "outline" as const,
  },
  system: {
    label: "시스템",
    icon: Bot,
    variant: "outline" as const,
  },
};

export function SourceBadge({ source }: SourceBadgeProps) {
  const config = sourceConfig[source];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1 text-xs">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
