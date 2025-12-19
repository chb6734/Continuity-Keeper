import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { HospitalSearch } from "@/components/hospital-search";
import { MedicationHistoryCard } from "@/components/medication-history-card";
import { ConsentDialog, useConsentStatus } from "@/components/consent-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  ArrowRight, 
  Shield, 
  Clock, 
  Smartphone, 
  Camera,
  Loader2,
  X,
  Check
} from "lucide-react";
import type { Hospital } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// OCR 결과 타입
interface OcrPreviewResult {
  medications: Array<{
    medicationName: string;
    dose: string | null;
    frequency: string | null;
    duration: string | null;
    confidence: number;
    needsVerification: boolean;
  }>;
  prescriptionDate: string | null;
  dispensingDate: string | null;
  rawText: string;
}

type QuickUploadStage = "upload" | "review" | "form";

export default function Home() {
  const [, navigate] = useLocation();
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [quickUploadOpen, setQuickUploadOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [quickUploadStage, setQuickUploadStage] = useState<QuickUploadStage>("upload");
  const [ocrResult, setOcrResult] = useState<OcrPreviewResult | null>(null);
  const [quickFormData, setQuickFormData] = useState({
    hospitalName: "",
    chiefComplaint: "",
    doctorDiagnosis: "",
    prescriptionDate: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { hasConsented } = useConsentStatus();

  useEffect(() => {
    if (!hasConsented) {
      setShowConsentDialog(true);
    }
  }, [hasConsented]);

  const { data: hospitals = [], isLoading } = useQuery<Hospital[]>({
    queryKey: ["/api/hospitals"],
  });

  // OCR 미리보기 mutation
  const ocrPreviewMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsProcessing(true);
      const formData = new FormData();
      formData.append("documents", file);

      const response = await fetch("/api/prescriptions/ocr-preview", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "이미지 분석에 실패했습니다");
      }

      return response.json() as Promise<OcrPreviewResult>;
    },
    onSuccess: (result) => {
      setOcrResult(result);
      // OCR에서 처방일 추출되면 자동 채우기
      if (result.prescriptionDate) {
        setQuickFormData(prev => ({
          ...prev,
          prescriptionDate: result.prescriptionDate || "",
        }));
      }
      setQuickUploadStage("review");
    },
    onError: (error) => {
      toast({
        title: "분석 실패",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // 최종 저장 mutation
  const quickUploadMutation = useMutation({
    mutationFn: async () => {
      if (!ocrResult) {
        throw new Error("OCR 데이터가 없습니다");
      }

      setIsProcessing(true);
      const formData = new FormData();
      // 파일이 있으면 추가 (OCR 재실행), 없으면 이미 추출된 데이터만 사용
      if (uploadedFile) {
        formData.append("documents", uploadedFile);
      }
      formData.append("hospitalName", quickFormData.hospitalName);
      formData.append("chiefComplaint", quickFormData.chiefComplaint);
      formData.append("doctorDiagnosis", quickFormData.doctorDiagnosis);
      formData.append("prescriptionDate", quickFormData.prescriptionDate);
      formData.append("dispensingDate", ocrResult.dispensingDate || "");
      formData.append("medications", JSON.stringify(ocrResult.medications));
      formData.append("rawOcrText", ocrResult.rawText);

      const response = await fetch("/api/prescriptions/quick-upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "저장에 실패했습니다");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions-with-meds"] });
      toast({
        title: "저장 완료",
        description: "처방 기록이 저장되었습니다.",
      });
      setQuickUploadOpen(false);
      resetQuickUpload();
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  const resetQuickUpload = () => {
    setUploadedFile(null);
    setOcrResult(null);
    setQuickUploadStage("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setQuickFormData({
      hospitalName: "",
      chiefComplaint: "",
      doctorDiagnosis: "",
      prescriptionDate: "",
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleContinue = () => {
    if (selectedHospital) {
      navigate(`/intake?hospitalId=${selectedHospital.id}&hospitalName=${encodeURIComponent(selectedHospital.name)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">진료 연속성 서비스</h1>
          <p className="text-muted-foreground">
            처방전과 조제기록을 바탕으로 의료진에게<br />
            이전 진료 내용을 쉽게 전달하세요
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 mb-8">
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">2-3분 접수</p>
              <p className="text-xs text-muted-foreground mt-1">대기 시간에 간편 작성</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">안전한 공유</p>
              <p className="text-xs text-muted-foreground mt-1">10분 제한 일회성 코드</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-2">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">QR로 전달</p>
              <p className="text-xs text-muted-foreground mt-1">의료진에게 간편 공유</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>방문하실 병원 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <HospitalSearch 
              hospitals={hospitals}
              onSelect={setSelectedHospital}
              selectedId={selectedHospital?.id}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 mb-6">
          <Button
            size="lg"
            className="w-full gap-2"
            disabled={!selectedHospital}
            onClick={handleContinue}
            data-testid="button-start-intake"
          >
            접수 시작하기
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full gap-2"
            onClick={() => setQuickUploadOpen(true)}
            data-testid="button-quick-upload"
          >
            <Camera className="h-5 w-5" />
            빠른 처방 기록
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate("/my-intakes")}
            data-testid="button-my-intakes"
          >
            내 접수 기록 보기
          </Button>
        </div>

        <MedicationHistoryCard />
      </main>

      <Dialog open={quickUploadOpen} onOpenChange={(open) => {
        setQuickUploadOpen(open);
        if (!open) resetQuickUpload();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {quickUploadStage === "upload" && "빠른 처방 기록"}
              {quickUploadStage === "review" && "추출 결과 확인"}
              {quickUploadStage === "form" && "추가 정보 입력"}
            </DialogTitle>
            <DialogDescription>
              {quickUploadStage === "upload" && "처방전이나 약봉지 사진을 업로드하세요"}
              {quickUploadStage === "review" && "AI가 추출한 약물 정보를 확인하세요"}
              {quickUploadStage === "form" && "병원 정보와 진단 내용을 입력하세요"}
            </DialogDescription>
          </DialogHeader>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-quick-upload-file"
          />

          {quickUploadStage === "upload" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>처방전/약봉지 사진</Label>
                {uploadedFile ? (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted">
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm truncate">{uploadedFile.name}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setUploadedFile(null)}
                      data-testid="button-remove-file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-select-file"
                  >
                    <Camera className="h-4 w-4" />
                    사진 선택
                  </Button>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setQuickUploadOpen(false)}
                  data-testid="button-cancel-quick-upload"
                >
                  취소
                </Button>
                <Button
                  onClick={() => uploadedFile && ocrPreviewMutation.mutate(uploadedFile)}
                  disabled={!uploadedFile || isProcessing}
                  data-testid="button-analyze-ocr"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      분석하기
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {quickUploadStage === "review" && ocrResult && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>추출된 약물 ({ocrResult.medications.length}개)</Label>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {ocrResult.medications.map((med, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-md border ${med.needsVerification ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : 'bg-muted'}`}
                      data-testid={`med-item-${idx}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{med.medicationName}</span>
                        <span className={`text-xs ${med.confidence >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {med.confidence}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {[med.dose, med.frequency, med.duration].filter(Boolean).join(" | ") || "용량 정보 없음"}
                      </div>
                    </div>
                  ))}
                  {ocrResult.medications.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      추출된 약물이 없습니다
                    </div>
                  )}
                </div>
              </div>

              {ocrResult.prescriptionDate && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">처방일: {ocrResult.prescriptionDate}</span>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOcrResult(null);
                    setUploadedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                    setQuickUploadStage("upload");
                  }}
                  data-testid="button-reupload"
                >
                  다시 업로드
                </Button>
                <Button
                  onClick={() => setQuickUploadStage("form")}
                  data-testid="button-confirm-ocr"
                >
                  확인
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {quickUploadStage === "form" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="quickHospitalName">병원/약국 이름</Label>
                <Input
                  id="quickHospitalName"
                  value={quickFormData.hospitalName}
                  onChange={(e) => setQuickFormData({ ...quickFormData, hospitalName: e.target.value })}
                  placeholder="예: 서울대학교병원, 온누리약국"
                  data-testid="input-quick-hospital-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quickChiefComplaint">증상</Label>
                <Input
                  id="quickChiefComplaint"
                  value={quickFormData.chiefComplaint}
                  onChange={(e) => setQuickFormData({ ...quickFormData, chiefComplaint: e.target.value })}
                  placeholder="예: 감기, 두통, 위염"
                  data-testid="input-quick-chief-complaint"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quickDoctorDiagnosis">의사 진단명</Label>
                <Input
                  id="quickDoctorDiagnosis"
                  value={quickFormData.doctorDiagnosis}
                  onChange={(e) => setQuickFormData({ ...quickFormData, doctorDiagnosis: e.target.value })}
                  placeholder="예: 급성 상기도 감염"
                  data-testid="input-quick-doctor-diagnosis"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quickPrescriptionDate">
                  처방일 
                  {ocrResult?.prescriptionDate && (
                    <span className="text-xs text-muted-foreground ml-2">(자동 추출됨)</span>
                  )}
                </Label>
                <Input
                  id="quickPrescriptionDate"
                  type="date"
                  value={quickFormData.prescriptionDate}
                  onChange={(e) => setQuickFormData({ ...quickFormData, prescriptionDate: e.target.value })}
                  data-testid="input-quick-prescription-date"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setQuickUploadStage("review")}
                  data-testid="button-back-to-review"
                >
                  이전
                </Button>
                <Button
                  onClick={() => quickUploadMutation.mutate()}
                  disabled={isProcessing}
                  data-testid="button-confirm-quick-upload"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      저장 중...
                    </>
                  ) : (
                    "저장"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConsentDialog
        open={showConsentDialog}
        onAccept={() => setShowConsentDialog(false)}
        onDecline={() => navigate("/")}
      />
    </div>
  );
}
