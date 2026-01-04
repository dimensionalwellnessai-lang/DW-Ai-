import { useState, useRef, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Utensils,
  AlertCircle,
  Lightbulb,
  Dumbbell,
  Wallet,
  Target,
  BookOpen,
  FileText,
  Upload,
  Check,
  ArrowRight,
  Loader2,
  File,
  X,
} from "lucide-react";
import {
  saveImportedDocument,
  type ImportedDocumentType,
} from "@/lib/guest-storage";

interface DocumentTypeOption {
  id: ImportedDocumentType;
  label: string;
  description: string;
  icon: typeof Calendar;
  linkedSystems: string[];
}

const DOCUMENT_TYPES: DocumentTypeOption[] = [
  {
    id: "work_schedule",
    label: "Work Schedule",
    description: "Import your work hours to plan around them",
    icon: Calendar,
    linkedSystems: ["daily_schedule", "wake_up", "wind_down"],
  },
  {
    id: "recipe",
    label: "Recipe",
    description: "Save recipes to your meal planning library",
    icon: Utensils,
    linkedSystems: ["meals"],
  },
  {
    id: "dietary_restrictions",
    label: "Dietary Needs",
    description: "Allergies, preferences, or medical dietary requirements",
    icon: AlertCircle,
    linkedSystems: ["meals"],
  },
  {
    id: "workout_plan",
    label: "Workout Plan",
    description: "Import existing workout routines or programs",
    icon: Dumbbell,
    linkedSystems: ["training"],
  },
  {
    id: "budget",
    label: "Budget Info",
    description: "Financial goals, budgets, or spending plans",
    icon: Wallet,
    linkedSystems: ["finances"],
  },
  {
    id: "goals",
    label: "Goals & Intentions",
    description: "Personal goals, resolutions, or intentions",
    icon: Target,
    linkedSystems: ["wake_up", "wind_down"],
  },
  {
    id: "journal",
    label: "Journal Entry",
    description: "Thoughts, reflections, or journaling content",
    icon: BookOpen,
    linkedSystems: ["wind_down", "spiritual"],
  },
  {
    id: "brainstorm",
    label: "Brainstorm / Ideas",
    description: "Creative ideas, projects, or brainstorming notes",
    icon: Lightbulb,
    linkedSystems: [],
  },
  {
    id: "other",
    label: "Other",
    description: "Any other document you want to save",
    icon: FileText,
    linkedSystems: [],
  },
];

interface PendingFile {
  file: File;
  content: string;
  title: string;
}

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: (docId: string) => void;
}

