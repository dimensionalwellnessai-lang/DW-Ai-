import { useState, useRef, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  FileUp,
  Loader2,
  Check,
  ArrowRight,
  X,
  FileText,
  Calendar,
  Utensils,
  Dumbbell,
  RotateCcw,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { saveUserResource, type UserResourceType } from "@/lib/guest-storage";

interface DocumentItem {
  id: string;
  documentId: string;
  itemType: string;
  title: string;
  description: string | null;
  details: Record<string, unknown> | null;
  confidence: number;
  destinationSystem: string;
  isSelected: boolean;
  linkedEntityId: string | null;
  linkedEntityType: string | null;
}

interface AnalysisResult {
  documentId: string;
  summary: string;
  items: DocumentItem[];
}

interface DocumentImportFlowProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  context?: "workout" | "nutrition" | "calendar" | "general";
}

type FlowStep = "upload" | "analyzing" | "preview" | "saving" | "complete";

interface UploadError {
  code: string;
  userMessage: string;
  suggestions: string[];
  isRecoverable: boolean;
}

const getDestinationIcon = (system: string) => {
  switch (system) {
    case "calendar":
      return Calendar;
    case "nutrition":
      return Utensils;
    case "workout":
      return Dumbbell;
    case "routines":
      return RotateCcw;
    default:
      return FileText;
  }
};

const getDestinationLabel = (system: string) => {
  switch (system) {
    case "calendar":
      return "Calendar";
    case "nutrition":
      return "Meal Prep";
    case "workout":
      return "Workouts";
    case "routines":
      return "Routines";
    default:
      return system;
  }
};

