import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Download, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { parseCalendarCSV, downloadSampleCSV, type CSVCalendarEvent } from "@/lib/csv-calendar-import";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface CalendarCSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (events: CSVCalendarEvent[]) => void;
}

export function CalendarCSVImportDialog({
  open,
  onOpenChange,
  onImport,
}: CalendarCSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<{
    events: CSVCalendarEvent[];
    errors: string[];
    warnings: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsing(true);

    try {
      const content = await selectedFile.text();
      const parseResult = parseCalendarCSV(content);
      setResult(parseResult);
    } catch (error) {
      setResult({
        events: [],
        errors: [error instanceof Error ? error.message : "Failed to parse CSV file"],
        warnings: [],
      });
    } finally {
      setParsing(false);
    }
  };

  const handleImport = () => {
    if (result?.events) {
      onImport(result.events);
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Import Calendar Events from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple calendar events at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sample template download */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Need a template?</p>
                <p className="text-xs text-muted-foreground">Download our sample CSV to get started</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleCSV}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download Template
            </Button>
          </div>

          {/* File upload */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              {file ? file.name : "Click to upload CSV file"}
            </p>
            <p className="text-xs text-muted-foreground">
              or drag and drop your file here
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Parsing state */}
          {parsing && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Parsing CSV file...</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              {/* Errors */}
              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">Errors found:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {result.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">Warnings:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {result.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success */}
              {result.events.length > 0 && (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription>
                    <p className="font-medium mb-2">
                      Successfully parsed {result.events.length} event{result.events.length !== 1 ? 's' : ''}
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Event preview */}
              {result.events.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <ScrollArea className="h-[200px] border rounded-lg">
                    <div className="p-4 space-y-2">
                      {result.events.slice(0, 10).map((event, i) => (
                        <div key={i} className="p-3 border rounded-lg bg-card/50">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{event.title}</p>
                              {event.description && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {event.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {format(event.startTime, "MMM d, yyyy 'at' h:mm a")}
                                </p>
                                {event.eventType && (
                                  <Badge variant="outline" className="text-xs">
                                    {event.eventType}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {result.events.length > 10 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          ... and {result.events.length - 10} more events
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!result || result.events.length === 0 || result.errors.length > 0}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Import {result?.events.length || 0} Events
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
