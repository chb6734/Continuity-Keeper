import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Building2, Calendar, ChevronRight, Trash2, FileText, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CHIEF_COMPLAINTS } from "@shared/schema";
import type { Intake } from "@shared/schema";

export default function MyIntakesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: intakes = [], isLoading } = useQuery<Intake[]>({
    queryKey: ["/api/intakes"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/intakes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intakes"] });
      toast({
        title: "삭제 완료",
        description: "접수 기록이 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "삭제에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const activeIntakes = intakes.filter(i => !i.isDeleted);

  return (
    <div className="min-h-screen bg-background">
      <Header title="내 접수 기록" showBack backPath="/" />
      
      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : activeIntakes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-medium">접수 기록이 없습니다</h3>
              <p className="text-muted-foreground">
                새로운 접수를 시작하여 의료진에게 정보를 공유하세요
              </p>
              <Button onClick={() => navigate("/")} className="gap-2">
                <Plus className="h-4 w-4" />
                새 접수 시작
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeIntakes.map((intake) => {
              const complaintLabel = CHIEF_COMPLAINTS.find(
                c => c.value === intake.chiefComplaint
              )?.label || intake.chiefComplaint;

              return (
                <Card key={intake.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-stretch">
                      <button
                        className="flex-1 p-4 text-left hover-elevate"
                        onClick={() => navigate(`/share/${intake.id}`)}
                        data-testid={`button-intake-${intake.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{intake.hospitalName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>
                                {format(parseISO(intake.createdAt?.toString() || new Date().toISOString()), "M월 d일 HH:mm", { locale: ko })}
                              </span>
                            </div>
                            <Badge variant="secondary" className="mt-2">
                              {complaintLabel}
                            </Badge>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                        </div>
                      </button>
                      
                      <div className="flex items-center border-l px-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              data-testid={`button-delete-${intake.id}`}
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>접수 기록 삭제</AlertDialogTitle>
                              <AlertDialogDescription>
                                이 접수 기록을 삭제하시겠습니까?
                                <br />
                                삭제 후에는 복구할 수 없으며, 공유 코드도 무효화됩니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(intake.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
