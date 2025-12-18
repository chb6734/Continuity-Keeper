import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Pill, Calendar, ChevronDown, ChevronUp, Check } from "lucide-react";
import { type PrescriptionWithMedications } from "@shared/schema";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface PrescriptionLoaderProps {
  deviceId: string;
  onPrescriptionsSelected: (prescriptions: PrescriptionWithMedications[]) => void;
  selectedPrescriptionIds: string[];
}

export function PrescriptionLoader({
  deviceId,
  onPrescriptionsSelected,
  selectedPrescriptionIds,
}: PrescriptionLoaderProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedPrescriptionIds);

  const { data: prescriptions = [], isLoading } = useQuery<PrescriptionWithMedications[]>({
    queryKey: ["/api/prescriptions-with-meds", deviceId],
    enabled: !!deviceId,
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelect = (prescription: PrescriptionWithMedications) => {
    const isSelected = selectedIds.includes(prescription.prescription.id);
    let newSelectedIds: string[];
    
    if (isSelected) {
      newSelectedIds = selectedIds.filter((id) => id !== prescription.prescription.id);
    } else {
      newSelectedIds = [...selectedIds, prescription.prescription.id];
    }
    
    setSelectedIds(newSelectedIds);
    
    const selectedPrescriptions = prescriptions.filter((p) =>
      newSelectedIds.includes(p.prescription.id)
    );
    onPrescriptionsSelected(selectedPrescriptions);
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="h-4 w-4 animate-pulse" />
          <span>이전 처방 기록 불러오는 중...</span>
        </div>
      </Card>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>저장된 처방 기록이 없습니다.</p>
          <p className="text-sm mt-1">새 처방전을 업로드해주세요.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          이전 처방 기록 불러오기
        </h3>
        {selectedIds.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedIds.length}개 선택됨
          </Badge>
        )}
      </div>
      
      <ScrollArea className="max-h-64">
        <div className="space-y-2">
          {prescriptions.map((item) => {
            const isSelected = selectedIds.includes(item.prescription.id);
            const isExpanded = expandedIds.includes(item.prescription.id);
            
            return (
              <Card
                key={item.prescription.id}
                className={`overflow-hidden transition-colors ${
                  isSelected ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(item)}
                      data-testid={`checkbox-prescription-${item.prescription.id}`}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.prescription.hospitalName && (
                            <span className="font-medium text-sm truncate">
                              {item.prescription.hospitalName}
                            </span>
                          )}
                          {item.prescription.prescriptionDate && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(item.prescription.prescriptionDate), "yyyy.MM.dd", { locale: ko })}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <Pill className="h-3 w-3 mr-1" />
                            {item.medications.length}개 약물
                          </Badge>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleExpand(item.prescription.id)}
                            data-testid={`button-expand-prescription-${item.prescription.id}`}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {item.prescription.chiefComplaint && (
                        <p className="text-xs text-muted-foreground mt-1">
                          증상: {item.prescription.chiefComplaint}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && item.medications.length > 0 && (
                    <div className="mt-3 pt-3 border-t space-y-2">
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
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {isSelected && (
                  <div className="bg-primary/5 px-3 py-2 flex items-center gap-2 text-xs text-primary">
                    <Check className="h-3 w-3" />
                    이 처방 기록이 접수에 포함됩니다
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
