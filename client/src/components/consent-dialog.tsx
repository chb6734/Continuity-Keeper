import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText, Users, Trash2, Clock, Eye } from "lucide-react";

interface ConsentDialogProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentDialog({ open, onAccept, onDecline }: ConsentDialogProps) {
  const [consentChecked, setConsentChecked] = useState({
    dataCollection: false,
    thirdPartySharing: false,
    dataRetention: false,
  });

  const allChecked = Object.values(consentChecked).every(Boolean);

  const handleAccept = () => {
    if (allChecked) {
      localStorage.setItem("medbridge_consent_accepted", "true");
      localStorage.setItem("medbridge_consent_date", new Date().toISOString());
      onAccept();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            개인정보 수집 및 이용 동의
          </DialogTitle>
          <DialogDescription>
            서비스 이용을 위해 아래 내용을 확인하고 동의해주세요
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 max-h-[50vh]">
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-sm">수집하는 정보</h4>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                    <li>처방전/조제기록 사진에서 추출된 약물 정보</li>
                    <li>입력하신 증상, 경과, 부작용 정보</li>
                    <li>선택하신 방문 병원 정보</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                <Checkbox
                  id="dataCollection"
                  checked={consentChecked.dataCollection}
                  onCheckedChange={(checked) =>
                    setConsentChecked({ ...consentChecked, dataCollection: !!checked })
                  }
                  data-testid="checkbox-data-collection"
                />
                <label htmlFor="dataCollection" className="text-sm cursor-pointer">
                  정보 수집에 동의합니다
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-sm">제3자 제공</h4>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                    <li>제공 대상: 귀하가 선택한 의료기관의 의료진</li>
                    <li>제공 항목: 약물 정보, 증상/경과 요약</li>
                    <li>제공 방식: 일회용 QR 코드 (10분 후 만료)</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                <Checkbox
                  id="thirdPartySharing"
                  checked={consentChecked.thirdPartySharing}
                  onCheckedChange={(checked) =>
                    setConsentChecked({ ...consentChecked, thirdPartySharing: !!checked })
                  }
                  data-testid="checkbox-third-party"
                />
                <label htmlFor="thirdPartySharing" className="text-sm cursor-pointer">
                  의료진에게 정보 제공에 동의합니다
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-sm">보관 및 파기</h4>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                    <li>원본 이미지는 저장하지 않습니다 (OCR 후 즉시 삭제)</li>
                    <li>접근 토큰은 10분 후 자동 만료됩니다</li>
                    <li>언제든지 접수 기록을 직접 삭제할 수 있습니다</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                <Checkbox
                  id="dataRetention"
                  checked={consentChecked.dataRetention}
                  onCheckedChange={(checked) =>
                    setConsentChecked({ ...consentChecked, dataRetention: !!checked })
                  }
                  data-testid="checkbox-data-retention"
                />
                <label htmlFor="dataRetention" className="text-sm cursor-pointer">
                  보관 정책에 동의합니다
                </label>
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">귀하의 권리</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>언제든지 동의를 철회하고 계정을 삭제할 수 있습니다</li>
                <li>접수 기록은 개별적으로 삭제할 수 있습니다</li>
                <li>개인정보 관련 문의: support@medbridge.kr</li>
              </ul>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onDecline}
            data-testid="button-decline-consent"
          >
            동의하지 않음
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!allChecked}
            data-testid="button-accept-consent"
          >
            모두 동의하고 시작하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useConsentStatus() {
  const hasConsented = localStorage.getItem("medbridge_consent_accepted") === "true";
  const consentDate = localStorage.getItem("medbridge_consent_date");

  const resetConsent = () => {
    localStorage.removeItem("medbridge_consent_accepted");
    localStorage.removeItem("medbridge_consent_date");
  };

  return { hasConsented, consentDate, resetConsent };
}
