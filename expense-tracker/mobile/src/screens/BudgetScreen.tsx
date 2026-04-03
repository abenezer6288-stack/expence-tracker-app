import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { budgetService, userService } from '../services/expenseService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

export const BudgetScreen = () => {
  const { colors } = useThemeStore();
  const { user } = useAuthStore();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [b, c] = await Promise.all([
        budgetService.getAll(month, year),
        userService.getCategories(),
      ]);
      setBudgets(b);
      setCategories(c);
    } catch (err) {
      console.error('Budget load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + parseFloat(b.spent), 0);
  const overallPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  const handleSaveBudget = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!budgetAmount || parseFloat(budgetAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }
    
    setSaving(true);
    try {
      await budgetService.upsert({
        category_id: selectedCategory.id,
        amount: parseFloat(budgetAmount),
        month,
        year,
      });
      setModalVisible(false);
      setBudgetAmount('');
      setSelectedCategory(null);
      await loadData();
      Alert.alert('Success', 'Budget saved successfully');
    } catch (err: any) {
      console.error('Save budget error:', err);
      Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Budget', 'Remove this budget limit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await budgetService.delete(id);
          loadData();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
          <Text style={styles.headerTitle}>Budget Manager</Text>
          <Text style={styles.headerSubtitle}>
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Text>

          {/* Overall Progress */}
          <View style={styles.overallCard}>
            <View style={styles.overallRow}>
              <Text style={styles.overallLabel}>Overall Budget</Text>
              <Text style={styles.overallPct}>{Math.round(overallPct)}% used</Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[
                styles.progressFill,
                { width: `${overallPct}%`, backgroundColor: overallPct > 90 ? COLORS.error : COLORS.accent }
              ]} />
            </View>
            <View style={styles.overallAmounts}>
              <Text style={styles.overallSpent}>{formatCurrency(totalSpent, user?.currency)} spent</Text>
              <Text style={styles.overallTotal}>of {formatCurrency(totalBudget, user?.currency)}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {budgets.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Ionicons name="wallet-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No budgets set</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Set spending limits per category to stay on track
              </Text>
            </View>
          ) : (
            budgets.map((budget) => {
              const pct = Math.min(parseFloat(budget.percentage_used), 100);
              const isOver = pct >= 100;
              const isWarning = pct >= 80;
              const barColor = isOver ? COLORS.error : isWarning ? COLORS.warning : COLORS.success;

              return (
                <View key={budget.id} style={[styles.budgetCard, { backgroundColor: colors.card }, SHADOWS.sm]}>
                  <View style={styles.budgetHeader}>
                    <View style={[styles.catIcon, { backgroundColor: budget.color + '20' }]}>
                      <Ionicons name={budget.icon as any} size={20} color={budget.color} />
                    </View>
                    <View style={styles.budgetInfo}>
                      <Text style={[styles.budgetName, { color: colors.text }]}>{budget.category_name}</Text>
                      <Text style={[styles.budgetAmounts, { color: colors.textSecondary }]}>
                        {formatCurrency(budget.spent, user?.currency)} / {formatCurrency(budget.amount, user?.currency)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(budget.id)}>
                      <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.budgetProgressBg, { backgroundColor: colors.border }]}>
                    <View style={[styles.budgetProgressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                  </View>

                  <View style={styles.budgetFooter}>
                    <Text style={[styles.budgetPct, { color: barColor }]}>{pct}% used</Text>
                    {isOver ? (
                      <Text style={[styles.budgetStatus, { color: COLORS.error }]}>Over budget!</Text>
                    ) : (
                      <Text style={[styles.budgetRemaining, { color: colors.textSecondary }]}>
                        {formatCurrency(budget.remaining, user?.currency)} left
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Add Budget Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Set Budget</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Select Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.catChip,
                    { backgroundColor: colors.inputBg },
                    selectedCategory?.id === cat.id && { backgroundColor: cat.color + '25', borderColor: cat.color },
                  ]}
                >
                  <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                  <Text style={[styles.catChipText, { color: colors.text }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input
              label="Monthly Budget Amount"
              icon="cash-outline"
              placeholder="0.00"
              value={budgetAmount}
              onChangeText={(text) => {
                console.log('Budget amount changed:', text);
                setBudgetAmount(text);
              }}
              keyboardType="decimal-pad"
            />

            <Button 
              title="Save Budget" 
              onPress={() => {
                console.log('Save button pressed');
                console.log('Selected category:', selectedCategory);
                console.log('Budget amount:', budgetAmount);
                handleSaveBudget();
              }} 
              loading={saving}
              disabled={!selectedCategory || !budgetAmount}
            />
          </View>
        </View>
      </Modal>
    </View>
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
  headerTitle: { color: '#fff', fontSize: FONTS.sizes.xxl, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: FONTS.sizes.sm, marginBottom: SPACING.lg },
  overallCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  overallRow: { flexDirection: 'row', justifyContent: 'space-between' },
  overallLabel: { color: 'rgba(255,255,255,0.9)', fontSize: FONTS.sizes.sm, fontWeight: '600' },
  overallPct: { color: '#fff', fontSize: FONTS.sizes.sm, fontWeight: '700' },
  progressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  overallAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
  overallSpent: { color: '#fff', fontSize: FONTS.sizes.sm, fontWeight: '600' },
  overallTotal: { color: 'rgba(255,255,255,0.7)', fontSize: FONTS.sizes.sm },
  content: { padding: SPACING.lg, gap: SPACING.md },
  emptyState: { borderRadius: RADIUS.xl, padding: SPACING.xxl, alignItems: 'center', gap: SPACING.md },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700' },
  emptySubtitle: { fontSize: FONTS.sizes.sm, textAlign: 'center' },
  budgetCard: { borderRadius: RADIUS.xl, padding: SPACING.md, gap: SPACING.sm },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  catIcon: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  budgetInfo: { flex: 1 },
  budgetName: { fontSize: FONTS.sizes.md, fontWeight: '600' },
  budgetAmounts: { fontSize: FONTS.sizes.sm },
  budgetProgressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  budgetProgressFill: { height: '100%', borderRadius: 3 },
  budgetFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetPct: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  budgetStatus: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  budgetRemaining: { fontSize: FONTS.sizes.xs },
  fab: { position: 'absolute', bottom: 24, right: 24, borderRadius: 28, ...SHADOWS.lg },
  fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SPACING.lg, gap: SPACING.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700' },
  modalLabel: { fontSize: FONTS.sizes.sm, fontWeight: '500' },
  catScroll: { marginBottom: SPACING.sm },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  catChipText: { fontSize: FONTS.sizes.sm },
});
