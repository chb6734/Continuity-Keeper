import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Pill, 
  Calendar, 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  Building2,
  FileText 
} from "lucide-react";
import { type PrescriptionWithMedications } from "@shared/schema";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function MyMedications() {
  const [, navigate] = useLocation();
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const { data: prescriptions = [], isLoading } = useQuery<PrescriptionWithMedications[]>({
    queryKey: ["/api/prescriptions-with-meds"],
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const allMedications = prescriptions.flatMap((p) =>
    p.medications.map((m) => ({
      ...m,
      prescriptionDate: p.prescription.prescriptionDate,
      hospitalName: p.prescription.hospitalName,
      prescriptionId: p.prescription.id,
    }))
  );

  const uniqueMedications = allMedications.reduce((acc, med) => {
    const existing = acc.find((m) => m.medicationName === med.medicationName);
    if (!existing) {
      acc.push({ ...med, count: 1 });
    } else {
      existing.count = (existing.count || 1) + 1;
    }
    return acc;
  }, [] as (typeof allMedications[0] & { count: number })[]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">내 약물 기록</h1>
            <p className="text-sm text-muted-foreground">
              처방받은 모든 약물을 확인할 수 있습니다
            </p>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center text-muted-foreground">
                <Pill className="h-5 w-5 animate-pulse mr-2" />
                불러오는 중...
              </div>
            </CardContent>
          </Card>
        ) : prescriptions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-lg font-medium mb-2">저장된 처방 기록이 없습니다</h2>
              <p className="text-muted-foreground text-sm mb-4">
                접수 시 처방전이나 조제기록을 업로드하면<br />
                여기에 저장됩니다
              </p>
              <Button onClick={() => navigate("/")} data-testid="button-go-home">
                접수 시작하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Pill className="h-4 w-4" />
                    처방받은 약물 목록
                  </span>
                  <Badge variant="secondary">{uniqueMedications.length}종</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {uniqueMedications.map((med, index) => (
                      <div
                        key={`${med.medicationName}-${index}`}
                        className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                            <Pill className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{med.medicationName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {med.dose && <span>{med.dose}</span>}
                              {med.frequency && <span>{med.frequency}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {med.count > 1 && (
                            <Badge variant="outline" className="text-xs">
                              {med.count}회 처방
                            </Badge>
                          )}
                          {med.needsVerification && (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    처방 기록
                  </span>
                  <Badge variant="secondary">{prescriptions.length}건</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {prescriptions.map((item) => {
                    const isExpanded = expandedIds.includes(item.prescription.id);

                    return (
                      <div
                        key={item.prescription.id}
                        className="border rounded-md overflow-hidden"
                      >
                        <button
                          className="w-full p-3 flex items-center justify-between gap-2 text-left hover-elevate"
                          onClick={() => toggleExpand(item.prescription.id)}
                          data-testid={`button-expand-prescription-${item.prescription.id}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted flex-shrink-0">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {item.prescription.hospitalName || "병원 미상"}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {item.prescription.prescriptionDate && (
                                  <span>
                                    {format(
                                      new Date(item.prescription.prescriptionDate),
                                      "yyyy년 MM월 dd일",
                                      { locale: ko }
                                    )}
                                  </span>
                                )}
                                {item.prescription.chiefComplaint && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.prescription.chiefComplaint}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              {item.medications.length}개 약물
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {isExpanded && item.medications.length > 0 && (
                          <div className="border-t bg-muted/30 p-3 space-y-2">
                            {item.medications.map((med) => (
                              <div
                                key={med.id}
                                className="flex items-center justify-between gap-2 text-sm"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Pill className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate">{med.medicationName}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {med.dose && (
                                    <span className="text-muted-foreground text-xs">
                                      {med.dose}
                                    </span>
                                  )}
                                  {med.frequency && (
                                    <Badge variant="outline" className="text-xs">
                                      {med.frequency}
                                    </Badge>
                                  )}
                                  {med.needsVerification && (
                                    <AlertCircle className="h-3 w-3 text-amber-500" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
