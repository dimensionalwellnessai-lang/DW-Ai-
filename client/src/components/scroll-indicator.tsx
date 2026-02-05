import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScrollIndicatorProps {
  /** Whether to show the indicator */
  show: boolean;
  /** Optional custom message */
  message?: string;
  /** Target element ID to scroll to when clicked */
  targetId?: string;
  /** Position from bottom in pixels */
  bottomOffset?: number;
}

/**
 * A subtle scroll indicator that shows when there's more content below the viewport
 * Automatically fades out as user scrolls down
 */
export function ScrollIndicator({
  show,
  message = "More below",
  targetId,
  bottomOffset = 100,
}: ScrollIndicatorProps) {
  const [isVisible, setIsVisible] = useState(show);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    setIsVisible(show && !hasScrolled);
  }, [show, hasScrolled]);

  useEffect(() => {
    const handleScroll = () => {
      // Hide indicator once user scrolls down a bit
      if (window.scrollY > 100) {
        setHasScrolled(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    if (targetId) {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "fixed left-1/2 -translate-x-1/2 z-50",
            "flex flex-col items-center gap-1",
            targetId ? "cursor-pointer" : ""
          )}
          style={{ bottom: `${bottomOffset}px` }}
          onClick={targetId ? handleClick : undefined}
        >
          <span className="text-xs text-muted-foreground font-medium px-3 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm">
            {message}
          </span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
