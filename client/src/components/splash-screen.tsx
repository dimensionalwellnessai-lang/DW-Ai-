import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoImage from "@assets/generated_images/minimalist_eye_wellness_logo.png";
import { BRAND } from "@/config/brand";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<"closed" | "opening" | "open" | "fading">("closed");

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase("opening"), 300);
    const timer2 = setTimeout(() => setPhase("open"), 1200);
    const timer3 = setTimeout(() => setPhase("fading"), 3800);
    const timer4 = setTimeout(() => {
      onComplete();
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === "fading" ? 0 : 1 }}
        transition={{ duration: 0.7 }}
      >
        <div className="relative flex flex-col items-center">
          <div className="relative w-32 h-32 mb-6">
            <motion.div
              className="absolute inset-0 bg-background z-10"
              style={{ originY: 0 }}
              initial={{ scaleY: 0.5 }}
              animate={{ 
                scaleY: phase === "closed" ? 0.5 : 0,
                y: phase === "closed" ? 0 : -64
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 bg-background z-10"
              style={{ originY: 1 }}
              initial={{ scaleY: 0.5 }}
              animate={{ 
                scaleY: phase === "closed" ? 0.5 : 0,
                y: phase === "closed" ? 0 : 64
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            <motion.img
              src={logoImage}
              alt={BRAND.appName}
              className="w-full h-full object-contain rounded-2xl"
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ 
                scale: phase === "open" || phase === "fading" ? 1 : 0.8,
                opacity: phase === "open" || phase === "fading" ? 1 : 0.5
              }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <motion.h1
            className="text-3xl font-display font-bold text-foreground mb-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: phase === "open" || phase === "fading" ? 1 : 0,
              y: phase === "open" || phase === "fading" ? 0 : 10
            }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {BRAND.appName}
          </motion.h1>

          <motion.p
            className="text-sm text-muted-foreground/80 tracking-wide uppercase mb-3"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: phase === "open" || phase === "fading" ? 1 : 0
            }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {BRAND.descriptor}
          </motion.p>

          <motion.p
            className="text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: phase === "open" || phase === "fading" ? 1 : 0
            }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {BRAND.tagline}
          </motion.p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function useSplashScreen() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return { showSplash, handleSplashComplete };
}
