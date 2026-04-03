import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../store/themeStore';
import { notificationService } from '../services/notificationService';
import { storage } from '../utils/storage';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

export const AutoTrackSettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useThemeStore();
  const [autoTrackEnabled, setAutoTrackEnabled] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const autoTrack = await storage.getItem('autoTrackEnabled');
      const autoSave = await storage.getItem('autoSaveEnabled');
      setAutoTrackEnabled(autoTrack === 'true');
      setAutoSaveEnabled(autoSave === 'true');
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoTrack = async (value: boolean) => {
    if (value) {
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please enable notification permissions to use auto-tracking',
          [{ text: 'OK' }]
        );
        return;
      }

      // Start listening
      notificationService.startListening((payment) => {
        console.log('Payment detected:', payment);
        
        if (autoSaveEnabled) {
          // Auto-save the expense
          notificationService.autoSaveExpense(payment, 'user-id');
          Alert.alert('Expense Added', `${payment.amount} at ${payment.merchant}`);
        } else {
          // Show confirmation
          Alert.alert(
            'Payment Detected',
            `Amount: ${payment.amount}\nMerchant: ${payment.merchant}`,
            [
              { text: 'Ignore', style: 'cancel' },
              {
                text: 'Add Expense',
                onPress: () => {
                  navigation.navigate('AddExpense', {
                    prefill: {
                      amount: payment.amount,
                      merchant: payment.merchant,
                      date: payment.date,
                    },
                  });
                },
              },
            ]
          );
        }
      });
    } else {
      notificationService.stopListening();
    }

    setAutoTrackEnabled(value);
    await storage.setItem('autoTrackEnabled', value.toString());
  };

  const handleToggleAutoSave = async (value: boolean) => {
    setAutoSaveEnabled(value);
    await storage.setItem('autoSaveEnabled', value.toString());
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Auto-Track Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: COLORS.primary + '15' }]}>
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            Automatically detect payment notifications from your bank and track expenses
          </Text>
        </View>

        {/* Settings */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Enable Auto-Tracking
              </Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                Detect payment notifications automatically
              </Text>
            </View>
            <Switch
              value={autoTrackEnabled}
              onValueChange={handleToggleAutoTrack}
              trackColor={{ false: '#E5E7EB', true: COLORS.primary + '80' }}
              thumbColor={autoTrackEnabled ? COLORS.primary : '#fff'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Auto-Save Expenses
              </Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                Automatically save detected payments without confirmation
              </Text>
            </View>
            <Switch
              value={autoSaveEnabled}
              onValueChange={handleToggleAutoSave}
              disabled={!autoTrackEnabled}
              trackColor={{ false: '#E5E7EB', true: COLORS.primary + '80' }}
              thumbColor={autoSaveEnabled ? COLORS.primary : '#fff'}
            />
          </View>
        </View>

        {/* How it works */}
        <View style={styles.howItWorks}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>How it works</Text>
          
          {[
            {
              icon: 'notifications-outline',
              title: 'Notification Detection',
              desc: 'App monitors notifications from banking apps',
            },
            {
              icon: 'search-outline',
              title: 'Smart Extraction',
              desc: 'Extracts amount, merchant, and date from notification text',
            },
            {
              icon: 'checkmark-circle-outline',
              title: 'Auto or Manual',
              desc: 'Choose to auto-save or review before adding',
            },
          ].map((step, i) => (
            <View key={i} style={[styles.stepCard, { backgroundColor: colors.card }]}>
              <View style={[styles.stepIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <Ionicons name={step.icon as any} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.stepInfo}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Supported Banks */}
        <View style={styles.supportedSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Supported Notifications</Text>
          <View style={[styles.supportedCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.supportedText, { color: colors.textSecondary }]}>
              • Bank SMS notifications{'\n'}
              • UPI payment apps (PhonePe, Paytm, GPay){'\n'}
              • Banking apps (SBI, HDFC, ICICI, Axis, etc.){'\n'}
              • Card transaction alerts{'\n'}
              • Any payment notification with amount
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FONTS.sizes.xl, fontWeight: '700' },
  content: { flex: 1, padding: SPACING.lg },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  infoText: { flex: 1, fontSize: FONTS.sizes.sm, lineHeight: 20 },
  section: {
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  settingInfo: { flex: 1, paddingRight: SPACING.md },
  settingLabel: { fontSize: FONTS.sizes.md, fontWeight: '600', marginBottom: 4 },
  settingDesc: { fontSize: FONTS.sizes.sm, lineHeight: 18 },
  divider: { height: 1, marginVertical: SPACING.sm },
  howItWorks: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', marginBottom: SPACING.md },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInfo: { flex: 1 },
  stepTitle: { fontSize: FONTS.sizes.md, fontWeight: '600', marginBottom: 2 },
  stepDesc: { fontSize: FONTS.sizes.sm, lineHeight: 18 },
  supportedSection: { marginBottom: SPACING.xl },
  supportedCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  supportedText: { fontSize: FONTS.sizes.sm, lineHeight: 22 },
});
