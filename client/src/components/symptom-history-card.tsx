import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Pill, Calendar, TrendingUp } from "lucide-react";
import { CHIEF_COMPLAINTS, type SymptomHistory } from "@shared/schema";

interface SymptomHistoryCardProps {
  chiefComplaint: string;
}

export function SymptomHistoryCard({ chiefComplaint }: SymptomHistoryCardProps) {
  const { data, isLoading } = useQuery<SymptomHistory & { hasHistory: boolean }>({
    queryKey: ['/api/symptom-history', chiefComplaint],
    queryFn: async () => {
      const response = await fetch(`/api/symptom-history/${encodeURIComponent(chiefComplaint)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch symptom history');
      }
      return response.json();
    },
    enabled: !!chiefComplaint,
  });

  if (!chiefComplaint) return null;
  
  if (isLoading) {
    return (
      <Card className="mt-4 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.hasHistory) return null;

  const complaintLabel = CHIEF_COMPLAINTS.find(c => c.value === chiefComplaint)?.label || chiefComplaint;

  return (
    <Card className="mt-4 bg-muted/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          과거 진료 기록 발견
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">
            {complaintLabel}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {data.totalVisits}회 진료 기록
          </span>
        </div>

        {data.lastVisitDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            최근 진료: {data.lastVisitDate}
          </div>
        )}

        {data.medicationStats && data.medicationStats.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Pill className="h-3.5 w-3.5 text-primary" />
              처방 약물 통계
            </div>
            <div className="grid gap-2">
              {data.medicationStats.slice(0, 5).map((stat, index) => (
                <div
                  key={stat.medicationName}
                  className="flex items-center justify-between p-2 rounded bg-background"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground w-4">
                      {index + 1}.
                    </span>
                    <span className="text-sm font-medium truncate">
                      {stat.medicationName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {stat.totalCount}회
                    </Badge>
                    {stat.avgConfidence >= 80 && (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            {data.medicationStats.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                외 {data.medicationStats.length - 5}개 약물
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          * 이전에 저장된 처방 기록을 기반으로 표시됩니다
        </p>
      </CardContent>
    </Card>
  );
}
