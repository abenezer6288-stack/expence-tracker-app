import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONTS, SPACING } from '../../constants/theme';
import { useThemeStore } from '../../store/themeStore';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label, error, icon, rightIcon, onRightIconPress, isPassword, style, ...props
}) => {
  const { colors, isDark } = useThemeStore();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View style={[
        styles.inputWrapper,
        { backgroundColor: colors.inputBg, borderColor: error ? COLORS.error : colors.border },
      ]}>
        {icon && (
          <Ionicons name={icon} size={18} color={colors.textSecondary} style={styles.leftIcon} />
        )}
        <TextInput
          style={[styles.input, { color: colors.text }, style]}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.rightIcon}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        {rightIcon && !isPassword && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: { fontSize: FONTS.sizes.sm, fontWeight: '500', marginBottom: SPACING.xs },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    height: 52,
  },
  leftIcon: { marginRight: SPACING.sm },
  rightIcon: { padding: SPACING.xs },
  input: { flex: 1, fontSize: FONTS.sizes.md, height: '100%' },
  error: { color: COLORS.error, fontSize: FONTS.sizes.xs, marginTop: SPACING.xs },
});
