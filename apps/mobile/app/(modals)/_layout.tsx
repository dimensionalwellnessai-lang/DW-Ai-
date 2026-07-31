import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack screenOptions={{ presentation: 'modal' }}>
      <Stack.Screen name="paywall" options={{ title: 'Upgrade to DW Plus' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
