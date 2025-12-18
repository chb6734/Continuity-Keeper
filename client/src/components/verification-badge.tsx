import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface VerificationBadgeProps {
  needsVerification: boolean;
  confidence?: number;
}

export function VerificationBadge({ needsVerification, confidence }: VerificationBadgeProps) {
  if (needsVerification) {
    return (
      <Badge 
        variant="outline" 
        className="gap-1 text-xs border-amber-500/50 text-amber-600 dark:text-amber-400"
      >
        <AlertTriangle className="h-3 w-3" />
        확인 필요
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      <CheckCircle className="h-3 w-3" />
      {confidence !== undefined ? `신뢰도 ${confidence}%` : "확인됨"}
    </Badge>
  );
}
