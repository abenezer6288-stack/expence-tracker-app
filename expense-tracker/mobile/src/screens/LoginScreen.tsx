import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

export const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      console.log('LoginScreen: Calling login...');
      await login(email, password);
      console.log('LoginScreen: Login successful!');
    } catch (err: any) {
      console.error('LoginScreen: Login error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      const errorMsg = err.response?.data?.error || err.message || 'Something went wrong';
      Alert.alert('Login Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="wallet" size={48} color="#fff" />
          <Text style={styles.appName}>ExpenseAI</Text>
          <Text style={styles.tagline}>Smart money tracking</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <Input
          label="Email"
          icon="mail-outline"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />

        <Input
          label="Password"
          icon="lock-closed-outline"
          placeholder="Your password"
          value={password}
          onChangeText={setPassword}
          isPassword
          error={errors.password}
        />

        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotBtn}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <Button title="Sign In" onPress={handleLogin} loading={loading} />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.registerBtn} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerText}>
            Don't have an account? <Text style={styles.registerLink}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    height: 260,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.xxl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoContainer: { alignItems: 'center', gap: SPACING.xs },
  appName: { color: '#fff', fontSize: FONTS.sizes.xxxl, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { color: 'rgba(255,255,255,0.8)', fontSize: FONTS.sizes.md },
  form: { flex: 1 },
  formContent: { padding: SPACING.lg, paddingTop: SPACING.xl },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  subtitle: { fontSize: FONTS.sizes.md, color: '#6B7280', marginBottom: SPACING.xl },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: SPACING.lg, marginTop: -SPACING.sm },
  forgotText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.lg, gap: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { color: '#9CA3AF', fontSize: FONTS.sizes.sm },
  registerBtn: { alignItems: 'center' },
  registerText: { color: '#6B7280', fontSize: FONTS.sizes.md },
  registerLink: { color: COLORS.primary, fontWeight: '600' },
});