export function DocumentImportFlow({ 
  open, 
  onClose, 
  onComplete,
  context = "general" 
}: DocumentImportFlowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<FlowStep>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("summary");
  const [uploadError, setUploadError] = useState<UploadError | null>(null);

  const resetFlow = () => {
    setStep("upload");
    setSelectedFile(null);
    setAnalysisResult(null);
    setSelectedItems(new Set());
    setActiveTab("summary");
    setUploadError(null);
  };

  const handleClose = () => {
    resetFlow();
    onClose();
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      if (context !== "general") {
        formData.append("context", context);
      }
      
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const err: UploadError = {
          code: errorData.error || "UPLOAD_FAILED",
          userMessage: errorData.userMessage || errorData.error || "Upload failed",
          suggestions: errorData.suggestions || [],
          isRecoverable: errorData.isRecoverable !== false,
        };
        throw err;
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      setUploadError(null);
      setStep("analyzing");
      await analyzeMutation.mutateAsync(data.documentId);
    },
    onError: (error: unknown) => {
      if (error && typeof error === "object" && "userMessage" in error) {
        const uploadErr = error as UploadError;
        setUploadError(uploadErr);
        toast({
          title: "Couldn't process that file",
          description: uploadErr.userMessage,
          variant: "destructive",
        });
      } else {
        const message = error instanceof Error ? error.message : "Upload failed";
        setUploadError({
          code: "UNKNOWN",
          userMessage: message,
          suggestions: ["Try uploading again", "Try a different file"],
          isRecoverable: true,
        });
        toast({
          title: "Upload failed",
          description: message,
          variant: "destructive",
        });
      }
      setStep("upload");
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("POST", `/api/documents/${documentId}/analyze`);
      return response.json();
    },
    onSuccess: (data: AnalysisResult) => {
      setAnalysisResult(data);
      const preSelectedIds = new Set(
        data.items.filter(item => item.confidence >= 0.7).map(item => item.id)
      );
      setSelectedItems(preSelectedIds);
      setStep("preview");
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
      setStep("upload");
    },
  });

  const commitMutation = useMutation({
    mutationFn: async ({ documentId, itemIds }: { documentId: string; itemIds: string[] }) => {
      const response = await apiRequest("POST", `/api/documents/${documentId}/commit`, { itemIds });
      return response.json();
    },
    onSuccess: (data) => {
      if (analysisResult) {
        const selectedItemsData = analysisResult.items.filter(item => selectedItems.has(item.id));
        for (const item of selectedItemsData) {
          if (item.destinationSystem === "workout" || item.destinationSystem === "nutrition") {
            const resourceType: UserResourceType = item.destinationSystem === "workout" ? "workout" : "meal_plan";
            saveUserResource({
              resourceType,
              variant: "file",
              title: item.title,
              description: item.description || "",
              tags: [item.itemType, "imported"],
            });
          }
        }
      }
      toast({
        title: "Items saved",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/routines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/category-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exercises"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meals"] });
      setStep("complete");
      onComplete?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
      setStep("preview");
    },
  });

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
    ];

    const isImage = file.type.startsWith("image/");
    if (!allowedTypes.includes(file.type) && !isImage) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a PDF, Word document, image (PNG, JPG), or text file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!analysisResult) return;
    if (selectedItems.size === analysisResult.items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(analysisResult.items.map(item => item.id)));
    }
  };

  const handleCommit = () => {
    if (!analysisResult || selectedItems.size === 0) return;
    setStep("saving");
    commitMutation.mutate({
      documentId: analysisResult.documentId,
      itemIds: Array.from(selectedItems),
    });
  };

  const groupedItems = analysisResult?.items.reduce((acc, item) => {
    const system = item.destinationSystem;
    if (!acc[system]) {
      acc[system] = [];
    }
    acc[system].push(item);
    return acc;
  }, {} as Record<string, DocumentItem[]>) || {};

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Import Document"}
            {step === "analyzing" && "Analyzing Document"}
            {step === "preview" && "Review Items Found"}
            {step === "saving" && "Saving Items"}
            {step === "complete" && "Import Complete"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a document and we'll extract useful items from it."}
            {step === "analyzing" && "Finding items in your document..."}
            {step === "preview" && "Select which items to save to your systems."}
            {step === "saving" && "Saving your selected items..."}
            {step === "complete" && "Your items have been saved successfully."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === "upload" && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors hover:border-primary/50"
                onClick={() => fileInputRef.current?.click()}
                data-testid="dropzone-upload"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*"
                  onChange={handleFileSelect}
                  data-testid="input-file-upload"
                />
                <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground/70">
                  PDF, Word, images (PNG, JPG), or text files up to 5MB
                </p>
              </div>

              {selectedFile && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <FileText className="h-5 w-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSelectedFile(null)}
                    data-testid="button-remove-file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {uploadError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 space-y-2" data-testid="upload-error">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-destructive">{uploadError.userMessage}</p>
                      {uploadError.suggestions.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {uploadError.suggestions.map((suggestion, i) => (
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

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                  data-testid="button-upload"
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Analyze Document
                </Button>
              </div>
            </div>
          )}

          {step === "analyzing" && (
            <div className="py-8 text-center space-y-4">
              <div className="relative mx-auto w-16 h-16">
                <Sparkles className="h-16 w-16 text-primary animate-pulse" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Reading your document and finding useful items...
                </p>
                <Progress value={analyzeMutation.isPending ? 60 : 0} className="w-2/3 mx-auto" />
              </div>
            </div>
          )}

          {step === "preview" && analysisResult && (
            <div className="flex flex-col h-full">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mb-3">
                  <TabsTrigger value="summary" data-testid="tab-summary">
                    Summary
                  </TabsTrigger>
                  <TabsTrigger value="items" data-testid="tab-items">
                    Items ({analysisResult.items.length})
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 min-h-0">
                  <TabsContent value="summary" className="h-full m-0">
                    <ScrollArea className="h-64">
                      <div className="space-y-4 pr-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Document Summary</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {analysisResult.summary}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Destinations</h4>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(groupedItems).map(([system, items]) => {
                              const Icon = getDestinationIcon(system);
                              return (
                                <Badge key={system} variant="secondary" className="gap-1">
                                  <Icon className="h-3 w-3" />
                                  {getDestinationLabel(system)} ({items.length})
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="items" className="h-full m-0">
                    <ScrollArea className="h-64">
                      <div className="space-y-2 pr-4">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-muted-foreground">
                            {selectedItems.size} of {analysisResult.items.length} selected
                          </Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAll}
                            data-testid="button-select-all"
                          >
                            {selectedItems.size === analysisResult.items.length ? "Deselect All" : "Select All"}
                          </Button>
                        </div>

                        {analysisResult.items.map((item) => {
                          const Icon = getDestinationIcon(item.destinationSystem);
                          const isSelected = selectedItems.has(item.id);

                          return (
                            <div
                              key={item.id}
                              className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                                isSelected ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                              }`}
                              data-testid={`item-${item.id}`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleItem(item.id)}
                                className="mt-0.5"
                                data-testid={`checkbox-item-${item.id}`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium truncate">{item.title}</span>
                                  {item.confidence < 0.7 && (
                                    <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                                <Badge variant="outline" className="mt-2 gap-1">
                                  <Icon className="h-3 w-3" />
                                  {getDestinationLabel(item.destinationSystem)}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>

              <div className="flex gap-2 justify-end pt-4 border-t mt-4">
                <Button variant="outline" onClick={handleClose} data-testid="button-cancel-preview">
                  Cancel
                </Button>
                <Button
                  onClick={handleCommit}
                  disabled={selectedItems.size === 0}
                  data-testid="button-save-items"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Save {selectedItems.size} Item{selectedItems.size !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}

          {step === "saving" && (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Saving items to your systems...
              </p>
            </div>
          )}

          {step === "complete" && (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium mb-1">Import Complete</p>
                <p className="text-sm text-muted-foreground">
                  Your items have been added to the appropriate systems.
                </p>
              </div>
              <Button onClick={handleClose} data-testid="button-done">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
