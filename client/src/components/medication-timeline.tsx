import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/verification-badge";
import { SourceBadge } from "@/components/source-badge";
import { Pill, Calendar, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, isAfter, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import type { Medication } from "@shared/schema";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MedicationTimelineProps {
  medications: Medication[];
  defaultRange?: 30 | 90;
}

export function MedicationTimeline({ 
  medications, 
  defaultRange = 90 
}: MedicationTimelineProps) {
  const [range, setRange] = useState<30 | 90>(defaultRange);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const cutoffDate = subDays(new Date(), range);
  
  const filteredMeds = medications.filter(med => {
    if (!med.prescriptionDate && !med.dispensingDate) return true;
    const dateStr = med.dispensingDate || med.prescriptionDate;
    if (!dateStr) return true;
    try {
      const medDate = parseISO(dateStr);
      return isAfter(medDate, cutoffDate);
    } catch {
      return true;
    }
  });

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            투약 이력
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={range === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setRange(30)}
              data-testid="button-range-30"
            >
              30일
            </Button>
            <Button
              variant={range === 90 ? "default" : "outline"}
              size="sm"
              onClick={() => setRange(90)}
              data-testid="button-range-90"
            >
              90일
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filteredMeds.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            해당 기간 내 투약 기록이 없습니다
          </p>
        ) : (
          filteredMeds.map((med) => (
            <Collapsible key={med.id} open={expandedIds.has(med.id)}>
              <div
                className={cn(
                  "rounded-lg border p-4 transition-colors",
                  med.needsVerification && "border-amber-500/50 bg-amber-500/5"
                )}
              >
                <CollapsibleTrigger
                  className="w-full text-left"
                  onClick={() => toggleExpanded(med.id)}
                  data-testid={`trigger-medication-${med.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{med.medicationName}</span>
                        {med.needsVerification && (
                          <VerificationBadge 
                            needsVerification={true} 
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {med.dose && (
                          <span>{med.dose}</span>
                        )}
                        {med.frequency && (
                          <span>{med.frequency}</span>
                        )}
                        {med.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {med.duration}
                          </span>
                        )}
                      </div>
                      {(med.prescriptionDate || med.dispensingDate) && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          {med.dispensingDate || med.prescriptionDate}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedIds.has(med.id) ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-3 mt-3 border-t space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SourceBadge source="ocr" />
                    {med.confidence !== null && (
                      <Badge variant="outline" className="text-xs">
                        신뢰도: {med.confidence}%
                      </Badge>
                    )}
                  </div>
                  {med.rawOcrText && (
                    <div className="rounded-md bg-muted p-3 text-sm">
                      <p className="text-xs text-muted-foreground mb-1">OCR 원본 텍스트:</p>
                      <p className="font-mono text-xs whitespace-pre-wrap">{med.rawOcrText}</p>
                    </div>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))
        )}
      </CardContent>
    </Card>
  );
}
