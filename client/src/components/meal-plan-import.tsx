import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, X, ChefHat, CalendarDays, ListChecks, Loader2, Check, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Wave4Import, ImportMeal, ImportCalendarSuggestion, ImportRoutineStep } from "@shared/schema";

type ImportStep = "upload" | "scanning" | "preview" | "saving" | "done";

interface UploadError {
  message: string;
  suggestions: string[];
}

interface MealPlanImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MealPlanImport({ open, onOpenChange }: MealPlanImportProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Wave4Import | null>(null);
  const [planTitle, setPlanTitle] = useState("");
  const [meals, setMeals] = useState<ImportMeal[]>([]);
  const [routine, setRoutine] = useState<{ title: string; steps: ImportRoutineStep[] }>({ title: "Meal Prep Routine", steps: [] });
  const [calendarSuggestions, setCalendarSuggestions] = useState<ImportCalendarSuggestion[]>([]);
  const [error, setError] = useState<UploadError | null>(null);
  const [savedData, setSavedData] = useState<{ mealsCount: number; hasRoutine: boolean; calendarCount: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/import/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const errData = await response.json();
        const uploadErr: UploadError = {
          message: errData.userMessage || errData.error || "Upload failed",
          suggestions: errData.suggestions || [],
        };
        throw uploadErr;
      }
      return response.json();
    },
    onSuccess: (data) => {
      setDocumentId(data.documentId);
      setError(null);
      setStep("scanning");
      analyzeMutation.mutate(data.documentId);
    },
    onError: (err: unknown) => {
      if (err && typeof err === "object" && "message" in err) {
        const uploadErr = err as UploadError;
        setError({
          message: uploadErr.message,
          suggestions: uploadErr.suggestions || [],
        });
      } else {
        setError({
          message: err instanceof Error ? err.message : "Upload failed",
          suggestions: ["Try uploading again", "Try a different file"],
        });
      }
      setStep("upload");
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await apiRequest("POST", `/api/import/analyze/${docId}`);
      return res.json() as Promise<Wave4Import>;
    },
    onSuccess: (data: Wave4Import) => {
      setAnalysis(data);
      setPlanTitle(data.planTitle);
      setMeals(data.meals);
      setRoutine(data.routine);
      setCalendarSuggestions(data.calendarSuggestions);
      setStep("preview");
    },
    onError: (err: Error) => {
      setError({
        message: err.message || "Analysis failed",
        suggestions: ["Try a clearer document", "Make sure the content is readable"],
      });
      setStep("upload");
    },
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/import/commit/${documentId}`, { meals, routine, planTitle });
      return res.json() as Promise<{ mealsCount?: number; routine?: unknown }>;
    },
    onSuccess: (data: { mealsCount?: number; routine?: unknown }) => {
      setSavedData({ 
        mealsCount: data.mealsCount || 0, 
        hasRoutine: !!data.routine,
        calendarCount: 0,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/routines"] });
      setStep("done");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
      setStep("preview");
    },
  });

  const calendarMutation = useMutation({
    mutationFn: async () => {
      const selected = calendarSuggestions.filter(s => s.isSelected);
      const res = await apiRequest("POST", `/api/import/calendar/${documentId}`, { suggestions: selected });
      return res.json() as Promise<{ eventsCreated?: number }>;
    },
    onSuccess: (data: { eventsCreated?: number }) => {
      if (savedData) {
        setSavedData({ ...savedData, calendarCount: data.eventsCreated || 0 });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
      toast({ title: "Calendar updated", description: `Added ${data.eventsCreated || 0} events to your calendar.` });
    },
    onError: (err: Error) => {
      toast({ title: "Calendar error", description: err.message, variant: "destructive" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
      const isValid = validTypes.includes(selectedFile.type) || selectedFile.type.startsWith("image/");
      if (!isValid) {
        setError({
          message: "Unsupported file type",
          suggestions: ["Please upload a PDF or image file (PNG, JPG)"],
        });
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    uploadMutation.mutate(formData);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleMealSelection = (id: string) => {
    setMeals(meals.map(m => m.id === id ? { ...m, isSelected: !m.isSelected } : m));
  };

  const updateMealTitle = (id: string, title: string) => {
    setMeals(meals.map(m => m.id === id ? { ...m, title } : m));
  };

  const toggleCalendarSelection = (id: string) => {
    setCalendarSuggestions(calendarSuggestions.map(c => 
      c.id === id ? { ...c, isSelected: !c.isSelected } : c
    ));
  };

  const handleSave = () => {
    setStep("saving");
    commitMutation.mutate();
  };

  const handleAddToCalendar = () => {
    calendarMutation.mutate();
  };

  const handleClose = () => {
    setStep("upload");
    setFile(null);
    setDocumentId(null);
    setAnalysis(null);
    setPlanTitle("");
    setMeals([]);
    setRoutine({ title: "Meal Prep Routine", steps: [] });
    setCalendarSuggestions([]);
    setError(null);
    setSavedData(null);
    onOpenChange(false);
  };

  const handleViewMeals = () => {
    handleClose();
    setLocation("/meal-prep");
  };

  const handleViewRoutines = () => {
    handleClose();
    setLocation("/routines");
  };

  const handleViewCalendar = () => {
    handleClose();
    setLocation("/calendar");
  };

  const selectedMealsCount = meals.filter(m => m.isSelected).length;
  const selectedCalendarCount = calendarSuggestions.filter(c => c.isSelected).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {step === "upload" && "Upload a Meal Plan"}
            {step === "scanning" && "Scanning your plan..."}
            {step === "preview" && "Review your import"}
            {step === "saving" && "Saving..."}
            {step === "done" && "Saved to your system"}
          </DialogTitle>
        </DialogHeader>

        {/* Upload Step */}
        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Drop a PDF and let me organize it into your system.
            </p>
            <p className="text-xs text-muted-foreground">
              You stay in control. Nothing gets saved until you approve it.
            </p>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">{error.message}</p>
                    {error.suggestions.length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {error.suggestions.map((suggestion, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <span className="text-muted-foreground/50">•</span> {suggestion}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="border-2 border-dashed rounded-md p-6 text-center">
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    data-testid="button-remove-file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Best results: meal plans, weekly schedules, prep guides
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-select-file"
                  >
                    Select PDF
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleClose} data-testid="button-cancel-import">
                Cancel
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!file || uploadMutation.isPending}
                data-testid="button-upload-file"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload PDF"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Scanning Step */}
        {step === "scanning" && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Pulling out meals, prep steps, and patterns...
              </p>
              <p className="text-xs text-muted-foreground">
                I'll show you everything before saving
              </p>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === "preview" && analysis && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This is a draft. Edit anything. Save only what you want.
            </p>

            {/* Summary Card */}
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="plan-title" className="text-xs text-muted-foreground">Plan name</Label>
                    <Input
                      id="plan-title"
                      value={planTitle}
                      onChange={(e) => setPlanTitle(e.target.value)}
                      className="mt-1"
                      data-testid="input-plan-title"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ChefHat className="w-4 h-4" />
                      {meals.length} meals
                    </span>
                    <span className="flex items-center gap-1">
                      <ListChecks className="w-4 h-4" />
                      {routine.steps.length} prep steps
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-4 h-4" />
                      {calendarSuggestions.length} calendar suggestions
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions if low confidence */}
            {analysis.questions && analysis.questions.length > 0 && (
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Quick check</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    I'm not 100% sure about a few parts:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {analysis.questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="meals" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="meals" data-testid="tab-meals">Meals</TabsTrigger>
                <TabsTrigger value="routine" data-testid="tab-routine">Routine</TabsTrigger>
                <TabsTrigger value="calendar" data-testid="tab-calendar">Calendar</TabsTrigger>
              </TabsList>

              <TabsContent value="meals" className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-2">
                  Select what you want to keep. You can rename anything.
                </p>
                {meals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    I didn't find clear meals in this doc.
                  </p>
                ) : (
                  meals.map((meal) => (
                    <div 
                      key={meal.id} 
                      className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                    >
                      <Checkbox
                        checked={meal.isSelected}
                        onCheckedChange={() => toggleMealSelection(meal.id)}
                        data-testid={`checkbox-meal-${meal.id}`}
                      />
                      <Input
                        value={meal.title}
                        onChange={(e) => updateMealTitle(meal.id, e.target.value)}
                        className="flex-1 h-8 text-sm"
                        data-testid={`input-meal-title-${meal.id}`}
                      />
                      {meal.mealType && meal.mealType !== "other" && (
                        <span className="text-xs text-muted-foreground capitalize">
                          {meal.mealType}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="routine" className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-2">
                  These steps become a checklist you can follow.
                </p>
                {routine.steps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No prep steps found in this document.
                  </p>
                ) : (
                  routine.steps.map((step, index) => (
                    <div key={step.id} className="flex items-start gap-3 p-2">
                      <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
                      <Textarea
                        value={step.text}
                        onChange={(e) => {
                          const newSteps = [...routine.steps];
                          newSteps[index] = { ...step, text: e.target.value };
                          setRoutine({ ...routine, steps: newSteps });
                        }}
                        className="flex-1 min-h-[60px] text-sm"
                        data-testid={`textarea-step-${step.id}`}
                      />
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="calendar" className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-2">
                  These are suggestions only. You approve what gets added.
                </p>
                {calendarSuggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No calendar suggestions for this plan.
                  </p>
                ) : (
                  calendarSuggestions.map((suggestion) => (
                    <div 
                      key={suggestion.id} 
                      className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                    >
                      <Checkbox
                        checked={suggestion.isSelected}
                        onCheckedChange={() => toggleCalendarSelection(suggestion.id)}
                        data-testid={`checkbox-calendar-${suggestion.id}`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{suggestion.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {suggestion.durationMinutes} min
                          {suggestion.recurrence?.frequency && suggestion.recurrence.frequency !== "none" && 
                            ` · ${suggestion.recurrence.frequency}`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>

            <p className="text-xs text-muted-foreground text-center">
              Nothing goes into your calendar unless you choose it.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <Button 
                onClick={handleSave} 
                disabled={selectedMealsCount === 0 && routine.steps.length === 0}
                data-testid="button-save-plan"
              >
                Save plan ({selectedMealsCount} meals{routine.steps.length > 0 ? ` + routine` : ""})
              </Button>
              <Button variant="ghost" onClick={handleClose} data-testid="button-cancel-preview">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Saving Step */}
        {step === "saving" && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Saving your plan...</p>
          </div>
        )}

        {/* Done Step */}
        {step === "done" && savedData && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Your plan is organized and ready.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {savedData.mealsCount > 0 && (
                <Button variant="outline" onClick={handleViewMeals} data-testid="button-view-meals">
                  View Meals ({savedData.mealsCount})
                </Button>
              )}
              {savedData.hasRoutine && (
                <Button variant="outline" onClick={handleViewRoutines} data-testid="button-view-routines">
                  View Routine
                </Button>
              )}

              {selectedCalendarCount > 0 && savedData.calendarCount === 0 && (
                <Button 
                  onClick={handleAddToCalendar}
                  disabled={calendarMutation.isPending}
                  data-testid="button-add-calendar"
                >
                  {calendarMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    `Add ${selectedCalendarCount} to calendar`
                  )}
                </Button>
              )}

              {savedData.calendarCount > 0 && (
                <Button variant="outline" onClick={handleViewCalendar} data-testid="button-view-calendar">
                  View Calendar ({savedData.calendarCount} added)
                </Button>
              )}

              <Button variant="ghost" onClick={handleClose} data-testid="button-close-done">
                Back to chat
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Want me to help you activate this plan for the week?
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
