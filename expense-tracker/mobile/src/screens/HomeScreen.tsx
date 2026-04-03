import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ExpenseCard } from '../components/ExpenseCard';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { expenseService, analyticsService, Expense } from '../services/expenseService';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { colors, isDark } = useThemeStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [expData, analyticsData, insightData] = await Promise.all([
        expenseService.getAll({ limit: 5 }),
        analyticsService.monthly(),
        analyticsService.insights(),
      ]);
      setExpenses(expData.expenses);
      setSummary(analyticsData.summary);
      setInsights(insightData.insights?.slice(0, 2) || []);
    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0]} 👋</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.avatarBtn}
          >
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Total Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>This Month's Spending</Text>
          <Text style={styles.totalAmount}>
            {formatCurrency(summary?.total || 0, user?.currency)}
          </Text>
          <View style={styles.changeRow}>
            <Ionicons
              name={summary?.changePercent >= 0 ? 'trending-up' : 'trending-down'}
              size={16}
              color={summary?.changePercent >= 0 ? '#FF6B6B' : '#43E97B'}
            />
            <Text style={[
              styles.changeText,
              { color: summary?.changePercent >= 0 ? '#FF6B6B' : '#43E97B' }
            ]}>
              {Math.abs(summary?.changePercent || 0)}% vs last month
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {[
          { icon: 'add-circle', label: 'Add', screen: 'AddExpense', color: COLORS.primary },
          { icon: 'camera', label: 'Scan', screen: 'ScanScreen', color: COLORS.secondary },
          { icon: 'bar-chart', label: 'Analytics', screen: 'Analytics', color: COLORS.accent },
          { icon: 'wallet', label: 'Budget', screen: 'Budget', color: '#F59E0B' },
        ].map((action) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.actionBtn, { backgroundColor: colors.card }, SHADOWS.sm]}
            onPress={() => navigation.navigate(action.screen)}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
              <Ionicons name={action.icon as any} size={22} color={action.color} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Smart Insights</Text>
          {insights.map((insight, i) => (
            <View key={i} style={[styles.insightCard, { backgroundColor: colors.card }, SHADOWS.sm]}>
              <Text style={styles.insightIcon}>{insight.icon}</Text>
              <Text style={[styles.insightText, { color: colors.text }]}>{insight.message}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Expenses */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Expenses</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddExpense')}>
            <Text style={styles.seeAll}>Add more</Text>
          </TouchableOpacity>
        </View>

        {expenses.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expenses yet</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddExpense')}>
              <Text style={styles.emptyAction}>Add your first expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          expenses.map((expense) => (
            <TouchableOpacity
              key={expense.id}
              onPress={() => {
                // Show expense details in an alert
                const details = [
                  `Category: ${expense.category_name}`,
                  `Amount: ${expense.amount} ${expense.currency || user?.currency || 'ETB'}`,
                  expense.merchant ? `Merchant: ${expense.merchant}` : null,
                  `Date: ${new Date(expense.date).toLocaleDateString()}`,
                  expense.description ? `Description: ${expense.description}` : null,
                ].filter(Boolean).join('\n');
                
                Alert.alert('Expense Details', details, [{ text: 'OK' }]);
              }}
              activeOpacity={0.8}
            >
              <ExpenseCard expense={expense} />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: FONTS.sizes.md },
  userName: { color: '#fff', fontSize: FONTS.sizes.xl, fontWeight: '700' },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: FONTS.sizes.lg, fontWeight: '700' },
  totalCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FONTS.sizes.sm, marginBottom: SPACING.xs },
  totalAmount: { color: '#fff', fontSize: FONTS.sizes.xxxl, fontWeight: '800', letterSpacing: -1 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.xs },
  changeText: { fontSize: FONTS.sizes.sm, fontWeight: '500' },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: FONTS.sizes.xs, fontWeight: '500' },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700' },
  seeAll: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  insightIcon: { fontSize: 24 },
  insightText: { flex: 1, fontSize: FONTS.sizes.sm, lineHeight: 20 },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  emptyText: { fontSize: FONTS.sizes.md },
  emptyAction: { color: COLORS.primary, fontSize: FONTS.sizes.md, fontWeight: '600' },
});
