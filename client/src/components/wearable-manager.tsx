import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Watch, Plus, Activity, Heart, TrendingUp, RefreshCw, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WearableDevice {
  id: string;
  deviceType: string;
  deviceName: string;
  manufacturer?: string;
  isActive: boolean;
  lastSyncedAt?: string;
}

interface WearableData {
  id: string;
  timestamp: string;
  heartRate?: number;
  stressLevel?: number;
  sleepQuality?: number;
  activityLevel?: number;
  detectedMood?: string;
}

const DEVICE_TYPES = [
  { value: "smartwatch", label: "Smartwatch" },
  { value: "smart-ring", label: "Smart Ring" },
  { value: "fitness-tracker", label: "Fitness Tracker" },
];

export function WearableManager() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deviceType, setDeviceType] = useState("smartwatch");
  const [deviceName, setDeviceName] = useState("");
  const [manufacturer, setManufacturer] = useState("");

  const { data: devices = [], isLoading: devicesLoading, refetch: refetchDevices } = useQuery({
    queryKey: ["wearable-devices"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/wearables/devices");
      return res.json();
    },
  });

  const { data: recentData = [], isLoading: dataLoading } = useQuery({
    queryKey: ["wearable-data"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/wearables/data?limit=10");
      return res.json();
    },
  });

  const addDeviceMutation = useMutation({
    mutationFn: async (deviceData: { deviceType: string; deviceName: string; manufacturer?: string }) => {
      const res = await apiRequest("POST", "/api/wearables/devices", deviceData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Device Added",
        description: "Your wearable device has been successfully connected.",
      });
      setDialogOpen(false);
      setDeviceName("");
      setManufacturer("");
      refetchDevices();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add wearable device. Please try again.",
        variant: "destructive",
      });
    },
  });

  const syncDataMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      // Simulate wearable data sync
      const mockData = {
        deviceId,
        heartRate: Math.floor(Math.random() * 40) + 60, // 60-100 bpm
        stressLevel: Math.floor(Math.random() * 100),
        activityLevel: Math.floor(Math.random() * 100),
        hrvScore: Math.floor(Math.random() * 50) + 50,
      };
      const res = await apiRequest("POST", "/api/wearables/sync", mockData);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Successful",
        description: data.detectedMood 
          ? `Data synced! Mood detected: ${data.detectedMood}` 
          : "Wearable data synced successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["wearable-data"] });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync wearable data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddDevice = () => {
    if (!deviceName.trim()) {
      toast({
        title: "Device Name Required",
        description: "Please enter a name for your device.",
        variant: "destructive",
      });
      return;
    }
    addDeviceMutation.mutate({
      deviceType,
      deviceName: deviceName.trim(),
      manufacturer: manufacturer.trim() || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Watch className="h-5 w-5 text-primary" />
                <CardTitle>Wearable Devices</CardTitle>
              </div>
              <CardDescription>
                Connect smartwatches and fitness trackers for mood-adaptive themes
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Device
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Wearable Device</DialogTitle>
                  <DialogDescription>
                    Connect a new smartwatch or fitness tracker to enable biometric-based mood detection.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="device-type">Device Type</Label>
                    <Select value={deviceType} onValueChange={setDeviceType}>
                      <SelectTrigger id="device-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEVICE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="device-name">Device Name *</Label>
                    <Input
                      id="device-name"
                      placeholder="e.g., My Apple Watch"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Manufacturer (Optional)</Label>
                    <Input
                      id="manufacturer"
                      placeholder="e.g., Apple, Fitbit, Oura"
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleAddDevice}
                    disabled={addDeviceMutation.isPending}
                  >
                    {addDeviceMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Device"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {devicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Watch className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No wearable devices connected</p>
              <p className="text-xs mt-1">Add a device to enable mood-based theming</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device: WearableDevice) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Watch className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{device.deviceName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{device.deviceType.replace("-", " ")}</span>
                        {device.manufacturer && <span>• {device.manufacturer}</span>}
                        {device.lastSyncedAt && (
                          <span>
                            • Synced {new Date(device.lastSyncedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={device.isActive ? "default" : "secondary"}>
                      {device.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncDataMutation.mutate(device.id)}
                      disabled={syncDataMutation.isPending}
                    >
                      {syncDataMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Biometric Data */}
      {recentData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Biometric Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {recentData.map((data: WearableData) => (
                  <div
                    key={data.id}
                    className="flex items-center justify-between p-3 rounded-lg border text-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-muted-foreground">
                        {new Date(data.timestamp).toLocaleString()}
                      </div>
                      {data.heartRate && (
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3 text-red-500" />
                          <span>{data.heartRate} bpm</span>
                        </div>
                      )}
                      {data.stressLevel !== undefined && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-orange-500" />
                          <span>Stress: {data.stressLevel}%</span>
                        </div>
                      )}
                    </div>
                    {data.detectedMood && (
                      <Badge variant="secondary" className="capitalize">
                        {data.detectedMood}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
