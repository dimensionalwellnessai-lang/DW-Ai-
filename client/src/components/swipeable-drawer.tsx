import { useRef, useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SwipeableDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export function SwipeableDrawer({ 
  open, 
  onClose, 
  title, 
  children,
  width = "w-64"
}: SwipeableDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  useEffect(() => {
    if (open) {
      setTranslateX(0);
    }
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    if (diff < 0) {
      setTranslateX(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    const diff = currentX.current - startX.current;
    if (diff < -80) {
      onClose();
    } else {
      setTranslateX(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    currentX.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    currentX.current = e.clientX;
    const diff = currentX.current - startX.current;
    if (diff < 0) {
      setTranslateX(diff);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = currentX.current - startX.current;
    if (diff < -80) {
      onClose();
    } else {
      setTranslateX(0);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/40" 
      onClick={onClose}
    >
      <div 
        ref={drawerRef}
        className={`absolute left-0 top-0 h-full ${width} bg-background border-r p-4 flex flex-col touch-pan-y ${
          isDragging ? "" : "transition-transform duration-200"
        }`}
        style={{ transform: `translateX(${translateX}px)` }}
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
          <span className="font-display font-semibold">{title}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            data-testid="button-close-drawer"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
          <div className="w-8 h-1 bg-muted-foreground/20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
