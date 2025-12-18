import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Copy, Calendar, Pill } from "lucide-react";
import type { VerificationFlag } from "@shared/schema";

interface VerificationFlagsCardProps {
  flags: VerificationFlag[];
}

const flagIcons = {
  duplicate: Copy,
  date_overlap: Calendar,
  allergy_conflict: AlertTriangle,
  low_confidence: Pill,
};

const flagLabels = {
  duplicate: "중복 가능성",
  date_overlap: "날짜 중복",
  allergy_conflict: "알레르기 충돌 가능",
  low_confidence: "낮은 신뢰도",
};

export function VerificationFlagsCard({ flags }: VerificationFlagsCardProps) {
  if (flags.length === 0) return null;

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          확인 필요 항목
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {flags.map((flag) => {
          const Icon = flagIcons[flag.flagType as keyof typeof flagIcons] || AlertTriangle;
          const label = flagLabels[flag.flagType as keyof typeof flagLabels] || flag.flagType;

          return (
            <div
              key={flag.id}
              className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-background p-3"
            >
              <Icon className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{flag.description}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
