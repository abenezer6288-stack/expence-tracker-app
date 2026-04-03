import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from '../src/navigation/AppNavigator';
import { useThemeStore } from '../src/store/themeStore';
import { useAuthStore } from '../src/store/authStore';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

export default function RootLayout() {
  const { isDark } = useThemeStore();
  const { loadStoredAuth } = useAuthStore();

  useEffect(() => {
    loadStoredAuth().finally(() => {
      if (Platform.OS !== 'web') {
        SplashScreen.hideAsync();
      }
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
