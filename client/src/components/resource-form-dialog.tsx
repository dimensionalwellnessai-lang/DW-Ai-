import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, FileUp, X } from "lucide-react";
import { 
  saveUserResource, 
  UserResourceType, 
  UserResourceVariant,
  UserResource 
} from "@/lib/guest-storage";

interface ResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: UserResourceType;
  onSaved?: (resource: UserResource) => void;
}

export function ResourceFormDialog({ 
  open, 
  onOpenChange, 
  resourceType,
  onSaved 
}: ResourceFormDialogProps) {
  const [variant, setVariant] = useState<UserResourceVariant>("link");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setUrl("");
    setSelectedFile(null);
    setFileDataUrl(null);
    setVariant("link");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be under 5MB");
      return;
    }
    
    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileDataUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    if (variant === "link" && !url.trim()) return;
    if (variant === "file" && !selectedFile) return;
    
    setIsSaving(true);
    
    try {
      const resource = saveUserResource({
        resourceType,
        variant,
        title: title.trim(),
        description: description.trim(),
        url: variant === "link" ? url.trim() : undefined,
        fileData: variant === "file" && selectedFile && fileDataUrl ? {
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          size: selectedFile.size,
          dataUrl: fileDataUrl,
        } : undefined,
        tags: [],
      });
      
      resetForm();
      onOpenChange(false);
      onSaved?.(resource);
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = title.trim() && (
    (variant === "link" && url.trim()) || 
    (variant === "file" && selectedFile)
  );

  const typeLabel = resourceType === "workout" ? "workout" : "meal";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add {typeLabel} resource</DialogTitle>
          <DialogDescription>
            Save a link or upload a document for your {typeLabel} plans.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <Tabs value={variant} onValueChange={(v) => setVariant(v as UserResourceVariant)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link" data-testid="tab-link">
                <Link2 className="h-4 w-4 mr-2" />
                Link
              </TabsTrigger>
              <TabsTrigger value="file" data-testid="tab-file">
                <FileUp className="h-4 w-4 mr-2" />
                Upload
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="link" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  data-testid="input-url"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="file" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label>Document</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file"
                />
                {selectedFile ? (
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                    <FileUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate flex-1">{selectedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedFile(null);
                        setFileDataUrl(null);
                      }}
                      data-testid="button-remove-file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-choose-file"
                  >
                    <FileUp className="h-4 w-4 mr-2" />
                    Choose file
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  PDF, Word, text, or images. Max 5MB.
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder={`Name this ${typeLabel} resource`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-title"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add any notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              data-testid="input-description"
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              data-testid="button-cancel-resource"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={!canSave || isSaving}
              data-testid="button-save-resource"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
