import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONTS, SPACING, SHADOWS } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { Expense } from '../services/expenseService';

interface Props {
  expense: Expense;
  onPress?: () => void;
  onDelete?: () => void;
}

const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const ExpenseCard: React.FC<Props> = ({ expense, onPress, onDelete }) => {
  const { colors } = useThemeStore();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
      style={[styles.card, { backgroundColor: colors.card }, SHADOWS.sm]}
    >
      <View style={[styles.iconContainer, { backgroundColor: expense.category_color + '20' }]}>
        <Ionicons
          name={(expense.category_icon || 'ellipsis-horizontal') as any}
          size={22}
          color={expense.category_color || COLORS.primary}
        />
      </View>

      <View style={styles.info}>
        <Text style={[styles.merchant, { color: colors.text }]} numberOfLines={1}>
          {expense.merchant || expense.description || 'Expense'}
        </Text>
        <Text style={[styles.category, { color: colors.textSecondary }]}>
          {expense.category_name || 'Uncategorized'} · {formatDate(expense.date)}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: colors.text }]}>
          -{formatCurrency(expense.amount, expense.currency)}
        </Text>
        {expense.source === 'ocr' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>OCR</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  merchant: { fontSize: FONTS.sizes.md, fontWeight: '600', marginBottom: 2 },
  category: { fontSize: FONTS.sizes.sm },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: FONTS.sizes.md, fontWeight: '700' },
  badge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  badgeText: { color: COLORS.primary, fontSize: 10, fontWeight: '600' },
});
