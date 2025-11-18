import { Stack } from 'expo-router';

export default function TimerLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',
        headerShown: false
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          presentation: 'modal',
          headerShown: false
        }}
      />
    </Stack>
  );
}