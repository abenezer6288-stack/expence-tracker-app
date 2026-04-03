import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { userService } from '../services/expenseService';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br' },
];

export const SelectCurrencyScreen = () => {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuthStore();
  const { colors } = useThemeStore();
  const [selected, setSelected] = useState(user?.currency || 'USD');
  const [loading, setLoading] = useState(false);

  const handleSelect = async (code: string) => {
    setSelected(code);
    setLoading(true);
    try {
      await userService.updateProfile({ currency: code });
      updateUser({ currency: code });
      setTimeout(() => navigation.goBack(), 300);
    } catch (err) {
      console.error('Failed to update currency:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Select Currency</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {CURRENCIES.map((currency) => (
          <TouchableOpacity
            key={currency.code}
            style={[
              styles.currencyItem,
              { backgroundColor: colors.card, borderColor: colors.border },
              selected === currency.code && { borderColor: COLORS.primary, borderWidth: 2 },
            ]}
            onPress={() => handleSelect(currency.code)}
            disabled={loading}
          >
            <View style={styles.currencyInfo}>
              <Text style={[styles.currencySymbol, { color: COLORS.primary }]}>
                {currency.symbol}
              </Text>
              <View style={styles.currencyText}>
                <Text style={[styles.currencyCode, { color: colors.text }]}>
                  {currency.code}
                </Text>
                <Text style={[styles.currencyName, { color: colors.textSecondary }]}>
                  {currency.name}
                </Text>
              </View>
            </View>
            {selected === currency.code && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}
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
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  currencyInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  currencySymbol: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
    width: 40,
    textAlign: 'center',
  },
  currencyText: { gap: 2 },
  currencyCode: { fontSize: FONTS.sizes.md, fontWeight: '600' },
  currencyName: { fontSize: FONTS.sizes.sm },
});
