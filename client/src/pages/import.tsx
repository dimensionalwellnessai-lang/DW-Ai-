import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, Calendar, Utensils, Clock, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

type ImportType = "schedule" | "meal-plan" | "routine" | "generic";

interface ImportOption {
  id: ImportType;
  label: string;
  description: string;
  icon: typeof FileText;
  acceptedTypes: string;
}

const IMPORT_OPTIONS: ImportOption[] = [
  {
    id: "schedule",
    label: "Schedule / Calendar",
    description: "Import events from PDF, ICS, or other calendar files",
    icon: Calendar,
    acceptedTypes: ".pdf,.ics,.csv",
  },
  {
    id: "meal-plan",
    label: "Meal Plan",
    description: "Import recipes and meal schedules from PDFs or documents",
    icon: Utensils,
    acceptedTypes: ".pdf,.docx,.txt",
  },
  {
    id: "routine",
    label: "Routine / Checklist",
    description: "Import step-by-step routines or checklists",
    icon: Clock,
    acceptedTypes: ".pdf,.txt,.md",
  },
  {
    id: "generic",
    label: "Other Document",
    description: "Let AI analyze and suggest how to use this document",
    icon: FileText,
    acceptedTypes: ".pdf,.docx,.txt,.md",
  },
];

export default function ImportPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSelectType = (type: ImportType) => {
    setSelectedType(type);
    setUploadedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyze = async () => {
    if (!uploadedFile) return;
    
    setIsAnalyzing(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: "Document Analyzed",
      description: "Your document has been processed. Redirecting to review...",
    });
    
    setIsAnalyzing(false);
    
    if (selectedType === "meal-plan") {
      setLocation("/meal-prep");
    } else if (selectedType === "schedule") {
      setLocation("/calendar");
    } else {
      setLocation("/plans");
    }
  };

  const selectedOption = IMPORT_OPTIONS.find(o => o.id === selectedType);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Import" />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-lg mx-auto space-y-6 pb-8">
          {!selectedType ? (
            <>
              <div className="text-center py-4">
                <h2 className="text-xl font-display font-semibold mb-2">What would you like to import?</h2>
                <p className="text-muted-foreground">
                  Choose a document type and we'll help you organize it
                </p>
              </div>

              <div className="space-y-3">
                {IMPORT_OPTIONS.map(option => {
                  const Icon = option.icon;
                  return (
                    <Card
                      key={option.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => handleSelectType(option.id)}
                      data-testid={`card-import-${option.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{option.label}</h3>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {selectedOption && <selectedOption.icon className="w-5 h-5" />}
                    {selectedOption?.label}
                  </CardTitle>
                  <CardDescription>{selectedOption?.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={selectedOption?.acceptedTypes}
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                  
                  {!uploadedFile ? (
                    <div
                      onClick={handleUploadClick}
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="font-medium mb-1">Click to upload</p>
                      <p className="text-sm text-muted-foreground">
                        Accepts: {selectedOption?.acceptedTypes.split(',').join(', ')}
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{uploadedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(uploadedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUploadedFile(null)}
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedType(null);
                    setUploadedFile(null);
                  }}
                  className="flex-1"
                  data-testid="button-back-import"
                >
                  Back
                </Button>
                <Button
                  onClick={handleAnalyze}
                  disabled={!uploadedFile || isAnalyzing}
                  className="flex-1 gap-2"
                  data-testid="button-analyze"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Analyze Document
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
