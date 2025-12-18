import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SourceBadge } from "@/components/source-badge";
import { 
  ChevronDown, 
  ChevronUp, 
  Stethoscope, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Pill,
  AlertCircle,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CHIEF_COMPLAINTS, COURSE_STATUS, ADHERENCE_OPTIONS } from "@shared/schema";
import type { Intake } from "@shared/schema";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface IntakeSummaryCardProps {
  intake: Intake;
}

export function IntakeSummaryCard({ intake }: IntakeSummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const complaintLabel = CHIEF_COMPLAINTS.find(c => c.value === intake.chiefComplaint)?.label || intake.chiefComplaint;
  const courseLabel = COURSE_STATUS.find(c => c.value === intake.courseStatus)?.label || intake.courseStatus;
  const adherenceLabel = ADHERENCE_OPTIONS.find(a => a.value === intake.adherence)?.label || intake.adherence;

  const CourseIcon = intake.courseStatus === "improving" 
    ? TrendingUp 
    : intake.courseStatus === "worsening" 
      ? TrendingDown 
      : Minus;

  const courseColor = intake.courseStatus === "improving" 
    ? "text-green-600 dark:text-green-400" 
    : intake.courseStatus === "worsening" 
      ? "text-red-600 dark:text-red-400" 
      : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          환자 접수 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">주호소</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{complaintLabel}</Badge>
              {intake.chiefComplaintDetail && (
                <span className="text-sm">{intake.chiefComplaintDetail}</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">발병 시기</p>
            <p className="font-medium">{intake.onsetDate}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">경과</p>
            <div className={cn("flex items-center gap-2", courseColor)}>
              <CourseIcon className="h-4 w-4" />
              <span className="font-medium">{courseLabel}</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">복약 순응도</p>
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{adherenceLabel}</span>
            </div>
          </div>
        </div>

        {(intake.hasAdverseEvents || intake.hasAllergies) && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium text-sm">주의 사항</span>
            </div>
            <div className="space-y-2 text-sm">
              {intake.hasAdverseEvents && intake.adverseEventsDetail && (
                <div>
                  <span className="font-medium">부작용:</span> {intake.adverseEventsDetail}
                </div>
              )}
              {intake.hasAllergies && intake.allergiesDetail && (
                <div>
                  <span className="font-medium">알레르기:</span> {intake.allergiesDetail}
                </div>
              )}
            </div>
          </div>
        )}

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger
            className="flex w-full items-center justify-between rounded-md border p-3 text-sm font-medium hover-elevate"
            data-testid="trigger-intake-details"
          >
            <span>상세 내용 보기</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-4">
            {intake.courseDetail && (
              <div className="rounded-md bg-muted p-3">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-medium text-muted-foreground">경과 상세</p>
                  <SourceBadge source="patient" />
                </div>
                <p className="text-sm">{intake.courseDetail}</p>
              </div>
            )}

            {intake.adherenceReason && (
              <div className="rounded-md bg-muted p-3">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-medium text-muted-foreground">복약 관련 사유</p>
                  <SourceBadge source="patient" />
                </div>
                <p className="text-sm">{intake.adherenceReason}</p>
              </div>
            )}

            {intake.doctorNote && (
              <div className="rounded-md bg-muted p-3">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">의사 소견 (환자 기록)</p>
                  <SourceBadge source="patient" />
                </div>
                <p className="text-sm italic">"{intake.doctorNote}"</p>
                <p className="text-xs text-muted-foreground mt-2">
                  * 이 내용은 환자가 기억하는 의사 소견으로, 의무기록이 아닙니다.
                </p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
