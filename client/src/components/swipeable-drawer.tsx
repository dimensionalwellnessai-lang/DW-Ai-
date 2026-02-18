import { useRef, useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DIRECTION_LOCK_THRESHOLD = 20;
const SWIPE_CLOSE_THRESHOLD = -80;
const HORIZONTAL_BIAS = 1.5;

interface SwipeableDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
  elevated?: boolean;
}

export function SwipeableDrawer({ 
  open, 
  onClose, 
  title, 
  children,
  width = "w-64",
  elevated = false
}: SwipeableDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const directionLocked = useRef<"horizontal" | "vertical" | null>(null);
  const isTracking = useRef(false);

  useEffect(() => {
    if (open) {
      setTranslateX(0);
      directionLocked.current = null;
      isTracking.current = false;
    }
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = e.touches[0].clientX;
    currentY.current = e.touches[0].clientY;
    directionLocked.current = null;
    isTracking.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTracking.current) return;

    currentX.current = e.touches[0].clientX;
    currentY.current = e.touches[0].clientY;

    const diffX = currentX.current - startX.current;
    const diffY = currentY.current - startY.current;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    if (directionLocked.current === null) {
      if (absDiffX < DIRECTION_LOCK_THRESHOLD && absDiffY < DIRECTION_LOCK_THRESHOLD) {
        return;
      }
      if (absDiffX > absDiffY * HORIZONTAL_BIAS && diffX < 0) {
        directionLocked.current = "horizontal";
      } else {
        directionLocked.current = "vertical";
      }
    }

    if (directionLocked.current === "horizontal") {
      e.preventDefault();
      if (diffX < 0) {
        setTranslateX(diffX);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isTracking.current) return;
    isTracking.current = false;

    if (directionLocked.current === "horizontal") {
      const diff = currentX.current - startX.current;
      if (diff < SWIPE_CLOSE_THRESHOLD) {
        onClose();
      } else {
        setTranslateX(0);
      }
    } else {
      setTranslateX(0);
    }

    directionLocked.current = null;
  };

  if (!open) return null;

  return (
    <div 
      className={`fixed inset-0 bg-background/60 backdrop-blur-sm ${elevated ? "z-[10001]" : "z-[60]"}`}
      style={{
        top: "calc(max(env(safe-area-inset-top, 0px), 24px) + 52px)"
      }}
      onClick={onClose}
      data-testid="swipeable-drawer-overlay"
      data-elevated={elevated ? "true" : "false"}
    >
      <div 
        ref={drawerRef}
        className={`absolute left-0 top-0 h-full ${width} bg-background text-foreground glass-strong dark:border-r-white/10 border-r px-4 flex flex-col safe-area-bottom ${
          directionLocked.current === "horizontal" ? "" : "transition-transform duration-200"
        }`}
        style={{ 
          paddingTop: "12px",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
          transform: `translateX(${translateX}px)`,
          overscrollBehavior: "contain"
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-display font-semibold text-foreground">{title}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            data-testid="button-close-drawer"
          >
            <X className="h-5 w-5 text-foreground" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col" style={{ WebkitOverflowScrolling: "touch" }}>
          {children}
        </div>
        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
          <div className="w-8 h-1 bg-muted-foreground/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
