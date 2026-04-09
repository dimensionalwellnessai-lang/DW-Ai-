import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ttsService, type TTSSettings, type VoicePersonality, VOICE_PERSONALITIES } from "@/lib/tts-service";
import { Mic, Volume2, Gauge, Play, Square, Sparkles, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function VoiceSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<TTSSettings>(ttsService.getSettings());
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    return () => { ttsService.stop(); };
  }, []);

  const handleSettingChange = (key: keyof TTSSettings, value: unknown) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    ttsService.updateSettings({ [key]: value });
  };

  const handlePersonalityChange = (personality: VoicePersonality) => {
    ttsService.applyPersonality(personality);
    setSettings(ttsService.getSettings());
  };

  const handleTestVoice = async () => {
    if (isTesting) {
      ttsService.stop();
      setIsTesting(false);
      return;
    }
    setIsTesting(true);
    try {
      await ttsService.speak(
        "Hello. I'm DW — your personal intelligence system. This is how I sound right now."
      );
      setIsTesting(false);
    } catch (error) {
      toast({
        title: "Voice test failed",
        description: error instanceof Error ? error.message : "Could not play test voice",
        variant: "destructive",
      });
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              DW Voice Settings
            </CardTitle>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              OpenAI Alloy
            </Badge>
          </div>
          <CardDescription>
            DW speaks using OpenAI's Alloy voice — natural, clear, and consistent across the entire app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="tts-enabled">Enable Voice Responses</Label>
              <p className="text-sm text-muted-foreground">
                DW will speak aloud when you use voice features
              </p>
            </div>
            <Switch
              id="tts-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => handleSettingChange('enabled', checked)}
              data-testid="switch-tts-enabled"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-speak">Auto-Speak AI Responses</Label>
              <p className="text-sm text-muted-foreground">
                DW automatically reads responses without needing a tap
              </p>
            </div>
            <Switch
              id="auto-speak"
              checked={settings.autoSpeak}
              onCheckedChange={(checked) => handleSettingChange('autoSpeak', checked)}
              disabled={!settings.enabled}
              data-testid="switch-auto-speak"
            />
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Speaking Style
            </Label>
            <p className="text-sm text-muted-foreground">
              Adjusts DW's speaking speed to match how you want to be coached
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(VOICE_PERSONALITIES) as [VoicePersonality, typeof VOICE_PERSONALITIES[VoicePersonality]][]).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  disabled={!settings.enabled}
                  onClick={() => handlePersonalityChange(key)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    settings.voicePersonality === key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-foreground'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  data-testid={`voice-personality-${key}`}
                >
                  <div className="font-medium text-sm">{preset.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rate-slider" className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Speaking Speed: {settings.rate.toFixed(1)}x
              </Label>
            </div>
            <Slider
              id="rate-slider"
              min={0.5}
              max={1.5}
              step={0.1}
              value={[settings.rate]}
              onValueChange={([value]) => handleSettingChange('rate', value)}
              disabled={!settings.enabled}
              data-testid="slider-speaking-rate"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Slower</span>
              <span>Normal</span>
              <span>Faster</span>
            </div>
          </div>

          <Button
            onClick={handleTestVoice}
            disabled={!settings.enabled}
            variant="outline"
            className="w-full"
            data-testid="button-test-voice"
          >
            {isTesting ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Hear DW
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Input
          </CardTitle>
          <CardDescription>
            Speak to DW anywhere you see the microphone icon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tap the mic in any chat, the onboarding wizard, or the Voice Mode screen to speak instead of type. Your browser converts speech to text in real time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
