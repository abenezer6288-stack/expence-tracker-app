import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../store/themeStore';
import { expenseService } from '../services/expenseService';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

interface OCRResult {
  amount: number | null;
  date: string;
  merchant: string;
  suggestedCategory: string;
  rawText: string;
}

export const ScanScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useThemeStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [confidence, setConfidence] = useState(0);

  const pickImage = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to continue');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, base64: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, base64: false, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setResult(null);
      await scanImage(result.assets[0].uri);
    }
  };

  const scanImage = async (uri: string) => {
    setScanning(true);
    try {
      const data = await expenseService.scanOCR(uri);
      setResult(data.extracted);
      setConfidence(data.confidence);
    } catch (err: any) {
      Alert.alert('Scan Failed', err.response?.data?.error || 'Could not process image. Try a clearer photo.');
    } finally {
      setScanning(false);
    }
  };

  const handleUseResult = () => {
    if (!result) return;
    navigation.navigate('AddExpense', {
      prefill: {
        amount: result.amount,
        date: result.date,
        merchant: result.merchant,
        suggestedCategory: result.suggestedCategory,
      },
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Scan Receipt</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Upload Area */}
      {!imageUri ? (
        <View style={styles.uploadSection}>
          <LinearGradient
            colors={[COLORS.primary + '15', COLORS.primaryDark + '10']}
            style={styles.uploadArea}
          >
            <Ionicons name="scan" size={64} color={COLORS.primary} />
            <Text style={[styles.uploadTitle, { color: colors.text }]}>Scan Bank Screenshot</Text>
            <Text style={[styles.uploadSubtitle, { color: colors.textSecondary }]}>
              Upload a bank SMS, transaction screenshot, or receipt
            </Text>
          </LinearGradient>

          <View style={styles.uploadButtons}>
            <TouchableOpacity
              style={[styles.uploadBtn, { backgroundColor: colors.card }, SHADOWS.sm]}
              onPress={() => pickImage(true)}
            >
              <Ionicons name="camera" size={28} color={COLORS.primary} />
              <Text style={[styles.uploadBtnText, { color: colors.text }]}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.uploadBtn, { backgroundColor: colors.card }, SHADOWS.sm]}
              onPress={() => pickImage(false)}
            >
              <Ionicons name="images" size={28} color={COLORS.secondary} />
              <Text style={[styles.uploadBtnText, { color: colors.text }]}>Gallery</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.tipsCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>Tips for best results</Text>
            {[
              'Ensure text is clearly visible',
              'Good lighting, no shadows',
              'Include the amount and date',
              'Bank SMS screenshots work great',
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.resultSection}>
          {/* Preview */}
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />

          {scanning ? (
            <View style={styles.scanningCard}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={[styles.scanningText, { color: colors.text }]}>Analyzing image...</Text>
              <Text style={[styles.scanningSubtext, { color: colors.textSecondary }]}>
                Extracting transaction details
              </Text>
            </View>
          ) : result ? (
            <View style={[styles.resultCard, { backgroundColor: colors.card }, SHADOWS.md]}>
              <View style={styles.resultHeader}>
                <Text style={[styles.resultTitle, { color: colors.text }]}>Extracted Data</Text>
                <View style={[styles.confidenceBadge, {
                  backgroundColor: confidence > 70 ? COLORS.success + '20' : COLORS.warning + '20'
                }]}>
                  <Text style={[styles.confidenceText, {
                    color: confidence > 70 ? COLORS.success : COLORS.warning
                  }]}>
                    {confidence}% confidence
                  </Text>
                </View>
              </View>

              {[
                { label: 'Amount', value: result.amount ? `$${result.amount}` : 'Not detected', icon: 'cash-outline' },
                { label: 'Date', value: result.date || 'Not detected', icon: 'calendar-outline' },
                { label: 'Merchant', value: result.merchant || 'Not detected', icon: 'storefront-outline' },
                { label: 'Category', value: result.suggestedCategory || 'Others', icon: 'pricetag-outline' },
              ].map((item) => (
                <View key={item.label} style={styles.resultRow}>
                  <Ionicons name={item.icon as any} size={18} color={COLORS.primary} />
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                    <Text style={[styles.resultValue, { color: colors.text }]}>{item.value}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={[styles.retryBtn, { borderColor: colors.border }]}
                  onPress={() => { setImageUri(null); setResult(null); }}
                >
                  <Text style={[styles.retryText, { color: colors.textSecondary }]}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.useBtn} onPress={handleUseResult}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    style={styles.useBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.useBtnText}>Use & Edit</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACING.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700' },
  uploadSection: { gap: SPACING.lg },
  uploadArea: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
    borderStyle: 'dashed',
  },
  uploadTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700' },
  uploadSubtitle: { fontSize: FONTS.sizes.sm, textAlign: 'center', lineHeight: 20 },
  uploadButtons: { flexDirection: 'row', gap: SPACING.md },
  uploadBtn: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  uploadBtnText: { fontSize: FONTS.sizes.md, fontWeight: '600' },
  tipsCard: { borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.sm },
  tipsTitle: { fontSize: FONTS.sizes.md, fontWeight: '600', marginBottom: SPACING.xs },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  tipText: { fontSize: FONTS.sizes.sm },
  resultSection: { gap: SPACING.lg },
  preview: { width: '100%', height: 200, borderRadius: RADIUS.lg },
  scanningCard: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
  scanningText: { fontSize: FONTS.sizes.lg, fontWeight: '600' },
  scanningSubtext: { fontSize: FONTS.sizes.sm },
  resultCard: { borderRadius: RADIUS.xl, padding: SPACING.lg, gap: SPACING.md },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700' },
  confidenceBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  confidenceText: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  resultInfo: { flex: 1 },
  resultLabel: { fontSize: FONTS.sizes.xs },
  resultValue: { fontSize: FONTS.sizes.md, fontWeight: '600' },
  resultActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  retryBtn: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { fontSize: FONTS.sizes.md, fontWeight: '600' },
  useBtn: { flex: 2, borderRadius: RADIUS.lg, overflow: 'hidden' },
  useBtnGradient: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  useBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '600' },
});
