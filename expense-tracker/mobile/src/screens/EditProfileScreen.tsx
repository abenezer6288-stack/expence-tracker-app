import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { userService } from '../services/expenseService';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export const EditProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [monthlyBudget, setMonthlyBudget] = useState(user?.monthly_budget?.toString() || '0');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        monthly_budget: parseFloat(monthlyBudget) || 0,
      };
      
      await userService.updateProfile(data);
      updateUser(data);
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Input
          label="Full Name"
          icon="person-outline"
          placeholder="Your name"
          value={name}
          onChangeText={setName}
        />

        <Input
          label="Email"
          icon="mail-outline"
          value={user?.email || ''}
          editable={false}
          style={{ opacity: 0.6 }}
        />

        <Input
          label="Monthly Budget"
          icon="wallet-outline"
          placeholder="0"
          value={monthlyBudget}
          onChangeText={setMonthlyBudget}
          keyboardType="numeric"
        />

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={loading}
          style={styles.saveBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: '#1A1A2E' },
  content: { flex: 1, padding: SPACING.lg },
  saveBtn: { marginTop: SPACING.md },
});
