import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export const RegisterScreen = () => {
  const navigation = useNavigation<any>();
  const { register } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name || form.name.length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
    } catch (err: any) {
      Alert.alert('Registration Failed', err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>

        <View style={styles.headerIcon}>
          <Ionicons name="person-add" size={32} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Start tracking your expenses today</Text>

        <Input
          label="Full Name"
          icon="person-outline"
          placeholder="John Doe"
          value={form.name}
          onChangeText={set('name')}
          error={errors.name}
        />
        <Input
          label="Email"
          icon="mail-outline"
          placeholder="you@example.com"
          value={form.email}
          onChangeText={set('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />
        <Input
          label="Password"
          icon="lock-closed-outline"
          placeholder="Min. 8 characters"
          value={form.password}
          onChangeText={set('password')}
          isPassword
          error={errors.password}
        />
        <Input
          label="Confirm Password"
          icon="lock-closed-outline"
          placeholder="Repeat password"
          value={form.confirm}
          onChangeText={set('confirm')}
          isPassword
          error={errors.confirm}
        />

        <Button title="Create Account" onPress={handleRegister} loading={loading} style={styles.btn} />

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginBtn}>
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: SPACING.lg, paddingTop: SPACING.xxl },
  back: { marginBottom: SPACING.lg },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  subtitle: { fontSize: FONTS.sizes.md, color: '#6B7280', marginBottom: SPACING.xl },
  btn: { marginTop: SPACING.sm },
  loginBtn: { alignItems: 'center', marginTop: SPACING.lg },
  loginText: { color: '#6B7280', fontSize: FONTS.sizes.md },
  loginLink: { color: COLORS.primary, fontWeight: '600' },
});
