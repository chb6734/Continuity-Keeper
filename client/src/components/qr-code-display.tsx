import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, RefreshCw, Clock, Copy, Check, Share2 } from "lucide-react";
import { differenceInSeconds, parseISO } from "date-fns";

interface QRCodeDisplayProps {
  token: string;
  expiresAt: string;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

export function QRCodeDisplay({ 
  token, 
  expiresAt, 
  onRegenerate,
  isRegenerating = false
}: QRCodeDisplayProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [copied, setCopied] = useState(false);

  const viewUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/view/${token}` 
    : `/view/${token}`;

  useEffect(() => {
    const updateRemaining = () => {
      const expiry = parseISO(expiresAt);
      const remaining = differenceInSeconds(expiry, new Date());
      setRemainingSeconds(Math.max(0, remaining));
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const isExpired = remainingSeconds <= 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(viewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "진료 요약 보기",
          text: "환자 진료 요약을 확인하세요",
          url: viewUrl,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-4 text-muted-foreground">
          <Clock className="h-4 w-4" />
          {isExpired ? (
            <span className="text-red-600 dark:text-red-400 font-medium">
              만료됨
            </span>
          ) : (
            <span>
              {minutes}:{seconds.toString().padStart(2, "0")} 남음
            </span>
          )}
        </div>

        <div className="relative mb-6">
          <div 
            className={`
              flex h-72 w-72 items-center justify-center rounded-xl bg-white p-4
              ${isExpired ? "opacity-50" : ""}
            `}
          >
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(viewUrl)}`}
              alt="QR 코드"
              className="h-60 w-60"
              data-testid="img-qr-code"
            />
          </div>
          {isExpired && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl">
              <span className="text-lg font-medium text-muted-foreground">
                만료됨
              </span>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mb-4 max-w-xs">
          의료진에게 이 QR 코드를 보여주세요
        </p>

        <div className="flex flex-col w-full gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={copyToClipboard}
              data-testid="button-copy-link"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  링크 복사
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleShare}
              data-testid="button-share"
            >
              <Share2 className="h-4 w-4" />
              공유
            </Button>
          </div>
          <Button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="w-full gap-2"
            data-testid="button-regenerate-qr"
          >
            <RefreshCw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
            {isExpired ? "새 코드 생성" : "코드 재발급"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          * 재발급 시 이전 코드는 즉시 무효화됩니다
        </p>
      </CardContent>
    </Card>
  );
}
