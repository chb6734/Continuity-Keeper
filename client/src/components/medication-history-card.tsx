import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pill, Calendar, ChevronRight, FileText, AlertCircle } from "lucide-react";
import { type PrescriptionWithMedications } from "@shared/schema";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useLocation } from "wouter";

export function MedicationHistoryCard() {
  const [, navigate] = useLocation();
  
  const { data: prescriptions = [], isLoading } = useQuery<PrescriptionWithMedications[]>({
    queryKey: ["/api/prescriptions-with-meds"],
  });

  const allMedications = prescriptions.flatMap((p) => 
    p.medications.map((m) => ({
      ...m,
      prescriptionDate: p.prescription.prescriptionDate,
      hospitalName: p.prescription.hospitalName,
    }))
  );

  const uniqueMedications = allMedications.reduce((acc, med) => {
    const existing = acc.find((m) => m.medicationName === med.medicationName);
    if (!existing) {
      acc.push(med);
    }
    return acc;
  }, [] as typeof allMedications);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="h-4 w-4" />
            내 처방 약물 기록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Pill className="h-4 w-4 animate-pulse mr-2" />
            불러오는 중...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="h-4 w-4" />
            내 처방 약물 기록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">저장된 처방 기록이 없습니다</p>
            <p className="text-xs mt-1">접수 시 처방전을 업로드하면 여기에 표시됩니다</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="h-4 w-4" />
            내 처방 약물 기록
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {prescriptions.length}개 처방 / {uniqueMedications.length}종 약물
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="max-h-48">
          <div className="space-y-2">
            {uniqueMedications.slice(0, 5).map((med, index) => (
              <div
                key={`${med.medicationName}-${index}`}
                className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Pill className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{med.medicationName}</p>
                    {med.hospitalName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {med.hospitalName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {med.dose && (
                    <Badge variant="outline" className="text-xs">
                      {med.dose}
                    </Badge>
                  )}
                  {med.needsVerification && (
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                  )}
                </div>
              </div>
            ))}
            {uniqueMedications.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                외 {uniqueMedications.length - 5}종 더 있음
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="pt-2 border-t">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            최근 처방
          </h4>
          <div className="space-y-1">
            {prescriptions.slice(0, 3).map((item) => (
              <div
                key={item.prescription.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground truncate">
                    {item.prescription.hospitalName || "병원 미상"}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {item.medications.length}개 약물
                  </Badge>
                  {item.prescription.prescriptionDate && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(item.prescription.prescriptionDate), "MM.dd", { locale: ko })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => navigate("/my-medications")}
          data-testid="button-view-all-medications"
        >
          전체 약물 기록 보기
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
