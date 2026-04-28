import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  pickTranslation,
  setLanguage,
  useLanguage,
} from "@/lib/i18n";
import {
  LANGUAGE_SECTION_STRINGS,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
} from "@/lib/language-picker-i18n";

const USE_BROWSER_VALUE = "__browser__";

/**
 * Settings → Language picker.
 *
 * Reads its own UI strings through `pickTranslation` (so the picker itself
 * is the second surface beyond the Life System backfill banner that flips
 * languages with the user). On save, persists to the server via
 * `PATCH /api/auth/me` AND mirrors into localStorage via `setLanguage`,
 * so the choice both follows the user across devices and takes effect
 * immediately on this device without waiting for an auth refetch.
 */
export function LanguagePickerCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const lang = useLanguage();
  const strings = pickTranslation(LANGUAGE_SECTION_STRINGS, lang);

  // Drive the select from the server-persisted preference if present.
  // `USE_BROWSER_VALUE` is the sentinel for "no explicit preference, fall
  // back to navigator detection" — we can't use empty-string for shadcn's
  // SelectItem (it throws when value is empty).
  const initialPick = pickInitialValue(user?.language);
  const [pick, setPick] = useState<string>(initialPick);

  // Keep the select in sync if /api/auth/me settles after first render.
  useEffect(() => {
    setPick(pickInitialValue(user?.language));
  }, [user?.language]);

  const mutation = useMutation({
    mutationFn: async (next: string | null) => {
      const res = await apiRequest("PATCH", "/api/auth/me", { language: next });
      return (await res.json()) as { user: { language: string | null } };
    },
    onSuccess: async (data) => {
      // Mirror the new value into localStorage immediately so the UI
      // doesn't have to wait for the /api/auth/me refetch to flip.
      setLanguage(data.user.language);
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: strings.savedToast });
    },
    onError: () => {
      toast({
        title: "Couldn't save",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const dirty = pick !== pickInitialValue(user?.language);

  function onSave() {
    if (!dirty || mutation.isPending) return;
    const next = pick === USE_BROWSER_VALUE ? null : pick;
    mutation.mutate(next);
  }

  return (
    <Card data-testid="card-language-picker">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-base" data-testid="text-language-title">
              {strings.title}
            </CardTitle>
            <CardDescription data-testid="text-language-description">
              {strings.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="language-select">{strings.selectLabel}</Label>
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger
              id="language-select"
              data-testid="select-language"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value={USE_BROWSER_VALUE}
                data-testid="option-language-browser"
              >
                {strings.useBrowser}
              </SelectItem>
              {SUPPORTED_LANGUAGES.map((opt) => (
                <SelectItem
                  key={opt.code}
                  value={opt.code}
                  data-testid={`option-language-${opt.code}`}
                >
                  {opt.nativeLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            disabled={!dirty || mutation.isPending}
            onClick={onSave}
            data-testid="button-save-language"
          >
            {mutation.isPending ? strings.saving : strings.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Map a server-persisted language (or null) to the value the Select
 * should show. Unknown / unsupported codes fall back to the "use browser"
 * sentinel so we never end up with a Select pointing at an option that
 * isn't in the list.
 */
function pickInitialValue(serverLang: string | null | undefined): string {
  if (!serverLang) return USE_BROWSER_VALUE;
  const lower = serverLang.toLowerCase();
  return isSupportedLanguage(lower) ? lower : USE_BROWSER_VALUE;
}
