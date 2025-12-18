import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { HospitalSearch } from "@/components/hospital-search";
import { MedicationHistoryCard } from "@/components/medication-history-card";
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

export default function Home() {
  const [, navigate] = useLocation();
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [quickUploadOpen, setQuickUploadOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quickFormData, setQuickFormData] = useState({
    hospitalName: "",
    chiefComplaint: "",
    prescriptionDate: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: hospitals = [], isLoading } = useQuery<Hospital[]>({
    queryKey: ["/api/hospitals"],
  });

  const quickUploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadedFile) {
        throw new Error("파일을 선택해주세요");
      }

      setIsProcessing(true);
      const formData = new FormData();
      formData.append("documents", uploadedFile);
      formData.append("hospitalName", quickFormData.hospitalName);
      formData.append("chiefComplaint", quickFormData.chiefComplaint);
      formData.append("prescriptionDate", quickFormData.prescriptionDate);

      const response = await fetch("/api/prescriptions/quick-upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "업로드에 실패했습니다");
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
    setQuickFormData({
      hospitalName: "",
      chiefComplaint: "",
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
            <DialogTitle>빠른 처방 기록</DialogTitle>
            <DialogDescription>
              처방전이나 약봉지 사진을 업로드하고 간단한 정보를 입력하세요
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>처방전/약봉지 사진</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-quick-upload-file"
              />
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
              <Label htmlFor="quickChiefComplaint">진단/증상</Label>
              <Input
                id="quickChiefComplaint"
                value={quickFormData.chiefComplaint}
                onChange={(e) => setQuickFormData({ ...quickFormData, chiefComplaint: e.target.value })}
                placeholder="예: 감기, 두통, 위염"
                data-testid="input-quick-chief-complaint"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quickPrescriptionDate">처방일 (선택)</Label>
              <Input
                id="quickPrescriptionDate"
                type="date"
                value={quickFormData.prescriptionDate}
                onChange={(e) => setQuickFormData({ ...quickFormData, prescriptionDate: e.target.value })}
                data-testid="input-quick-prescription-date"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickUploadOpen(false)}
              data-testid="button-cancel-quick-upload"
            >
              취소
            </Button>
            <Button
              onClick={() => quickUploadMutation.mutate()}
              disabled={!uploadedFile || isProcessing}
              data-testid="button-confirm-quick-upload"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  분석 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
