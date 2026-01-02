import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoImage from "@assets/generated_images/minimalist_eye_wellness_logo.png";

const SPLASH_SHOWN_KEY = "dwai_splash_shown";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<"closed" | "opening" | "open" | "fading">("closed");

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase("opening"), 300);
    const timer2 = setTimeout(() => setPhase("open"), 1200);
    const timer3 = setTimeout(() => setPhase("fading"), 2500);
    const timer4 = setTimeout(() => {
      localStorage.setItem(SPLASH_SHOWN_KEY, "true");
      onComplete();
    }, 3200);

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
              alt="Dimensional Wellness AI"
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
            className="text-2xl font-display font-semibold text-foreground mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: phase === "open" || phase === "fading" ? 1 : 0,
              y: phase === "open" || phase === "fading" ? 0 : 10
            }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Dimensional Wellness
          </motion.h1>

          <motion.p
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: phase === "open" || phase === "fading" ? 1 : 0
            }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Your life, your rhythm
          </motion.p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function useSplashScreen() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(SPLASH_SHOWN_KEY);
  });

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return { showSplash, handleSplashComplete };
}
