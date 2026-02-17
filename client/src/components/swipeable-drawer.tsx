import { useRef, useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Swipe gesture thresholds
const HORIZONTAL_SWIPE_THRESHOLD = 10; // Minimum horizontal movement to detect swipe
const SWIPE_CLOSE_THRESHOLD = -80; // Minimum swipe distance to trigger close

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
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  useEffect(() => {
    if (open) {
      setTranslateX(0);
      isHorizontalSwipe.current = null;
    }
  }, [open]);

  // Helper function to update gesture state during move
  const updateGesture = () => {
    // Determine swipe direction once movement is significant
    if (isHorizontalSwipe.current === null) {
      const diffX = Math.abs(currentX.current - startX.current);
      const diffY = Math.abs(currentY.current - startY.current);

      // If movement is still small on both axes, don't decide yet
      if (diffX <= HORIZONTAL_SWIPE_THRESHOLD && diffY <= HORIZONTAL_SWIPE_THRESHOLD) {
        return;
      }
      
      // Lock direction once one axis clearly dominates
      isHorizontalSwipe.current = diffX > diffY;
    }
    
    // Only apply translation for horizontal swipes
    if (isHorizontalSwipe.current) {
      const diff = currentX.current - startX.current;
      if (diff < 0) {
        setTranslateX(diff);
      }
    }
  };

  // Helper function to finalize gesture on end
  const finalizeGesture = () => {
    setIsDragging(false);
    
    // Only close if it was a horizontal swipe
    if (isHorizontalSwipe.current) {
      const diff = currentX.current - startX.current;
      if (diff < SWIPE_CLOSE_THRESHOLD) {
        onClose();
      } else {
        setTranslateX(0);
      }
    } else {
      setTranslateX(0);
    }
    
    isHorizontalSwipe.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = e.touches[0].clientX;
    currentY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentX.current = e.touches[0].clientX;
    currentY.current = e.touches[0].clientY;
    
    updateGesture();
  };

  const handleTouchEnd = () => {
    finalizeGesture();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    currentX.current = e.clientX;
    currentY.current = e.clientY;
    isHorizontalSwipe.current = null;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    currentX.current = e.clientX;
    currentY.current = e.clientY;
    
    updateGesture();
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    finalizeGesture();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  if (!open) return null;

  return (
    <div 
      className={`fixed inset-0 bg-background/60 backdrop-blur-sm ${elevated ? "z-[10001]" : "z-[60]"}`}
      style={{
        top: "calc(max(env(safe-area-inset-top, 0px), 24px) + 52px)" /* Below status bar + header */
      }}
      onClick={onClose}
      data-testid="swipeable-drawer-overlay"
      data-elevated={elevated ? "true" : "false"}
    >
      <div 
        ref={drawerRef}
        className={`absolute left-0 top-0 h-full ${width} bg-background text-foreground glass-strong dark:border-r-white/10 border-r px-4 flex flex-col touch-pan-y safe-area-bottom ${
          isDragging ? "" : "transition-transform duration-200"
        }`}
        style={{ 
          paddingTop: "12px",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
          transform: `translateX(${translateX}px)` 
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
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
        <div className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </div>
        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
          <div className="w-8 h-1 bg-muted-foreground/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
