import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, QrCode, Shield, Clock, Pill, Bell } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">MedBridge</h1>
          <p className="text-xl text-muted-foreground mb-2">
            진료 연속성 서비스
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            처방전 사진을 업로드하고, 새로운 의료기관에 방문할 때 
            QR 코드로 간편하게 약물 정보를 공유하세요.
          </p>
        </div>

        <div className="flex justify-center mb-12">
          <Button 
            size="lg" 
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            로그인 / 회원가입
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">처방전 OCR</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                처방전이나 조제기록 사진을 업로드하면 AI가 자동으로 
                약물 정보를 추출합니다.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">QR 코드 공유</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                10분간 유효한 일회용 QR 코드로 의료진에게 
                안전하게 정보를 공유할 수 있습니다.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">보안 우선</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                원본 이미지는 서버에 저장되지 않으며, 
                모든 접근 기록이 로깅됩니다.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">증상 이력 추적</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                같은 증상으로 과거에 어떤 약을 처방받았는지 
                한눈에 확인할 수 있습니다.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">약물 기록 관리</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                모든 처방 기록을 한 곳에서 관리하고, 
                성분과 용법을 확인할 수 있습니다.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">알림 시스템</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                의료진이 정보를 조회하면 알림을 받고, 
                복약 알림도 설정할 수 있습니다.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Google, GitHub, Apple 계정으로 간편하게 로그인하세요.</p>
        </div>
      </div>
    </div>
  );
}
