import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { userService } from '../services/expenseService';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'ETB'];

export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, logout, updateUser } = useAuthStore();
  const { colors, isDark, toggleTheme } = useThemeStore();
  const [notifications, setNotifications] = useState(user?.notifications_enabled ?? true);

  const handleToggleNotifications = async (val: boolean) => {
    setNotifications(val);
    try {
      await userService.updateProfile({ notifications_enabled: val });
      updateUser({ notifications_enabled: val });
    } catch {}
  };

  const handleToggleDarkMode = async () => {
    toggleTheme();
    try {
      await userService.updateProfile({ dark_mode: !isDark });
      updateUser({ dark_mode: !isDark });
    } catch {}
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleExportCSV = async () => {
    try {
      Alert.alert('Exporting...', 'Please wait while we prepare your data');
      
      const csvData = await userService.exportCSV();
      
      if (Platform.OS === 'web') {
        // Web: Create blob and trigger download
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        Alert.alert('Success', 'CSV file downloaded successfully');
      } else {
        // Mobile: Save to file system and share
        const fileName = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
        const fileUri = FileSystem.documentDirectory + fileName;
        
        await FileSystem.writeAsStringAsync(fileUri, csvData, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Expenses',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert('Success', `CSV saved to ${fileUri}`);
        }
      }
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Error', error?.response?.data?.error || 'Failed to export CSV');
    }
  };

  const MenuItem = ({ icon, label, value, onPress, rightElement, color }: any) => (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.menuIcon, { backgroundColor: (color || COLORS.primary) + '15' }]}>
        <Ionicons name={icon} size={20} color={color || COLORS.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.menuRight}>
        {value && <Text style={[styles.menuValue, { color: colors.textSecondary }]}>{value}</Text>}
        {rightElement || (onPress && <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />)}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Account Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCOUNT</Text>
        <View style={[styles.section, SHADOWS.sm]}>
          <MenuItem
            icon="person-outline"
            label="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <MenuItem
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <MenuItem
            icon="cash-outline"
            label="Currency"
            value={user?.currency || 'USD'}
            onPress={() => navigation.navigate('SelectCurrency')}
          />
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PREFERENCES</Text>
        <View style={[styles.section, SHADOWS.sm]}>
          <MenuItem
            icon="flash-outline"
            label="Auto-Track Payments"
            onPress={() => navigation.navigate('AutoTrackSettings')}
          />
          <MenuItem
            icon="moon-outline"
            label="Dark Mode"
            rightElement={
              <Switch
                value={isDark}
                onValueChange={handleToggleDarkMode}
                trackColor={{ false: '#E5E7EB', true: COLORS.primary + '80' }}
                thumbColor={isDark ? COLORS.primary : '#fff'}
              />
            }
          />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            rightElement={
              <Switch
                value={notifications}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#E5E7EB', true: COLORS.primary + '80' }}
                thumbColor={notifications ? COLORS.primary : '#fff'}
              />
            }
          />
        </View>

        {/* Data */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DATA</Text>
        <View style={[styles.section, SHADOWS.sm]}>
          <MenuItem
            icon="download-outline"
            label="Export to CSV"
            onPress={handleExportCSV}
          />
          <MenuItem
            icon="cloud-upload-outline"
            label="Backup Data"
            onPress={() => Alert.alert('Coming Soon', 'Cloud backup coming in next update')}
          />
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: COLORS.error + '15' }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={[styles.logoutText, { color: COLORS.error }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textSecondary }]}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.xs,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: { color: '#fff', fontSize: FONTS.sizes.xxxl, fontWeight: '700' },
  name: { color: '#fff', fontSize: FONTS.sizes.xl, fontWeight: '700' },
  email: { color: 'rgba(255,255,255,0.75)', fontSize: FONTS.sizes.sm },
  content: { padding: SPACING.lg, gap: SPACING.sm },
  sectionTitle: { fontSize: FONTS.sizes.xs, fontWeight: '700', letterSpacing: 1, marginTop: SPACING.md },
  section: { borderRadius: RADIUS.xl, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuIcon: { width: 36, height: 36, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: FONTS.sizes.md },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  menuValue: { fontSize: FONTS.sizes.sm },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
  },
  logoutText: { fontSize: FONTS.sizes.md, fontWeight: '600' },
  version: { textAlign: 'center', fontSize: FONTS.sizes.xs, marginTop: SPACING.sm },
});
