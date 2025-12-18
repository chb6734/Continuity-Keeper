import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, History } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import type { AccessLog } from "@shared/schema";

interface AccessLogsCardProps {
  logs: AccessLog[];
}

export function AccessLogsCard({ logs }: AccessLogsCardProps) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            접근 기록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            아직 접근 기록이 없습니다
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          접근 기록
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between gap-4 rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {log.action === "view" ? "요약 조회" : log.action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    토큰: {log.tokenId.slice(0, 8)}...
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {format(parseISO(log.accessedAt?.toString() || new Date().toISOString()), "MM/dd HH:mm", { locale: ko })}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
