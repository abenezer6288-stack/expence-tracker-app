import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { expenseService, userService } from '../services/expenseService';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export const AddExpenseScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useThemeStore();
  const { user } = useAuthStore();

  // Pre-fill from OCR if available
  const prefill = route.params?.prefill || {};

  const [form, setForm] = useState({
    amount: prefill.amount?.toString() || '',
    description: prefill.description || '',
    merchant: prefill.merchant || '',
    notes: '',
    date: prefill.date || new Date().toISOString().split('T')[0],
    currency: user?.currency || 'USD',
  });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    userService.getCategories().then((cats) => {
      setCategories(cats);
      // Auto-select suggested category from OCR
      if (prefill.suggestedCategory) {
        const match = cats.find((c: Category) =>
          c.name.toLowerCase() === prefill.suggestedCategory.toLowerCase()
        );
        if (match) setSelectedCategory(match);
      }
    });
  }, []);

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.amount || isNaN(parseFloat(form.amount))) e.amount = 'Valid amount required';
    if (!selectedCategory) e.category = 'Please select a category';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await expenseService.create({
        amount: parseFloat(form.amount),
        category_id: selectedCategory!.id,
        description: form.description,
        merchant: form.merchant,
        notes: form.notes,
        date: form.date,
        currency: form.currency,
        source: prefill.amount ? 'ocr' : 'manual',
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {prefill.amount ? 'Review Scanned Expense' : 'Add Expense'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Amount Input */}
        <View style={[styles.amountCard, { backgroundColor: colors.card }, SHADOWS.md]}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.currencySymbol, { color: COLORS.primary }]}>
              {form.currency === 'USD' ? '$' : form.currency === 'EUR' ? '€' : form.currency === 'ETB' ? 'Br' : '₹'}
            </Text>
            <TextInput
              value={form.amount}
              onChangeText={set('amount')}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              style={[styles.amountInput, { color: colors.text }]}
            />
          </View>
          {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
        </View>

        {/* Category Selector */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Category</Text>
        {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryChip,
                { backgroundColor: colors.card },
                selectedCategory?.id === cat.id && { backgroundColor: cat.color + '25', borderColor: cat.color },
              ]}
            >
              <Ionicons name={cat.icon as any} size={18} color={cat.color} />
              <Text style={[
                styles.categoryChipText,
                { color: colors.textSecondary },
                selectedCategory?.id === cat.id && { color: cat.color, fontWeight: '600' },
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Details */}
        <Input
          label="Merchant / Store"
          icon="storefront-outline"
          placeholder="e.g. Starbucks"
          value={form.merchant}
          onChangeText={set('merchant')}
        />
        <Input
          label="Description"
          icon="document-text-outline"
          placeholder="What was this for?"
          value={form.description}
          onChangeText={set('description')}
        />
        <Input
          label="Date"
          icon="calendar-outline"
          placeholder="YYYY-MM-DD"
          value={form.date}
          onChangeText={set('date')}
        />
        <Input
          label="Notes (optional)"
          icon="chatbubble-outline"
          placeholder="Any additional notes..."
          value={form.notes}
          onChangeText={set('notes')}
          multiline
        />

        <Button title="Save Expense" onPress={handleSave} loading={loading} style={styles.saveBtn} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700' },
  content: { padding: SPACING.lg },
  amountCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  amountLabel: { fontSize: FONTS.sizes.sm, marginBottom: SPACING.sm },
  amountRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  currencySymbol: { fontSize: FONTS.sizes.xxxl, fontWeight: '300', marginRight: SPACING.xs },
  amountInput: { 
    fontSize: FONTS.sizes.xxxl, 
    fontWeight: '700', 
    flex: 1,
    textAlign: 'center',
    padding: SPACING.sm,
  },
  sectionLabel: { fontSize: FONTS.sizes.md, fontWeight: '600', marginBottom: SPACING.sm },
  errorText: { color: COLORS.error, fontSize: FONTS.sizes.xs, marginBottom: SPACING.xs },
  categoryScroll: { marginBottom: SPACING.lg },
  categoryChip: {
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
  categoryChipText: { fontSize: FONTS.sizes.sm },
  saveBtn: { marginTop: SPACING.md },
});
