// /life-system/document — the "cherry on top".
//
// A beautifully formatted, scrollable artifact that mirrors the user's
// ChatGPT template (Identity Statement → Foundation Laws → Core pillars
// → Expression pillars → Projects → Weekly Non-Negotiables → Minimum Day
// → Commandments → Final Statement). Looks good even when sparse: missing
// pillar content falls back to the pillar's starter description.
//
// Actions:
//   - Generate / Regenerate (composes from current pillar state)
//   - Print  (browser-native PDF export)
//   - Download as text (.txt)
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Loader2, FileText, RefreshCw, Printer, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useLifeSystemDocument, generateLifeSystemDocument, LEVEL_META } from "@/lib/life-system";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { LifeSystemDocumentContent, PillarSection, ProjectSection } from "@shared/lifeSystemContent";

export default function LifeSystemDocumentPage() {
  usePageMeta("Life System Document", "Your personalized operating system, beautifully written back to you.");
  const { data, isLoading } = useLifeSystemDocument();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const document = data?.document;
  const [autoTried, setAutoTried] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genFailed, setGenFailed] = useState(false);

  // First load — auto-generate once if no document exists yet.
  useEffect(() => {
    if (!isLoading && !document && !autoTried) {
      setAutoTried(true);
      void onGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, document, autoTried]);

  async function onGenerate() {
    setGenerating(true);
    setGenFailed(false);
    try {
      await generateLifeSystemDocument();
      await queryClient.invalidateQueries({ queryKey: ["/api/life-system/document"] });
    } catch (e) {
      setGenFailed(true);
      toast({ title: "Couldn't generate document", description: "Tap Try again below.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  function onPrint() {
    window.print();
  }

  function onDownloadText() {
    if (!document) return;
    const c = document.content as LifeSystemDocumentContent;
    const lines: string[] = [];
    lines.push(c.title);
    lines.push(c.subtitle);
    lines.push("");
    lines.push("IDENTITY");
    lines.push(c.identityStatement);
    lines.push("");
    lines.push("FOUNDATION LAWS");
    (c.foundationLaws ?? []).forEach((l) => lines.push(`• ${l}`));
    lines.push("");
    lines.push("CORE SYSTEM");
    (c.corePillars ?? []).forEach((p) => {
      lines.push(`\n${p.label}`);
      lines.push(p.description);
      if (p.userVoice) lines.push(`In your words: "${p.userVoice}"`);
    });
    lines.push("");
    lines.push("LIFE EXPRESSION");
    (c.expressionPillars ?? []).forEach((p) => {
      lines.push(`\n${p.label}`);
      lines.push(p.description);
      if (p.userVoice) lines.push(`In your words: "${p.userVoice}"`);
    });
    lines.push("");
    lines.push("CREATION");
    (c.projects ?? []).forEach((p) => {
      lines.push(`\n${p.name}`);
      if (p.description) lines.push(p.description);
    });
    lines.push("");
    lines.push("WEEKLY NON-NEGOTIABLES");
    (c.weeklyNonNegotiables ?? []).forEach((l: string) => lines.push(`• ${l}`));
    lines.push("");
    lines.push("MINIMUM DAY CHECKLIST");
    (c.minimumDayChecklist ?? []).forEach((l: string) => lines.push(`• ${l}`));
    lines.push("");
    lines.push("LIFE COMMANDMENTS");
    (c.commandments ?? []).forEach((l: string) => lines.push(`• ${l}`));
    lines.push("");
    lines.push("FINAL LIFE SYSTEM STATEMENT");
    lines.push(c.finalStatement);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = "life-system.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading || (!document && generating)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3" data-testid="loading-document">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Composing your Life System Document…</p>
      </div>
    );
  }

  if (!document) {
    // Generation failed (or hasn't been triggered): show an explicit retry state.
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4" data-testid="empty-document">
        <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No document yet</h2>
        <p className="text-muted-foreground">
          {genFailed
            ? "Something hiccuped while composing your document. Try again."
            : "Generate your Life System Document from your current pillars."}
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <Button asChild variant="outline" data-testid="link-back-to-life-system-empty">
            <Link href="/life-blueprint">
              <ArrowLeft className="w-4 h-4 mr-1" /> Life Blueprint
            </Link>
          </Button>
          <Button onClick={onGenerate} disabled={generating} data-testid="button-generate-empty">
            <RefreshCw className={`w-4 h-4 mr-1 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating…" : "Generate"}
          </Button>
        </div>
      </div>
    );
  }

  const c = document.content as LifeSystemDocumentContent;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" data-testid="page-life-system-document">
      {/* ── Toolbar (hidden when printing) ─────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center justify-between mb-6 print:hidden">
        <Button asChild variant="ghost" size="sm" data-testid="link-back-to-life-system">
          <Link href="/life-blueprint">
            <ArrowLeft className="w-4 h-4 mr-1" /> Life Blueprint
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onGenerate} data-testid="button-regenerate">
            <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={onPrint} data-testid="button-print">
            <Printer className="w-4 h-4 mr-1" /> Print / PDF
          </Button>
          <Button variant="outline" size="sm" onClick={onDownloadText} data-testid="button-download">
            <Download className="w-4 h-4 mr-1" /> Download
          </Button>
        </div>
      </div>

      {/* ── The document ───────────────────────────────────────────────── */}
      <Card
        ref={printRef}
        className="p-8 md:p-12 space-y-10 bg-card print:shadow-none print:border-0"
        data-testid="document-body"
      >
        <header className="text-center space-y-2 border-b border-border pb-6">
          <FileText className="w-8 h-8 mx-auto text-primary" aria-hidden />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{c.title}</h1>
          <p className="text-muted-foreground italic">{c.subtitle}</p>
        </header>

        <DocSection title="Identity">
          <p className="text-lg leading-relaxed">{c.identityStatement}</p>
        </DocSection>

        <DocSection title="Foundation Laws">
          <ul className="space-y-2">
            {(c.foundationLaws ?? []).map((law: string, i: number) => (
              <li key={i} className="flex gap-3"><span className="text-primary">◆</span><span>{law}</span></li>
            ))}
          </ul>
        </DocSection>

        <LayerSection
          title="Core System"
          tagline={LEVEL_META.core.tagline}
          accent={LEVEL_META.core.ringColor}
          pillars={c.corePillars ?? []}
        />

        {(c.expressionPillars ?? []).length > 0 && (
          <LayerSection
            title="Life Expression"
            tagline={LEVEL_META.expression.tagline}
            accent={LEVEL_META.expression.ringColor}
            pillars={c.expressionPillars ?? []}
          />
        )}

        {(c.projects ?? []).length > 0 && (
          <DocSection title="Creation" accent={LEVEL_META.creation.ringColor}>
            <p className="text-sm text-muted-foreground italic mb-4">{LEVEL_META.creation.tagline}</p>
            <div className="space-y-4">
              {(c.projects ?? []).map((p: ProjectSection, i: number) => (
                <div key={i} className="border-l-2 pl-4" style={{ borderColor: LEVEL_META.creation.ringColor }}>
                  <h4 className="font-semibold">{p.name}</h4>
                  {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                  {p.currentFocus && (
                    <p className="text-sm mt-1"><span className="font-medium">Focus:</span> {p.currentFocus}</p>
                  )}
                </div>
              ))}
            </div>
          </DocSection>
        )}

        <DocSection title="Weekly Non-Negotiables">
          <ul className="space-y-1">
            {(c.weeklyNonNegotiables ?? []).map((l: string, i: number) => (
              <li key={i} className="flex gap-2"><span>○</span><span>{l}</span></li>
            ))}
          </ul>
        </DocSection>

        <DocSection title="Minimum Day Checklist">
          <p className="text-sm text-muted-foreground italic mb-2">For hard days. The least I owe my system.</p>
          <ul className="space-y-1">
            {(c.minimumDayChecklist ?? []).map((l: string, i: number) => (
              <li key={i} className="flex gap-2"><span>○</span><span>{l}</span></li>
            ))}
          </ul>
        </DocSection>

        <DocSection title="Life Commandments">
          <ol className="space-y-2 list-decimal list-inside marker:text-primary">
            {(c.commandments ?? []).map((l: string, i: number) => (
              <li key={i}>{l}</li>
            ))}
          </ol>
        </DocSection>

        <DocSection title="Final Life System Statement">
          <p className="text-lg leading-relaxed italic">{c.finalStatement}</p>
        </DocSection>

        <footer className="text-xs text-center text-muted-foreground pt-6 border-t border-border">
          Composed {new Date(c.generatedAt ?? document.generatedAt ?? Date.now()).toLocaleString()}
          <br />
          This is a living document. Regenerate it any time you grow.
        </footer>
      </Card>
    </div>
  );
}

function DocSection({
  title,
  children,
  accent,
}: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <section className="space-y-3">
      <h3
        className="text-2xl font-semibold tracking-tight"
        style={accent ? { color: accent } : undefined}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function LayerSection({
  title,
  tagline,
  accent,
  pillars,
}: { title: string; tagline: string; accent: string; pillars: PillarSection[] }) {
  return (
    <DocSection title={title} accent={accent}>
      <p className="text-sm text-muted-foreground italic mb-4">{tagline}</p>
      <div className="space-y-5">
        {pillars.map((p) => (
          <div key={p.id} className="border-l-2 pl-4" style={{ borderColor: accent }}>
            <h4 className="font-semibold">{p.label}</h4>
            <p className="text-sm leading-relaxed">{p.description}</p>
            {p.userVoice && (
              <p className="text-sm mt-1 italic text-muted-foreground">
                In your words: "{p.userVoice}"
              </p>
            )}
            {Array.isArray(p.laws) && p.laws.length > 0 && (
              <ul className="text-sm mt-2 space-y-1">
                {p.laws.map((l: string, i: number) => (
                  <li key={i} className="flex gap-2"><span className="text-primary">◆</span><span>{l}</span></li>
                ))}
              </ul>
            )}
            {p.weeklyRhythm && (
              <p className="text-xs mt-2 text-muted-foreground">
                <span className="font-medium">Rhythm:</span> {p.weeklyRhythm}
              </p>
            )}
          </div>
        ))}
      </div>
    </DocSection>
  );
}
