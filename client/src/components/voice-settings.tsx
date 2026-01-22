import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ttsService, type TTSSettings } from "@/lib/tts-service";
import { Mic, Volume2, Gauge, Music, Play, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function VoiceSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<TTSSettings>(ttsService.getSettings());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [isSupported, setIsSupported] = useState(ttsService.isAvailable());

  useEffect(() => {
    // Load available voices
    const loadVoices = () => {
      const availableVoices = ttsService.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();

    // Voices might load asynchronously
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      ttsService.stop();
    };
  }, []);

  const handleSettingChange = (key: keyof TTSSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    ttsService.updateSettings({ [key]: value });
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
        "Hello! I'm your DW-Ai assistant. This is how I sound with your current voice settings."
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

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Voice Settings
          </CardTitle>
          <CardDescription>
            Voice features are not supported in this browser. Try using a modern browser like Chrome, Safari, or Edge.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const englishVoices = voices.filter(v => v.lang.startsWith('en'));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Text-to-Speech Settings
          </CardTitle>
          <CardDescription>
            Configure voice responses from your AI assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable TTS */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="tts-enabled">Enable Voice Responses</Label>
              <p className="text-sm text-muted-foreground">
                AI assistant will speak its responses aloud
              </p>
            </div>
            <Switch
              id="tts-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => handleSettingChange('enabled', checked)}
            />
          </div>

          {/* Auto-speak AI responses */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-speak">Auto-Speak Responses</Label>
              <p className="text-sm text-muted-foreground">
                Automatically speak AI responses without clicking
              </p>
            </div>
            <Switch
              id="auto-speak"
              checked={settings.autoSpeak}
              onCheckedChange={(checked) => handleSettingChange('autoSpeak', checked)}
              disabled={!settings.enabled}
            />
          </div>

          {/* Voice selection */}
          {voices.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="voice-select">Voice</Label>
              <Select
                value={settings.voice || ''}
                onValueChange={(value) => handleSettingChange('voice', value)}
                disabled={!settings.enabled}
              >
                <SelectTrigger id="voice-select">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {englishVoices.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-sm font-semibold">English Voices</div>
                      {englishVoices.map((voice) => (
                        <SelectItem key={voice.name} value={voice.name}>
                          {voice.name} {voice.localService ? '(Local)' : '(Online)'}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {voices.filter(v => !v.lang.startsWith('en')).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-sm font-semibold">Other Languages</div>
                      {voices.filter(v => !v.lang.startsWith('en')).map((voice) => (
                        <SelectItem key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Speaking rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rate-slider" className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Speaking Rate: {settings.rate.toFixed(1)}x
              </Label>
            </div>
            <Slider
              id="rate-slider"
              min={0.5}
              max={2}
              step={0.1}
              value={[settings.rate]}
              onValueChange={([value]) => handleSettingChange('rate', value)}
              disabled={!settings.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Adjust how fast the voice speaks (0.5x to 2x)
            </p>
          </div>

          {/* Pitch */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pitch-slider" className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                Voice Pitch: {settings.pitch.toFixed(1)}
              </Label>
            </div>
            <Slider
              id="pitch-slider"
              min={0.5}
              max={2}
              step={0.1}
              value={[settings.pitch]}
              onValueChange={([value]) => handleSettingChange('pitch', value)}
              disabled={!settings.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Adjust voice pitch (0.5 to 2.0)
            </p>
          </div>

          {/* Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="volume-slider" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Volume: {Math.round(settings.volume * 100)}%
              </Label>
            </div>
            <Slider
              id="volume-slider"
              min={0}
              max={1}
              step={0.1}
              value={[settings.volume]}
              onValueChange={([value]) => handleSettingChange('volume', value)}
              disabled={!settings.enabled}
            />
          </div>

          {/* Test voice button */}
          <Button
            onClick={handleTestVoice}
            disabled={!settings.enabled}
            variant="outline"
            className="w-full"
          >
            {isTesting ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Stop Test
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Test Voice
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Speech-to-Text Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Speech-to-Text
          </CardTitle>
          <CardDescription>
            Voice input is available in chat interfaces using the microphone button
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Click the microphone icon in any chat interface to start speaking. Your browser will convert your speech to text automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
