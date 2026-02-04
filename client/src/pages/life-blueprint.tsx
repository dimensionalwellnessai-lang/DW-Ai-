import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { motion } from "framer-motion";
import {
  Zap,
  Brain,
  Clock,
  Compass,
  Wallet,
  Users,
  Home,
  Sprout,
  CheckCircle2,
  Circle,
  AlertCircle,
  Sparkles,
  Save,
  Edit2,
  Plus,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DIMENSIONS = [
  { id: "body", label: "Body", icon: Zap, color: "text-red-400", bg: "bg-red-500/10" },
  { id: "mind", label: "Mind", icon: Brain, color: "text-purple-400", bg: "bg-purple-500/10" },
  { id: "time", label: "Time", icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
  { id: "purpose", label: "Purpose", icon: Compass, color: "text-amber-400", bg: "bg-amber-500/10" },
  { id: "money", label: "Money", icon: Wallet, color: "text-green-400", bg: "bg-green-500/10" },
  { id: "relationships", label: "Relationships", icon: Users, color: "text-pink-400", bg: "bg-pink-500/10" },
  { id: "environment", label: "Environment", icon: Home, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { id: "identity", label: "Identity", icon: Sprout, color: "text-emerald-400", bg: "bg-emerald-500/10" },
];

export default function LifeBlueprintPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDimension, setSelectedDimension] = useState<string>("body");
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editingResetProtocol, setEditingResetProtocol] = useState(false);

  // Fetch dimension blueprints
  const { data: blueprints = [] } = useQuery({
    queryKey: ['/api/dimension-blueprints'],
  });

  // Fetch reset protocol
  const { data: resetProtocol } = useQuery({
    queryKey: ['/api/reset-protocol'],
  });

  // Fetch completion status
  const { data: completionStatus } = useQuery({
    queryKey: ['/api/completion-status'],
  });

  // Create/update blueprint mutation
  const updateBlueprintMutation = useMutation({
    mutationFn: async (data: any) => {
      const existing = blueprints.find((b: any) => b.dimension === selectedDimension);
      if (existing) {
        const res = await fetch(`/api/dimension-blueprints/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        });
        return res.json();
      } else {
        const res = await fetch('/api/dimension-blueprints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ...data, dimension: selectedDimension }),
        });
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dimension-blueprints'] });
      queryClient.invalidateQueries({ queryKey: ['/api/completion-status'] });
      setEditMode(null);
      toast({ title: "Blueprint updated successfully!" });
    },
  });

  // Update reset protocol mutation
  const updateResetProtocolMutation = useMutation({
    mutationFn: async (data: any) => {
      if (resetProtocol?.id) {
        const res = await fetch(`/api/reset-protocol/${resetProtocol.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        });
        return res.json();
      } else {
        const res = await fetch('/api/reset-protocol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        });
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reset-protocol'] });
      queryClient.invalidateQueries({ queryKey: ['/api/completion-status'] });
      setEditingResetProtocol(false);
      toast({ title: "Reset Protocol updated successfully!" });
    },
  });

  const currentBlueprint = blueprints.find((b: any) => b.dimension === selectedDimension);
  const currentDimension = DIMENSIONS.find(d => d.id === selectedDimension);

  // Calculate completion percentage
  const completedDimensions = blueprints.length;
  const completionPercentage = (completedDimensions / 8) * 100;
  const resetProtocolComplete = resetProtocol && Object.keys(resetProtocol).some(k => 
    k !== 'id' && k !== 'userId' && k !== 'createdAt' && k !== 'updatedAt' && resetProtocol[k]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <PageHeader title="Life Blueprint" />
      <div className="container max-w-6xl mx-auto p-4 space-y-6">

        <Tabs defaultValue="dimensions" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="dimensions">8 Dimensions</TabsTrigger>
            <TabsTrigger value="reset">Reset Protocol</TabsTrigger>
          </TabsList>

          <TabsContent value="dimensions" className="space-y-6 mt-6">
            {/* Dimension Selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DIMENSIONS.map((dim) => {
                const Icon = dim.icon;
                const hasContent = blueprints.some((b: any) => b.dimension === dim.id);
                
                return (
                  <Card
                    key={dim.id}
                    className={`cursor-pointer transition-all ${
                      selectedDimension === dim.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedDimension(dim.id)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className={`p-3 rounded-lg ${dim.bg}`}>
                          <Icon className={`h-6 w-6 ${dim.color}`} />
                        </div>
                        <p className="font-medium text-sm">{dim.label}</p>
                        {hasContent ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Dimension Detail */}
            {currentDimension && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${currentDimension.bg}`}>
                        <currentDimension.icon className={`h-6 w-6 ${currentDimension.color}`} />
                      </div>
                      <div>
                        <CardTitle>{currentDimension.label} Dimension</CardTitle>
                        <CardDescription>Define your vision and values</CardDescription>
                      </div>
                    </div>
                    {!editMode && currentBlueprint && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMode(selectedDimension)}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {editMode === selectedDimension ? (
                    <BlueprintEditor
                      blueprint={currentBlueprint}
                      onSave={(data) => updateBlueprintMutation.mutate(data)}
                      onCancel={() => setEditMode(null)}
                    />
                  ) : currentBlueprint ? (
                    <BlueprintView blueprint={currentBlueprint} />
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <p className="text-muted-foreground">You haven't defined this dimension yet.</p>
                      <Button onClick={() => setEditMode(selectedDimension)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create {currentDimension.label} Blueprint
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reset" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Reset Protocol</CardTitle>
                    <CardDescription>Your personal recovery system for tough days</CardDescription>
                  </div>
                  {!editingResetProtocol && resetProtocol && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingResetProtocol(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingResetProtocol ? (
                  <ResetProtocolEditor
                    protocol={resetProtocol}
                    onSave={(data) => updateResetProtocolMutation.mutate(data)}
                    onCancel={() => setEditingResetProtocol(false)}
                  />
                ) : resetProtocolComplete ? (
                  <ResetProtocolView protocol={resetProtocol} />
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">You haven't set up your Reset Protocol yet.</p>
                    <Button onClick={() => setEditingResetProtocol(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Reset Protocol
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function BlueprintView({ blueprint }: { blueprint: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">✨ When I'm At My Best</h3>
        <p className="text-muted-foreground">{blueprint.whenAtMyBest || "Not defined"}</p>
      </div>
      <div>
        <h3 className="font-semibold mb-2">💎 What I Stand For</h3>
        {blueprint.whatIStandFor?.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {blueprint.whatIStandFor.map((value: string, i: number) => (
              <li key={i} className="text-muted-foreground">{value}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No values defined</p>
        )}
      </div>
      <div>
        <h3 className="font-semibold mb-2">🛠️ How This Supports Me</h3>
        {blueprint.howThisSupportsMe?.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {blueprint.howThisSupportsMe.map((tool: string, i: number) => (
              <li key={i} className="text-muted-foreground">{tool}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No tools defined</p>
        )}
      </div>
    </div>
  );
}

function BlueprintEditor({ blueprint, onSave, onCancel }: any) {
  const [whenAtMyBest, setWhenAtMyBest] = useState(blueprint?.whenAtMyBest || "");
  const [whatIStandFor, setWhatIStandFor] = useState<string[]>(blueprint?.whatIStandFor || []);
  const [howThisSupportsMe, setHowThisSupportsMe] = useState<string[]>(blueprint?.howThisSupportsMe || []);
  const [newValue, setNewValue] = useState("");
  const [newTool, setNewTool] = useState("");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>✨ When I'm At My Best</Label>
        <Textarea
          value={whenAtMyBest}
          onChange={(e) => setWhenAtMyBest(e.target.value)}
          placeholder="Describe what thriving looks like in this dimension..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>💎 What I Stand For</Label>
        <div className="space-y-2">
          {whatIStandFor.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={value} onChange={(e) => {
                const updated = [...whatIStandFor];
                updated[i] = e.target.value;
                setWhatIStandFor(updated);
              }} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWhatIStandFor(whatIStandFor.filter((_, idx) => idx !== i))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Add a value or principle..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newValue.trim()) {
                  setWhatIStandFor([...whatIStandFor, newValue.trim()]);
                  setNewValue("");
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (newValue.trim()) {
                  setWhatIStandFor([...whatIStandFor, newValue.trim()]);
                  setNewValue("");
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>🛠️ How This Supports Me</Label>
        <div className="space-y-2">
          {howThisSupportsMe.map((tool, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={tool} onChange={(e) => {
                const updated = [...howThisSupportsMe];
                updated[i] = e.target.value;
                setHowThisSupportsMe(updated);
              }} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHowThisSupportsMe(howThisSupportsMe.filter((_, idx) => idx !== i))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newTool}
              onChange={(e) => setNewTool(e.target.value)}
              placeholder="Add a tool or practice..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTool.trim()) {
                  setHowThisSupportsMe([...howThisSupportsMe, newTool.trim()]);
                  setNewTool("");
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (newTool.trim()) {
                  setHowThisSupportsMe([...howThisSupportsMe, newTool.trim()]);
                  setNewTool("");
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave({ whenAtMyBest, whatIStandFor, howThisSupportsMe })}>
          <Save className="h-4 w-4 mr-2" />
          Save Blueprint
        </Button>
      </div>
    </div>
  );
}

function ResetProtocolView({ protocol }: { protocol: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">🚨 Red Flags</h3>
        {protocol.redFlags?.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {protocol.redFlags.map((flag: string, i: number) => (
              <li key={i} className="text-muted-foreground">{flag}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No red flags defined</p>
        )}
      </div>
      <div>
        <h3 className="font-semibold mb-2">🔄 How I Reset</h3>
        {protocol.howIReset?.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {protocol.howIReset.map((action: string, i: number) => (
              <li key={i} className="text-muted-foreground">{action}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No reset actions defined</p>
        )}
      </div>
      <div>
        <h3 className="font-semibold mb-2">💪 When Things Get Hard</h3>
        {protocol.whenThingsGetHard?.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {protocol.whenThingsGetHard.map((plan: string, i: number) => (
              <li key={i} className="text-muted-foreground">{plan}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No backup plans defined</p>
        )}
      </div>
    </div>
  );
}

function ResetProtocolEditor({ protocol, onSave, onCancel }: any) {
  const [redFlags, setRedFlags] = useState<string[]>(protocol?.redFlags || []);
  const [howIReset, setHowIReset] = useState<string[]>(protocol?.howIReset || []);
  const [whenThingsGetHard, setWhenThingsGetHard] = useState<string[]>(protocol?.whenThingsGetHard || []);
  const [newRedFlag, setNewRedFlag] = useState("");
  const [newReset, setNewReset] = useState("");
  const [newBackup, setNewBackup] = useState("");

  const addItemAndClearInput = (value: string, setter: Function, list: string[]) => {
    if (value.trim()) {
      setter([...list, value.trim()]);
      return "";
    }
    return value;
  };

  return (
    <div className="space-y-6">
      {/* Red Flags */}
      <div className="space-y-2">
        <Label>🚨 Red Flags (Early warning signs)</Label>
        <div className="space-y-2">
          {redFlags.map((flag, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={flag} onChange={(e) => {
                const updated = [...redFlags];
                updated[i] = e.target.value;
                setRedFlags(updated);
              }} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRedFlags(redFlags.filter((_, idx) => idx !== i))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newRedFlag}
              onChange={(e) => setNewRedFlag(e.target.value)}
              placeholder="e.g., Skipping workouts 3 days in a row"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setNewRedFlag(addItemAndClearInput(newRedFlag, setRedFlags, redFlags));
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewRedFlag(addItemAndClearInput(newRedFlag, setRedFlags, redFlags))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* How I Reset */}
      <div className="space-y-2">
        <Label>🔄 How I Reset (Tools to get back on track)</Label>
        <div className="space-y-2">
          {howIReset.map((reset, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={reset} onChange={(e) => {
                const updated = [...howIReset];
                updated[i] = e.target.value;
                setHowIReset(updated);
              }} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHowIReset(howIReset.filter((_, idx) => idx !== i))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newReset}
              onChange={(e) => setNewReset(e.target.value)}
              placeholder="e.g., 10-minute walk outside"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setNewReset(addItemAndClearInput(newReset, setHowIReset, howIReset));
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewReset(addItemAndClearInput(newReset, setHowIReset, howIReset))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* When Things Get Hard */}
      <div className="space-y-2">
        <Label>💪 When Things Get Hard (Backup plans)</Label>
        <div className="space-y-2">
          {whenThingsGetHard.map((plan, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={plan} onChange={(e) => {
                const updated = [...whenThingsGetHard];
                updated[i] = e.target.value;
                setWhenThingsGetHard(updated);
              }} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWhenThingsGetHard(whenThingsGetHard.filter((_, idx) => idx !== i))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newBackup}
              onChange={(e) => setNewBackup(e.target.value)}
              placeholder="e.g., Call my accountability partner"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setNewBackup(addItemAndClearInput(newBackup, setWhenThingsGetHard, whenThingsGetHard));
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewBackup(addItemAndClearInput(newBackup, setWhenThingsGetHard, whenThingsGetHard))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave({ redFlags, howIReset, whenThingsGetHard })}>
          <Save className="h-4 w-4 mr-2" />
          Save Reset Protocol
        </Button>
      </div>
    </div>
  );
}
