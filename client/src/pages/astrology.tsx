import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Moon, Sun, Star } from "lucide-react";
import { PageHeader } from "@/components/page-header";

interface AstrologyNote {
  id: string;
  date: string;
  content: string;
  moonPhase?: string;
}

const NOTES_KEY = "dw_astrology_notes";

function getStoredNotes(): AstrologyNote[] {
  try {
    const stored = localStorage.getItem(NOTES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveNote(note: AstrologyNote): void {
  const notes = getStoredNotes();
  notes.unshift(note);
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes.slice(0, 30)));
}

function getMoonPhase(): string {
  const phases = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  const now = new Date();
  const lunarCycle = 29.53;
  const knownNewMoon = new Date("2024-01-11");
  const daysSinceNew = (now.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const phaseIndex = Math.floor((daysSinceNew % lunarCycle) / (lunarCycle / 8)) % 8;
  return phases[phaseIndex];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { 
    weekday: "short", 
    month: "short", 
    day: "numeric" 
  });
}

export default function AstrologyPage() {
  const [notes, setNotes] = useState<AstrologyNote[]>(getStoredNotes);
  const [newNote, setNewNote] = useState("");
  const moonPhase = getMoonPhase();
  const today = new Date().toISOString().split("T")[0];

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    const note: AstrologyNote = {
      id: Date.now().toString(),
      date: today,
      content: newNote.trim(),
      moonPhase,
    };
    
    saveNote(note);
    setNotes(getStoredNotes());
    setNewNote("");
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Astrology" />

      <main className="p-4 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Moon className="h-4 w-4" />
              Current Moon Phase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display" data-testid="text-moon-phase">{moonPhase}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Notice how this phase might be influencing your energy today.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Star className="h-4 w-4" />
              Add a Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="What are you noticing today? Any cosmic vibes, synchronicities, or intuitive hits..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="resize-none"
              rows={3}
              data-testid="input-astrology-note"
            />
            <Button 
              onClick={handleAddNote} 
              disabled={!newNote.trim()}
              data-testid="button-add-note"
            >
              Save Note
            </Button>
          </CardContent>
        </Card>

        {notes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Past Notes
            </h2>
            {notes.map((note) => (
              <Card key={note.id} className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span>{formatDate(note.date)}</span>
                    {note.moonPhase && (
                      <>
                        <span>·</span>
                        <span>{note.moonPhase}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm" data-testid={`text-note-${note.id}`}>{note.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {notes.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            No notes yet. Start tracking your cosmic observations.
          </p>
        )}
      </main>
    </div>
  );
}
