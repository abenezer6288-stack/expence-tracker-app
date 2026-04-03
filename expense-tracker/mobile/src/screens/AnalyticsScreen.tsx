import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { analyticsService } from '../services/expenseService';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const { width } = Dimensions.get('window');
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

export const AnalyticsScreen = () => {
  const { colors, isDark } = useThemeStore();
  const { user } = useAuthStore();
  const [view, setView] = useState<'monthly' | 'yearly'>('monthly');
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [yearlyData, setYearlyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, [selectedMonth, view]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (view === 'monthly') {
        const data = await analyticsService.monthly(selectedMonth, selectedYear);
        setMonthlyData(data);
      } else {
        const data = await analyticsService.yearly(selectedYear);
        setYearlyData(data);
      }
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
    labelColor: () => colors.textSecondary,
    style: { borderRadius: RADIUS.lg },
    propsForDots: { r: '4', strokeWidth: '2', stroke: COLORS.primary },
  };

  const pieData = monthlyData?.byCategory?.slice(0, 6).map((cat: any) => ({
    name: cat.name,
    population: parseFloat(cat.total),
    color: cat.color,
    legendFontColor: colors.textSecondary,
    legendFontSize: 12,
  })) || [];

  const lineData = view === 'monthly'
    ? {
        labels: monthlyData?.dailyTrend?.map((d: any) => `${d.day}`) || [],
        datasets: [{ data: monthlyData?.dailyTrend?.map((d: any) => parseFloat(d.total)) || [0] }],
      }
    : {
        labels: MONTHS,
        datasets: [{
          data: Array.from({ length: 12 }, (_, i) => {
            const found = yearlyData?.monthly?.find((m: any) => parseInt(m.month) === i + 1);
            return found ? parseFloat(found.total) : 0;
          }),
        }],
      };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Analytics</Text>
        <View style={[styles.toggle, { backgroundColor: colors.inputBg }]}>
          {(['monthly', 'yearly'] as const).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setView(v)}
              style={[styles.toggleBtn, view === v && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, view === v && styles.toggleActiveText]}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Month Selector */}
      {view === 'monthly' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
          {MONTHS.map((m, i) => (
            <TouchableOpacity
              key={m}
              onPress={() => setSelectedMonth(i + 1)}
              style={[
                styles.monthChip,
                { backgroundColor: colors.card },
                selectedMonth === i + 1 && { backgroundColor: COLORS.primary },
              ]}
            >
              <Text style={[
                styles.monthChipText,
                { color: colors.textSecondary },
                selectedMonth === i + 1 && { color: '#fff', fontWeight: '600' },
              ]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card }, SHADOWS.sm]}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Spent</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatCurrency(
                  view === 'monthly' ? monthlyData?.summary?.total || 0 : yearlyData?.total || 0,
                  user?.currency
                )}
              </Text>
            </View>
            {view === 'monthly' && (
              <View style={[styles.summaryCard, { backgroundColor: colors.card }, SHADOWS.sm]}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Transactions</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {monthlyData?.summary?.count || 0}
                </Text>
              </View>
            )}
          </View>

          {/* Spending Trend Line Chart */}
          {lineData.datasets[0].data.length > 1 && (
            <View style={[styles.chartCard, { backgroundColor: colors.card }, SHADOWS.sm]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Spending Trend</Text>
              <LineChart
                data={lineData}
                width={width - SPACING.lg * 2 - SPACING.md * 2}
                height={180}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={false}
              />
            </View>
          )}

          {/* Category Pie Chart */}
          {pieData.length > 0 && (
            <View style={[styles.chartCard, { backgroundColor: colors.card }, SHADOWS.sm]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>By Category</Text>
              <PieChart
                data={pieData}
                width={width - SPACING.lg * 2 - SPACING.md * 2}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute={false}
              />
            </View>
          )}

          {/* Category Breakdown */}
          {view === 'monthly' && monthlyData?.byCategory?.length > 0 && (
            <View style={[styles.breakdownCard, { backgroundColor: colors.card }, SHADOWS.sm]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Category Breakdown</Text>
              {monthlyData.byCategory.map((cat: any) => {
                const pct = monthlyData.summary.total > 0
                  ? Math.round((cat.total / monthlyData.summary.total) * 100)
                  : 0;
                return (
                  <View key={cat.id} style={styles.breakdownRow}>
                    <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                    <View style={styles.breakdownInfo}>
                      <View style={styles.breakdownTop}>
                        <Text style={[styles.breakdownName, { color: colors.text }]}>{cat.name}</Text>
                        <Text style={[styles.breakdownAmount, { color: colors.text }]}>
                          {formatCurrency(cat.total, user?.currency)}
                        </Text>
                      </View>
                      <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                      </View>
                    </View>
                    <Text style={[styles.breakdownPct, { color: colors.textSecondary }]}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 56,
    paddingBottom: SPACING.md,
  },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800' },
  toggle: { flexDirection: 'row', borderRadius: RADIUS.full, padding: 3 },
  toggleBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: FONTS.sizes.sm, color: '#9CA3AF' },
  toggleActiveText: { color: '#fff', fontWeight: '600' },
  monthScroll: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  monthChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
  },
  monthChipText: { fontSize: FONTS.sizes.sm },
  loadingContainer: { padding: SPACING.xxl, alignItems: 'center' },
  content: { padding: SPACING.lg, gap: SPACING.md },
  summaryRow: { flexDirection: 'row', gap: SPACING.md },
  summaryCard: { flex: 1, borderRadius: RADIUS.lg, padding: SPACING.md },
  summaryLabel: { fontSize: FONTS.sizes.xs, marginBottom: 4 },
  summaryValue: { fontSize: FONTS.sizes.xl, fontWeight: '700' },
  chartCard: { borderRadius: RADIUS.xl, padding: SPACING.md },
  chartTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', marginBottom: SPACING.md },
  chart: { borderRadius: RADIUS.lg },
  breakdownCard: { borderRadius: RADIUS.xl, padding: SPACING.md, gap: SPACING.md },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  breakdownInfo: { flex: 1, gap: 4 },
  breakdownTop: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownName: { fontSize: FONTS.sizes.sm, fontWeight: '500' },
  breakdownAmount: { fontSize: FONTS.sizes.sm, fontWeight: '600' },
  progressBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  breakdownPct: { fontSize: FONTS.sizes.xs, width: 32, textAlign: 'right' },
});
