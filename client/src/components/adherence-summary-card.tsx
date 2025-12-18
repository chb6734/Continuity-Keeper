import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Pill, CheckCircle, XCircle, MinusCircle, TrendingUp, AlertTriangle } from "lucide-react";
import type { AdherenceSummary } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

interface AdherenceSummaryCardProps {
  summary: AdherenceSummary;
}

export function AdherenceSummaryCard({ summary }: AdherenceSummaryCardProps) {
  const { totalScheduled, takenCount, missedCount, skippedCount, adherenceRate, recentLogs } = summary;

  if (totalScheduled === 0) {
    return null;
  }

  const getAdherenceColor = (rate: number) => {
    if (rate >= 80) return "text-green-600 dark:text-green-400";
    if (rate >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getAdherenceBadgeVariant = (rate: number): "default" | "secondary" | "destructive" => {
    if (rate >= 80) return "default";
    if (rate >= 60) return "secondary";
    return "destructive";
  };

  const getAdherenceStatus = (rate: number) => {
    if (rate >= 80) return "양호";
    if (rate >= 60) return "주의";
    return "미흡";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            복약 순응도
          </CardTitle>
          <Badge variant={getAdherenceBadgeVariant(adherenceRate)} data-testid="badge-adherence-status">
            {getAdherenceStatus(adherenceRate)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-4xl font-bold ${getAdherenceColor(adherenceRate)}`} data-testid="text-adherence-rate">
                {adherenceRate}%
              </span>
              <span className="text-muted-foreground text-sm">복약 순응도</span>
            </div>
            <Progress 
              value={adherenceRate} 
              className="h-3"
              data-testid="progress-adherence"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-taken-count">
              {takenCount}
            </p>
            <p className="text-xs text-muted-foreground">복용</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-400" data-testid="text-missed-count">
              {missedCount}
            </p>
            <p className="text-xs text-muted-foreground">미복용</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MinusCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold" data-testid="text-skipped-count">
              {skippedCount}
            </p>
            <p className="text-xs text-muted-foreground">건너뜀</p>
          </div>
        </div>

        {adherenceRate < 60 && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/50 bg-red-500/5">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-red-600 dark:text-red-400">
                복약 순응도 저하
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                환자의 복약 순응도가 낮습니다. 복약 지도 및 상담이 필요할 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {recentLogs.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              최근 복용 기록
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recentLogs.slice(0, 5).map((log, index) => (
                <div 
                  key={log.id || index}
                  className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-muted"
                  data-testid={`adherence-log-${index}`}
                >
                  <div className="flex items-center gap-2">
                    {log.status === "taken" && <CheckCircle className="h-3 w-3 text-green-500" />}
                    {log.status === "missed" && <XCircle className="h-3 w-3 text-red-500" />}
                    {log.status === "skipped" && <MinusCircle className="h-3 w-3 text-muted-foreground" />}
                    <span className="truncate max-w-32">
                      {log.medicationName || "알 수 없는 약물"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {log.takenAt ? format(parseISO(log.takenAt.toString()), "M/d HH:mm", { locale: ko }) : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