export function ImportDialog({ open, onClose, onImportComplete }: ImportDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"select-type" | "enter-content" | "confirm">("select-type");
  const [selectedType, setSelectedType] = useState<ImportedDocumentType | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [failedFiles, setFailedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTypeInfo = DOCUMENT_TYPES.find(t => t.id === selectedType);

  const handleSelectType = (type: ImportedDocumentType) => {
    setSelectedType(type);
    setStep("enter-content");
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoadingFiles(true);
    setFailedFiles([]);
    const newPendingFiles: PendingFile[] = [];
    const failed: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const fileContent = await readFileContent(file);
        newPendingFiles.push({
          file,
          content: fileContent,
          title: file.name.replace(/\.[^/.]+$/, ""),
        });
      } catch (error) {
        console.error(`Failed to read file ${file.name}:`, error);
        failed.push(file.name);
      }
    }

    setPendingFiles([...pendingFiles, ...newPendingFiles]);
    setFailedFiles(failed);
    setIsLoadingFiles(false);
    
    if (failed.length > 0) {
      toast({
        title: "Some files couldn't be read",
        description: `${failed.join(", ")} - Try a different file format.`,
        variant: "destructive",
      });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === "string") {
          resolve(text);
        } else {
          reject(new Error("Failed to read file as text"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles(pendingFiles.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (!selectedType) return;
    
    const hasManualContent = title.trim() && content.trim();
    const hasFiles = pendingFiles.length > 0;
    
    if (!hasManualContent && !hasFiles) return;

    setIsProcessing(true);
    
    try {
      let lastDocId = "";
      let importCount = 0;
      
      if (hasManualContent) {
        const doc = saveImportedDocument({
          type: selectedType,
          title: title.trim(),
          content: content.trim(),
          parsedData: {},
          linkedSystems: selectedTypeInfo?.linkedSystems || [],
          tags,
        });
        lastDocId = doc.id;
        importCount++;
      }
      
      for (const pending of pendingFiles) {
        const doc = saveImportedDocument({
          type: selectedType,
          title: pending.title,
          content: pending.content,
          parsedData: {},
          linkedSystems: selectedTypeInfo?.linkedSystems || [],
          tags,
        });
        lastDocId = doc.id;
        importCount++;
      }

      toast({
        title: "Document imported",
        description: `${importCount} ${importCount === 1 ? "item" : "items"} added to your life system.`,
      });
      
      onImportComplete?.(lastDocId);
      handleClose();
    } catch (error) {
      console.error("Failed to import document:", error);
      toast({
        title: "Import failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep("select-type");
    setSelectedType(null);
    setTitle("");
    setContent("");
    setTags([]);
    setTagInput("");
    setPendingFiles([]);
    onClose();
  };

  const totalItems = (title.trim() && content.trim() ? 1 : 0) + pendingFiles.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {step === "select-type" && "What are you importing?"}
            {step === "enter-content" && selectedTypeInfo?.label}
          </DialogTitle>
          <DialogDescription>
            {step === "select-type" && "Choose the type of document so we can connect it to your life systems"}
            {step === "enter-content" && "Paste or type your content below"}
          </DialogDescription>
        </DialogHeader>

        {step === "select-type" && (
          <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
            <div className="grid gap-2 py-2">
              {DOCUMENT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type.id)}
                    className="flex items-start gap-3 p-3 rounded-lg text-left hover-elevate active-elevate-2 border"
                    data-testid={`import-type-${type.id}`}
                  >
                    <div className="p-2 rounded-md bg-muted">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground mt-2" />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {step === "enter-content" && selectedTypeInfo && (
          <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("select-type")}
                  data-testid="button-back-to-types"
                >
                  Back
                </Button>
                <Badge variant="secondary" className="gap-1">
                  {(() => {
                    const Icon = selectedTypeInfo.icon;
                    return <Icon className="w-3 h-3" />;
                  })()}
                  {selectedTypeInfo.label}
                </Badge>
              </div>

              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Upload Files</Label>
                  <span className="text-xs text-muted-foreground">Select multiple files at once</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".txt,.md,.json,.csv,.html,.xml"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoadingFiles}
                  data-testid="button-select-files"
                >
                  {isLoadingFiles ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Reading files...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Select Files
                    </>
                  )}
                </Button>
                
                {pendingFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">{pendingFiles.length} file(s) ready</div>
                    {pendingFiles.map((pf, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-background border">
                        <File className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm flex-1 truncate">{pf.title}</span>
                        <span className="text-xs text-muted-foreground">{Math.round(pf.content.length / 1024)}KB</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveFile(index)}
                          data-testid={`button-remove-file-${index}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative flex items-center">
                <div className="flex-1 border-t" />
                <span className="px-3 text-xs text-muted-foreground">or type manually</span>
                <div className="flex-1 border-t" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give this a name..."
                  data-testid="input-import-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste or type your content here..."
                  className="min-h-[100px] resize-none"
                  data-testid="input-import-content"
                />
              </div>

              <div className="space-y-2">
                <Label>Tags (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                    placeholder="Add a tag..."
                    className="flex-1"
                    data-testid="input-tag"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                    data-testid="button-add-tag"
                  >
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {selectedTypeInfo.linkedSystems.length > 0 && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                  This will be connected to: {selectedTypeInfo.linkedSystems.join(", ")}
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={totalItems === 0 || isProcessing}
                className="w-full"
                data-testid="button-import"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing {totalItems} item(s)...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {totalItems > 0 ? `${totalItems} item(s)` : ""}
                  </>
                )}
              </Button>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
