import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { HospitalSearch } from "@/components/hospital-search";
import { MedicationHistoryCard } from "@/components/medication-history-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowRight, Shield, Clock, Smartphone } from "lucide-react";
import type { Hospital } from "@shared/schema";

function getDeviceId(): string {
  const DEVICE_ID_KEY = "medbridge_device_id";
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export default function Home() {
  const [, navigate] = useLocation();
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [deviceId] = useState(() => getDeviceId());

  const { data: hospitals = [], isLoading } = useQuery<Hospital[]>({
    queryKey: ["/api/hospitals"],
  });

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
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate("/my-intakes")}
            data-testid="button-my-intakes"
          >
            내 접수 기록 보기
          </Button>
        </div>

        <MedicationHistoryCard deviceId={deviceId} />
      </main>
    </div>
  );
}
