import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import type { Medication } from "@shared/schema";

interface MedicationAnalysisCardProps {
  medications: Medication[];
}

export function MedicationAnalysisCard({ medications }: MedicationAnalysisCardProps) {
  if (medications.length === 0) {
    return null;
  }

  const totalMeds = medications.length;
  const lowConfidenceCount = medications.filter(m => (m.confidence || 0) < 70).length;
  const highConfidenceCount = medications.filter(m => (m.confidence || 0) >= 85).length;
  const avgConfidence = Math.round(
    medications.reduce((sum, m) => sum + (m.confidence || 0), 0) / totalMeds
  );

  const uniqueMedicationNames = new Set(medications.map(m => m.medicationName.toLowerCase()));
  const uniqueCount = uniqueMedicationNames.size;

  const confidenceDistribution = [
    { label: "높음 (85%+)", count: highConfidenceCount, color: "bg-green-500" },
    { label: "중간 (70-84%)", count: totalMeds - lowConfidenceCount - highConfidenceCount, color: "bg-yellow-500" },
    { label: "낮음 (<70%)", count: lowConfidenceCount, color: "bg-red-500" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          약물 분석 요약
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-2xl font-bold">{totalMeds}</p>
            <p className="text-xs text-muted-foreground">총 약물 수</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-2xl font-bold">{uniqueCount}</p>
            <p className="text-xs text-muted-foreground">고유 약물</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-2xl font-bold">{avgConfidence}%</p>
            <p className="text-xs text-muted-foreground">평균 신뢰도</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-2xl font-bold">{lowConfidenceCount}</p>
            <p className="text-xs text-muted-foreground">검증 필요</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">OCR 신뢰도 분포</p>
          <div className="space-y-2">
            {confidenceDistribution.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24">{item.label}</span>
                <Progress 
                  value={totalMeds > 0 ? (item.count / totalMeds) * 100 : 0} 
                  className="h-2 flex-1"
                />
                <span className="text-xs font-medium w-8 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {lowConfidenceCount > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/50 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400">
                {lowConfidenceCount}개 항목 확인 필요
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                OCR 신뢰도가 낮은 항목들입니다. 환자에게 직접 확인하시기 바랍니다.
              </p>
            </div>
          </div>
        )}

        {lowConfidenceCount === 0 && avgConfidence >= 85 && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-green-500/50 bg-green-500/5">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-green-600 dark:text-green-400">
                모든 항목 신뢰도 양호
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                OCR 추출 결과가 전반적으로 신뢰할 수 있습니다.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
