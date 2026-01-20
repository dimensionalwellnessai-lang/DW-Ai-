import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Activity, Shield, Clock, Footprints, Package, Zap } from "lucide-react";
import { motion } from "framer-motion";
import {
  getProfileSetup,
  saveProfileSetup,
  type MobilityCapabilities,
  type MobilityLevel,
  type FloorComfort,
  type IntensityPreference,
  type StandingTolerance,
} from "@/lib/guest-storage";

interface MobilityCapabilitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOBILITY_OPTIONS: { id: MobilityLevel; label: string; description: string }[] = [
  { id: "full", label: "Full mobility", description: "No significant limitations" },
  { id: "some_limits", label: "Some limits", description: "A few areas need care" },
  { id: "major_limits", label: "Major limits", description: "Significant restrictions" },
];

const PROTECT_AREAS = [
  "knees", "back", "shoulders", "hips", "wrists", "ankles", "neck", "core"
];

const STANDING_OPTIONS: { id: StandingTolerance; label: string }[] = [
  { id: "5", label: "~5 minutes" },
  { id: "10", label: "~10 minutes" },
  { id: "20+", label: "20+ minutes" },
];

const FLOOR_OPTIONS: { id: FloorComfort; label: string }[] = [
  { id: "yes", label: "Comfortable on floor" },
  { id: "sometimes", label: "Sometimes okay" },
  { id: "no", label: "Prefer not on floor" },
];

const EQUIPMENT_OPTIONS = [
  "none", "yoga mat", "resistance bands", "dumbbells", "chair", "foam roller", "stability ball"
];

const INTENSITY_OPTIONS: { id: IntensityPreference; label: string; description: string }[] = [
  { id: "gentle", label: "Gentle", description: "Low effort, restorative" },
  { id: "moderate", label: "Moderate", description: "Balanced effort" },
  { id: "intense", label: "Intense", description: "Challenging, high effort" },
];

export function MobilityCapabilitiesModal({ isOpen, onClose }: MobilityCapabilitiesModalProps) {
  const [mobilityLevel, setMobilityLevel] = useState<MobilityLevel | null>(null);
  const [protectAreas, setProtectAreas] = useState<string[]>([]);
  const [standingTolerance, setStandingTolerance] = useState<StandingTolerance | null>(null);
  const [floorComfort, setFloorComfort] = useState<FloorComfort | null>(null);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<IntensityPreference | null>(null);
  const [avoidNotes, setAvoidNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      const profile = getProfileSetup();
      const caps = profile?.mobilityCapabilities;
      if (caps) {
        setMobilityLevel(caps.mobilityLevel);
        setProtectAreas(caps.protectAreas || []);
        setStandingTolerance(caps.standingTolerance);
        setFloorComfort(caps.floorComfort);
        setEquipment(caps.equipment || []);
        setIntensity(caps.intensity);
        setAvoidNotes(caps.avoidNotes || "");
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleProtectArea = (area: string) => {
    setProtectAreas(prev => 
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const toggleEquipment = (item: string) => {
    setEquipment(prev => 
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  const handleSave = () => {
    const capabilities: MobilityCapabilities = {
      mobilityLevel,
      protectAreas,
      standingTolerance,
      floorComfort,
      equipment,
      intensity,
      avoidNotes,
    };
    saveProfileSetup({ mobilityCapabilities: capabilities });
    onClose();
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={onClose}
        data-testid="mobility-modal-backdrop"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border dark:border-white/10 rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-display font-semibold">Mobility & Capabilities</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-muted"
              data-testid="button-close-mobility"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="p-4 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Mobility Level</Label>
              </div>
              <div className="space-y-2">
                {MOBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setMobilityLevel(opt.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all border ${
                      mobilityLevel === opt.id
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-muted/50 hover-elevate"
                    }`}
                    data-testid={`option-mobility-${opt.id}`}
                  >
                    <span className="text-sm font-medium">{opt.label}</span>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Areas to Protect</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {PROTECT_AREAS.map((area) => (
                  <Badge
                    key={area}
                    variant={protectAreas.includes(area) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleProtectArea(area)}
                    data-testid={`option-protect-${area}`}
                  >
                    {area}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Standing Tolerance</Label>
              </div>
              <div className="flex gap-2">
                {STANDING_OPTIONS.map((opt) => (
                  <Badge
                    key={opt.id}
                    variant={standingTolerance === opt.id ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setStandingTolerance(opt.id)}
                    data-testid={`option-standing-${opt.id}`}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Footprints className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Floor Comfort</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {FLOOR_OPTIONS.map((opt) => (
                  <Badge
                    key={opt.id}
                    variant={floorComfort === opt.id ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFloorComfort(opt.id)}
                    data-testid={`option-floor-${opt.id}`}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Equipment Available</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map((item) => (
                  <Badge
                    key={item}
                    variant={equipment.includes(item) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleEquipment(item)}
                    data-testid={`option-equipment-${item.replace(/\s+/g, "-")}`}
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Intensity Preference</Label>
              </div>
              <div className="flex gap-2">
                {INTENSITY_OPTIONS.map((opt) => (
                  <Badge
                    key={opt.id}
                    variant={intensity === opt.id ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setIntensity(opt.id)}
                    data-testid={`option-intensity-${opt.id}`}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Movements to Avoid (optional)</Label>
              <Textarea
                placeholder="e.g., twisting motions, overhead reaching, deep squats..."
                value={avoidNotes}
                onChange={(e) => setAvoidNotes(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="input-avoid-notes"
              />
            </div>
          </div>

          <div className="sticky bottom-0 bg-card border-t p-4 flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel-mobility">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1" data-testid="button-save-mobility">
              Save Preferences
            </Button>
          </div>
        </motion.div>
      </div>
    </>
  );
}
