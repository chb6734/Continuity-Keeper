import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationCenter } from "@/components/notification-center";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity } from "lucide-react";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  backPath?: string;
  showNotifications?: boolean;
}

function getOrCreateDeviceId(): string {
  const key = "medbridge_device_id";
  let deviceId = localStorage.getItem(key);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
}

export function Header({ title, showBack = false, backPath = "/", showNotifications = true }: HeaderProps) {
  const [, navigate] = useLocation();
  const [deviceId, setDeviceId] = useState<string>("");

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId());
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          {showBack ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(backPath)}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">뒤로가기</span>
            </Button>
          ) : (
            <Link href="/" className="flex items-center gap-2" data-testid="link-home">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">MedBridge</span>
            </Link>
          )}
          {title && (
            <span className="font-medium text-foreground">{title}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showNotifications && deviceId && (
            <NotificationCenter deviceId={deviceId} />
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
