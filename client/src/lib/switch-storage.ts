export type SwitchId = 
  | "body" 
  | "mind" 
  | "time" 
  | "purpose" 
  | "money" 
  | "relationships" 
  | "environment" 
  | "identity";

export type SwitchStatus = "off" | "flickering" | "stable" | "powered";

export type SwitchMode = "training" | "maintaining" | "restoring";

export interface SwitchData {
  status: SwitchStatus;
  mode: SwitchMode;
  lastUpdated: number;
  trainingStarted?: number;
  checkIns: number;
  streakDays: number;
}

const STORAGE_KEY = "fts_switch_data";

const DEFAULT_SWITCH_DATA: SwitchData = {
  status: "off",
  mode: "training",
  lastUpdated: Date.now(),
  checkIns: 0,
  streakDays: 0,
};

export function getSwitchData(): Record<SwitchId, SwitchData> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading switch data:", e);
  }
  
  const allSwitches: SwitchId[] = ["body", "mind", "time", "purpose", "money", "relationships", "environment", "identity"];
  const defaultData: Record<SwitchId, SwitchData> = {} as Record<SwitchId, SwitchData>;
  allSwitches.forEach(id => {
    defaultData[id] = { ...DEFAULT_SWITCH_DATA };
  });
  return defaultData;
}

export function getSwitchStatuses(): Record<SwitchId, SwitchStatus> {
  const data = getSwitchData();
  const statuses: Record<SwitchId, SwitchStatus> = {} as Record<SwitchId, SwitchStatus>;
  (Object.keys(data) as SwitchId[]).forEach(id => {
    statuses[id] = data[id].status;
  });
  return statuses;
}

export function getSingleSwitchData(id: SwitchId): SwitchData {
  const data = getSwitchData();
  return data[id] || { ...DEFAULT_SWITCH_DATA };
}

export function saveSwitchStatus(id: SwitchId, status: SwitchStatus): void {
  const data = getSwitchData();
  data[id] = {
    ...data[id],
    status,
    lastUpdated: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveSwitchMode(id: SwitchId, mode: SwitchMode): void {
  const data = getSwitchData();
  data[id] = {
    ...data[id],
    mode,
    lastUpdated: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function startSwitchTraining(id: SwitchId): void {
  const data = getSwitchData();
  data[id] = {
    ...data[id],
    status: "flickering",
    mode: "training",
    trainingStarted: Date.now(),
    lastUpdated: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function recordSwitchCheckIn(id: SwitchId): void {
  const data = getSwitchData();
  const current = data[id];
  const newCheckIns = (current.checkIns || 0) + 1;
  
  let newStatus: SwitchStatus = current.status;
  if (newCheckIns >= 7 && current.status === "flickering") {
    newStatus = "stable";
  } else if (newCheckIns >= 14 && current.status === "stable") {
    newStatus = "powered";
  } else if (current.status === "off") {
    newStatus = "flickering";
  }

  data[id] = {
    ...current,
    status: newStatus,
    checkIns: newCheckIns,
    streakDays: current.streakDays + 1,
    lastUpdated: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getActiveSwitches(): SwitchId[] {
  const data = getSwitchData();
  return (Object.keys(data) as SwitchId[]).filter(id => data[id].status !== "off");
}

export function getPrioritySwitches(): SwitchId[] {
  const data = getSwitchData();
  return (Object.keys(data) as SwitchId[])
    .filter(id => data[id].mode === "training" || data[id].status === "flickering")
    .slice(0, 2);
}
