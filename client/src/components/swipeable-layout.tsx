import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { AIWorkspace } from "@/components/ai-workspace";
import BrowsePage from "@/pages/browse";
import { CalendarPlansPage } from "@/pages/calendar-plans";
import RoutinesPage from "@/pages/routines";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SCREENS = [
  { id: "chat", label: "Chat", component: AIWorkspace },
  { id: "browse", label: "Browse", component: BrowsePage },
  { id: "calendar", label: "Calendar", component: CalendarPlansPage },
  { id: "routines", label: "Routines", component: RoutinesPage },
];

export function SwipeableLayout() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    startIndex: 0,
    watchDrag: true,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div
      className="h-dvh min-h-dvh w-full overflow-hidden relative"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") emblaApi?.scrollNext();
        else if (e.key === "ArrowLeft") emblaApi?.scrollPrev();
      }}
    >
      <div
        ref={emblaRef}
        className="h-full overflow-hidden"
        role="region"
        aria-label="Swipeable views"
        aria-roledescription="carousel"
      >
        <div className="flex h-full">
          {SCREENS.map((screen, idx) => {
            const Component = screen.component;
            return (
              <div 
                key={screen.id} 
                className="flex-[0_0_100%] min-w-0 h-full overflow-hidden"
                role="group"
                aria-roledescription="slide"
                aria-label={`${screen.label} (${idx + 1} of ${SCREENS.length})`}
              >
                <Component />
              </div>
            );
          })}
        </div>
      </div>
      
      {canScrollPrev && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-40 pointer-events-none" aria-hidden="true">
          <div className="flex items-center gap-1 text-muted-foreground/40">
            <ChevronLeft className="h-5 w-5 animate-pulse" />
          </div>
        </div>
      )}
      
      {canScrollNext && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-40 pointer-events-none" aria-hidden="true">
          <div className="flex items-center gap-1 text-muted-foreground/40">
            <ChevronRight className="h-5 w-5 animate-pulse" />
          </div>
        </div>
      )}

      <div
        className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 flex gap-1.5"
        role="tablist"
        aria-label="View navigation"
      >
        {SCREENS.map((screen, idx) => (
          <button
            key={screen.id}
            role="tab"
            aria-selected={selectedIndex === idx}
            aria-label={screen.label}
            onClick={() => emblaApi?.scrollTo(idx)}
            className={`w-1.5 h-1.5 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              selectedIndex === idx 
                ? "bg-primary w-4" 
                : "bg-muted-foreground/30"
            }`}
            data-testid={`dot-${screen.id}`}
          />
        ))}
      </div>
    </div>
  );
}
