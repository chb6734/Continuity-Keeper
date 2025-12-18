import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { ProgressSteps } from "@/components/progress-steps";
import { DocumentUpload } from "@/components/document-upload";
import { SymptomHistoryCard } from "@/components/symptom-history-card";
import { PrescriptionLoader } from "@/components/prescription-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, FileImage, Loader2, FolderOpen, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CHIEF_COMPLAINTS, COURSE_STATUS, ADHERENCE_OPTIONS, type PrescriptionWithMedications } from "@shared/schema";

const STEPS = ["문서 업로드", "주호소", "경과", "복약", "부작용", "확인"];

function getDeviceId(): string {
  const DEVICE_ID_KEY = "medbridge_device_id";
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

interface IntakeFormData {
  hospitalId: string;
  hospitalName: string;
  chiefComplaint: string;
  chiefComplaintDetail: string;
  onsetDate: string;
  courseStatus: string;
  courseDetail: string;
  adherence: string;
  adherenceReason: string;
  hasAdverseEvents: boolean;
  adverseEventsDetail: string;
  hasAllergies: boolean;
  allergiesDetail: string;
  doctorNote: string;
}

export default function IntakePage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  
  const params = new URLSearchParams(search);
  const hospitalId = params.get("hospitalId") || "";
  const hospitalName = params.get("hospitalName") || "";

  const [deviceId] = useState(() => getDeviceId());
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [documentTab, setDocumentTab] = useState<"upload" | "existing">("upload");
  const [selectedPrescriptions, setSelectedPrescriptions] = useState<PrescriptionWithMedications[]>([]);

  const [formData, setFormData] = useState<IntakeFormData>({
    hospitalId,
    hospitalName,
    chiefComplaint: "",
    chiefComplaintDetail: "",
    onsetDate: "",
    courseStatus: "",
    courseDetail: "",
    adherence: "",
    adherenceReason: "",
    hasAdverseEvents: false,
    adverseEventsDetail: "",
    hasAllergies: false,
    allergiesDetail: "",
    doctorNote: "",
  });

  useEffect(() => {
    if (!hospitalId || !hospitalName) {
      navigate("/");
    }
  }, [hospitalId, hospitalName, navigate]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formDataObj = new FormData();
      
      formDataObj.append("deviceId", deviceId);
      Object.entries(formData).forEach(([key, value]) => {
        formDataObj.append(key, String(value));
      });
      
      uploadedFiles.forEach((file) => {
        formDataObj.append(`documents`, file);
      });
      
      if (selectedPrescriptions.length > 0) {
        const prescriptionIds = selectedPrescriptions.map((p) => p.prescription.id);
        formDataObj.append("existingPrescriptionIds", JSON.stringify(prescriptionIds));
      }

      const response = await fetch("/api/intakes", {
        method: "POST",
        body: formDataObj,
      });

      if (!response.ok) {
        throw new Error("접수 제출에 실패했습니다");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/intakes"] });
      toast({
        title: "접수 완료",
        description: "의료진에게 공유할 수 있는 코드가 생성되었습니다.",
      });
      navigate(`/share/${data.intake.id}`);
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateField = <K extends keyof IntakeFormData>(
    field: K,
    value: IntakeFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        return formData.chiefComplaint && formData.onsetDate;
      case 2:
        return formData.courseStatus;
      case 3:
        return formData.adherence;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      submitMutation.mutate();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                처방전 정보 (선택)
              </CardTitle>
              <CardDescription>
                새 처방전을 업로드하거나, 이전에 저장한 처방 기록을 불러올 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={documentTab} onValueChange={(v) => setDocumentTab(v as "upload" | "existing")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="gap-2" data-testid="tab-upload-new">
                    <Upload className="h-4 w-4" />
                    새 문서 업로드
                  </TabsTrigger>
                  <TabsTrigger value="existing" className="gap-2" data-testid="tab-load-existing">
                    <FolderOpen className="h-4 w-4" />
                    이전 처방 불러오기
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="mt-4">
                  <DocumentUpload
                    onFilesSelected={setUploadedFiles}
                    isProcessing={isProcessingOcr}
                  />
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    * 사진은 정보 추출 후 즉시 삭제되며 저장되지 않습니다
                  </p>
                </TabsContent>
                
                <TabsContent value="existing" className="mt-4">
                  <PrescriptionLoader
                    deviceId={deviceId}
                    onPrescriptionsSelected={setSelectedPrescriptions}
                    selectedPrescriptionIds={selectedPrescriptions.map((p) => p.prescription.id)}
                  />
                </TabsContent>
              </Tabs>
              
              {(uploadedFiles.length > 0 || selectedPrescriptions.length > 0) && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">선택된 처방 정보:</span>
                    <div className="flex items-center gap-2">
                      {uploadedFiles.length > 0 && (
                        <span className="text-primary">새 문서 {uploadedFiles.length}개</span>
                      )}
                      {selectedPrescriptions.length > 0 && (
                        <span className="text-primary">이전 처방 {selectedPrescriptions.length}개</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>주호소</CardTitle>
              <CardDescription>
                오늘 방문하신 이유를 알려주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>주요 증상</Label>
                <Select
                  value={formData.chiefComplaint}
                  onValueChange={(value) => updateField("chiefComplaint", value)}
                >
                  <SelectTrigger data-testid="select-chief-complaint">
                    <SelectValue placeholder="증상을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHIEF_COMPLAINTS.map((complaint) => (
                      <SelectItem key={complaint.value} value={complaint.value}>
                        {complaint.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SymptomHistoryCard 
                deviceId={deviceId} 
                chiefComplaint={formData.chiefComplaint} 
              />

              <div className="space-y-2">
                <Label htmlFor="chiefComplaintDetail">증상 상세 (선택)</Label>
                <Textarea
                  id="chiefComplaintDetail"
                  placeholder="증상에 대해 더 자세히 설명해주세요"
                  value={formData.chiefComplaintDetail}
                  onChange={(e) => updateField("chiefComplaintDetail", e.target.value)}
                  className="min-h-[80px]"
                  data-testid="textarea-chief-complaint-detail"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="onsetDate">언제부터 증상이 시작되었나요?</Label>
                <Input
                  id="onsetDate"
                  placeholder="예: 3일 전, 지난주 월요일, 2주 전"
                  value={formData.onsetDate}
                  onChange={(e) => updateField("onsetDate", e.target.value)}
                  data-testid="input-onset-date"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>경과</CardTitle>
              <CardDescription>
                증상이 어떻게 변화하고 있나요?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={formData.courseStatus}
                onValueChange={(value) => updateField("courseStatus", value)}
                className="space-y-3"
              >
                {COURSE_STATUS.map((status) => (
                  <div
                    key={status.value}
                    className="flex items-center space-x-3 rounded-lg border p-4 hover-elevate cursor-pointer"
                    onClick={() => updateField("courseStatus", status.value)}
                  >
                    <RadioGroupItem 
                      value={status.value} 
                      id={status.value}
                      data-testid={`radio-course-${status.value}`}
                    />
                    <Label htmlFor={status.value} className="flex-1 cursor-pointer font-medium">
                      {status.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <div className="space-y-2">
                <Label htmlFor="courseDetail">경과 상세 (선택)</Label>
                <Textarea
                  id="courseDetail"
                  placeholder="언제 호전/악화되었는지, 특별한 변화가 있었다면 알려주세요"
                  value={formData.courseDetail}
                  onChange={(e) => updateField("courseDetail", e.target.value)}
                  className="min-h-[80px]"
                  data-testid="textarea-course-detail"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>복약 순응도</CardTitle>
              <CardDescription>
                처방받은 약을 어떻게 복용하고 계신가요?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={formData.adherence}
                onValueChange={(value) => updateField("adherence", value)}
                className="space-y-3"
              >
                {ADHERENCE_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-3 rounded-lg border p-4 hover-elevate cursor-pointer"
                    onClick={() => updateField("adherence", option.value)}
                  >
                    <RadioGroupItem 
                      value={option.value} 
                      id={option.value}
                      data-testid={`radio-adherence-${option.value}`}
                    />
                    <Label htmlFor={option.value} className="flex-1 cursor-pointer font-medium">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {(formData.adherence === "partial" || formData.adherence === "no") && (
                <div className="space-y-2">
                  <Label htmlFor="adherenceReason">복용하지 않은 이유</Label>
                  <Textarea
                    id="adherenceReason"
                    placeholder="약을 복용하지 않은 이유를 알려주세요"
                    value={formData.adherenceReason}
                    onChange={(e) => updateField("adherenceReason", e.target.value)}
                    className="min-h-[80px]"
                    data-testid="textarea-adherence-reason"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle>부작용 및 알레르기</CardTitle>
              <CardDescription>
                약물 관련 부작용이나 알레르기가 있으신가요?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3 rounded-lg border p-4">
                  <Checkbox
                    id="hasAdverseEvents"
                    checked={formData.hasAdverseEvents}
                    onCheckedChange={(checked) => 
                      updateField("hasAdverseEvents", checked as boolean)
                    }
                    data-testid="checkbox-adverse-events"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="hasAdverseEvents" className="font-medium cursor-pointer">
                      약물 부작용이 있습니다
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      약 복용 후 이상 증상이 있었다면 체크해주세요
                    </p>
                  </div>
                </div>

                {formData.hasAdverseEvents && (
                  <div className="space-y-2 pl-7">
                    <Textarea
                      placeholder="어떤 부작용이 있었는지 알려주세요"
                      value={formData.adverseEventsDetail}
                      onChange={(e) => updateField("adverseEventsDetail", e.target.value)}
                      className="min-h-[80px]"
                      data-testid="textarea-adverse-events-detail"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3 rounded-lg border p-4">
                  <Checkbox
                    id="hasAllergies"
                    checked={formData.hasAllergies}
                    onCheckedChange={(checked) => 
                      updateField("hasAllergies", checked as boolean)
                    }
                    data-testid="checkbox-allergies"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="hasAllergies" className="font-medium cursor-pointer">
                      약물 알레르기가 있습니다
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      특정 약물에 알레르기가 있다면 체크해주세요
                    </p>
                  </div>
                </div>

                {formData.hasAllergies && (
                  <div className="space-y-2 pl-7">
                    <Textarea
                      placeholder="알레르기가 있는 약물과 증상을 알려주세요"
                      value={formData.allergiesDetail}
                      onChange={(e) => updateField("allergiesDetail", e.target.value)}
                      className="min-h-[80px]"
                      data-testid="textarea-allergies-detail"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle>추가 정보</CardTitle>
              <CardDescription>
                의사가 말씀하신 내용이나 전달하고 싶은 내용이 있으신가요?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="doctorNote">의사 소견 메모 (선택)</Label>
                <Textarea
                  id="doctorNote"
                  placeholder="이전 진료 시 의사가 말씀하신 내용이 있다면 기록해주세요"
                  value={formData.doctorNote}
                  onChange={(e) => updateField("doctorNote", e.target.value)}
                  className="min-h-[100px]"
                  data-testid="textarea-doctor-note"
                />
                <p className="text-xs text-muted-foreground">
                  * 이 내용은 환자가 기록한 것으로 표시됩니다
                </p>
              </div>

              <div className="rounded-lg bg-muted p-4 space-y-3">
                <h4 className="font-medium">접수 요약</h4>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">방문 병원</span>
                    <span className="font-medium text-right">{formData.hospitalName}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">주호소</span>
                    <span className="font-medium">
                      {CHIEF_COMPLAINTS.find(c => c.value === formData.chiefComplaint)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">발병 시기</span>
                    <span className="font-medium">{formData.onsetDate}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">경과</span>
                    <span className="font-medium">
                      {COURSE_STATUS.find(c => c.value === formData.courseStatus)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">업로드된 문서</span>
                    <span className="font-medium">{uploadedFiles.length}개</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={hospitalName} showBack backPath="/" />
      
      <ProgressSteps steps={STEPS} currentStep={currentStep} />

      <main className="container max-w-2xl mx-auto px-4 py-4">
        {renderStepContent()}
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="container max-w-2xl mx-auto flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleBack}
              className="gap-2"
              data-testid="button-back-step"
            >
              <ArrowLeft className="h-5 w-5" />
              이전
            </Button>
          )}
          <Button
            size="lg"
            className="flex-1 gap-2"
            disabled={!canProceed() || submitMutation.isPending}
            onClick={handleNext}
            data-testid="button-next-step"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                처리 중...
              </>
            ) : currentStep === STEPS.length - 1 ? (
              "접수 완료"
            ) : (
              <>
                다음
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
