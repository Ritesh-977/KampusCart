import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import { useTheme } from '../context/ThemeContext';

const ForgotPasswordScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const memoStyles = useMemo(() => ({
    safeArea: { flex: 1, backgroundColor: theme.background },
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
    backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 30 },
    iconCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: theme.primaryAccent + '20', justifyContent: 'center', alignItems: 'center',
      alignSelf: 'center', marginBottom: 20,
    },
    successIconCircle: {
      width: 100, height: 100, borderRadius: 50,
      backgroundColor: '#16a34a20', justifyContent: 'center', alignItems: 'center',
      alignSelf: 'center', marginBottom: 24,
    },
    title: {
      fontSize: 28, fontWeight: '800', color: theme.textMain,
      textAlign: 'center', marginBottom: 10,
    },
    subtitle: {
      fontSize: 15, color: theme.textSub, textAlign: 'center',
      lineHeight: 23, marginBottom: 32,
    },
    emailText: { fontWeight: '700', color: theme.primaryAccent },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: theme.textSub, marginBottom: 8 },
    inputWrapper: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder,
      borderRadius: 12, paddingHorizontal: 14,
    },
    input: { flex: 1, paddingVertical: 14, fontSize: 16, color: theme.textMain },
    primaryButton: {
      backgroundColor: theme.primaryAction, borderRadius: 12,
      paddingVertical: 16, alignItems: 'center',
      shadowColor: theme.primaryAction, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
      marginBottom: 16,
    },
    primaryButtonText: { color: theme.textOnPrimary || '#ffffff', fontSize: 16, fontWeight: 'bold' },
    backToLoginBtn: {
      flexDirection: 'row', justifyContent: 'center',
      alignItems: 'center', paddingVertical: 12,
    },
    backToLoginText: { color: theme.primaryAccent, fontSize: 14, fontWeight: '600' },
    tipsCard: {
      backgroundColor: theme.primaryAccent + '15', padding: 16, borderRadius: 12,
      borderWidth: 1, borderColor: theme.primaryAccent + '40', marginBottom: 20,
    },
    tipsTitle: { fontSize: 14, fontWeight: '700', color: theme.primaryAccent, marginBottom: 8 },
    tipItem: { fontSize: 13, color: theme.textSub, lineHeight: 22 },
  }), [theme]);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your college email address.');
      return;
    }

    try {
      setLoading(true);
      await API.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setEmailSent(true);
    } catch (error) {
      const message = error.response?.data?.message || 'Could not send reset email. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={memoStyles.safeArea}>
        <View style={memoStyles.container}>
          <TouchableOpacity style={memoStyles.backBtn} onPress={() => navigation.navigate('Login')}>
            <Ionicons name="arrow-back" size={22} color={theme.textMain} />
          </TouchableOpacity>

          <View style={memoStyles.successIconCircle}>
            <Text style={{ fontSize: 48 }}>📬</Text>
          </View>
          <Text style={memoStyles.title}>Email Sent!</Text>
          <Text style={memoStyles.subtitle}>
            We've sent a password reset link to{'\n'}
            <Text style={memoStyles.emailText}>{email}</Text>
            {'\n\n'}Check your inbox and follow the link to reset your password.
          </Text>

          <View style={memoStyles.tipsCard}>
            <Text style={memoStyles.tipsTitle}>Didn't receive it?</Text>
            <Text style={memoStyles.tipItem}>• Check your spam/junk folder</Text>
            <Text style={memoStyles.tipItem}>• Make sure you used your college email</Text>
            <Text style={memoStyles.tipItem}>• Wait a minute and try again</Text>
          </View>

          <TouchableOpacity
            style={memoStyles.primaryButton}
            onPress={() => { setEmailSent(false); setEmail(''); }}
          >
            <Text style={memoStyles.primaryButtonText}>Try Another Email</Text>
          </TouchableOpacity>

          <TouchableOpacity style={memoStyles.backToLoginBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={memoStyles.backToLoginText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={memoStyles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={memoStyles.container}>

          <TouchableOpacity style={memoStyles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={theme.textMain} />
          </TouchableOpacity>

          <View style={memoStyles.iconCircle}>
            <Text style={{ fontSize: 36 }}>🔑</Text>
          </View>

          <Text style={memoStyles.title}>Forgot Password?</Text>
          <Text style={memoStyles.subtitle}>
            No worries! Enter your college email and we'll send you a reset link.
          </Text>

          <View style={memoStyles.inputGroup}>
            <Text style={memoStyles.label}>College Email</Text>
            <View style={memoStyles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={theme.textTertiary} style={{ marginRight: 10 }} />
              <TextInput
                style={memoStyles.input}
                placeholder="your@college.ac.in"
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[memoStyles.primaryButton, loading && { opacity: 0.7 }]}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={memoStyles.primaryButtonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={memoStyles.backToLoginBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={16} color={theme.primaryAccent} style={{ marginRight: 4 }} />
            <Text style={memoStyles.backToLoginText}>Back to Sign In</Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


export default ForgotPasswordScreen;
