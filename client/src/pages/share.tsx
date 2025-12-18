import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { QRCodeDisplay } from "@/components/qr-code-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import type { Intake, AccessToken } from "@shared/schema";

interface ShareData {
  intake: Intake;
  token: AccessToken;
}

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<ShareData>({
    queryKey: ["/api/intakes", id, "token"],
    queryFn: async () => {
      const response = await fetch(`/api/intakes/${id}/token`);
      if (!response.ok) throw new Error("Failed to load");
      return response.json();
    },
    enabled: !!id,
    refetchInterval: 30000,
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/intakes/${id}/token/regenerate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intakes", id, "token"] });
      toast({
        title: "코드 재발급 완료",
        description: "새로운 코드가 생성되었습니다. 이전 코드는 무효화되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "코드 재발급에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="공유 코드" showBack backPath="/" />
        <main className="container max-w-md mx-auto px-4 py-8">
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="공유 코드" showBack backPath="/" />
        <main className="container max-w-md mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">접수 정보를 불러올 수 없습니다</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                다시 시도
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="공유 코드" showBack backPath="/" />
      
      <main className="container max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle className="h-6 w-6" />
          <span className="font-medium">접수가 완료되었습니다</span>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5" />
              {data.intake.hospitalName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              접수 시간: {format(parseISO(data.intake.createdAt?.toString() || new Date().toISOString()), "yyyy년 M월 d일 HH:mm", { locale: ko })}
            </p>
          </CardContent>
        </Card>

        <QRCodeDisplay
          token={data.token.token}
          expiresAt={data.token.expiresAt?.toString() || new Date().toISOString()}
          onRegenerate={() => regenerateMutation.mutate()}
          isRegenerating={regenerateMutation.isPending}
        />

        <p className="text-sm text-muted-foreground text-center px-4">
          의료진이 QR 코드를 스캔하면 접수 요약 정보를 확인할 수 있습니다.
          코드는 10분 후 만료되며, 만료 후에는 새 코드를 발급받으세요.
        </p>
      </main>
    </div>
  );
}
