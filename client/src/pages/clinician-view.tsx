import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { MedicationTimeline } from "@/components/medication-timeline";
import { MedicationAnalysisCard } from "@/components/medication-analysis-card";
import { IntakeSummaryCard } from "@/components/intake-summary-card";
import { VerificationFlagsCard } from "@/components/verification-flags-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Calendar, ShieldAlert, FileX, History, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import type { IntakeSummary, Intake } from "@shared/schema";

export default function ClinicianViewPage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery<IntakeSummary>({
    queryKey: ["/api/view", token],
    queryFn: async () => {
      const response = await fetch(`/api/view/${token}`);
      if (!response.ok) {
        if (response.status === 404 || response.status === 410) {
          throw new Error("expired");
        }
        throw new Error("Failed to load");
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="진료 요약" />
        <main className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (error) {
    const isExpired = error.message === "expired";
    return (
      <div className="min-h-screen bg-background">
        <Header title="진료 요약" />
        <main className="container max-w-md mx-auto px-4 py-16">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              {isExpired ? (
                <>
                  <div className="flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <ShieldAlert className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold">접근 코드 만료</h2>
                  <p className="text-muted-foreground">
                    이 접근 코드는 만료되었거나 무효화되었습니다.
                    <br />
                    환자에게 새로운 코드를 요청해주세요.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <FileX className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold">정보를 불러올 수 없습니다</h2>
                  <p className="text-muted-foreground">
                    잠시 후 다시 시도해주세요.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!data) return null;

  const hasWarnings = data.verificationFlags.length > 0 || 
    data.intake.hasAdverseEvents || 
    data.intake.hasAllergies;

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header title="진료 요약" showNotifications={false} />
      
      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {data.intake.hospitalName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(data.intake.createdAt?.toString() || new Date().toISOString()), "yyyy년 M월 d일 HH:mm", { locale: ko })}
                  </p>
                </div>
              </div>
              {hasWarnings && (
                <Badge variant="destructive" className="gap-1">
                  <ShieldAlert className="h-3 w-3" />
                  주의 필요
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        {data.verificationFlags.length > 0 && (
          <VerificationFlagsCard flags={data.verificationFlags} />
        )}

        <IntakeSummaryCard intake={data.intake} />

        {data.medications.length > 0 && (
          <>
            <MedicationAnalysisCard medications={data.medications} />
            <MedicationTimeline medications={data.medications} />
          </>
        )}

        {data.accessLogs.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <History className="h-4 w-4" />
                접근 기록
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.accessLogs.slice(0, 5).map((log, index) => (
                  <div 
                    key={log.id} 
                    className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                    data-testid={`access-log-${index}`}
                  >
                    <span className="text-muted-foreground">
                      {log.action === "view" ? "조회됨" : log.action}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(log.accessedAt?.toString() || new Date().toISOString()), "M월 d일 HH:mm", { locale: ko })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-xs text-muted-foreground py-4 space-y-1">
          <p>이 정보는 환자가 직접 입력했거나 문서에서 OCR로 추출한 것입니다.</p>
          <p>의무기록을 대체하지 않으며, 진료 참고용으로만 사용하세요.</p>
        </div>
      </main>
    </div>
  );
}
