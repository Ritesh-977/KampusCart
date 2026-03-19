import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')}>
            <Ionicons name="arrow-back" size={22} color="#f1f5f9" />
          </TouchableOpacity>

          <View style={styles.successIconCircle}>
            <Text style={{ fontSize: 48 }}>📬</Text>
          </View>
          <Text style={styles.title}>Email Sent!</Text>
          <Text style={styles.subtitle}>
            We've sent a password reset link to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
            {'\n\n'}Check your inbox and follow the link to reset your password.
          </Text>

          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Didn't receive it?</Text>
            <Text style={styles.tipItem}>• Check your spam/junk folder</Text>
            <Text style={styles.tipItem}>• Make sure you used your college email</Text>
            <Text style={styles.tipItem}>• Wait a minute and try again</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => { setEmailSent(false); setEmail(''); }}
          >
            <Text style={styles.primaryButtonText}>Try Another Email</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backToLoginBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.backToLoginText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#f1f5f9" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 36 }}>🔑</Text>
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            No worries! Enter your college email and we'll send you a reset link.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>College Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#9ca3af" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="your@college.ac.in"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && { opacity: 0.7 }]}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backToLoginBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={16} color="#4f46e5" style={{ marginRight: 4 }} />
            <Text style={styles.backToLoginText}>Back to Sign In</Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f172a' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 30 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(79,70,229,0.2)', justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 20,
  },
  successIconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(22,163,74,0.15)', justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 24,
  },
  title: {
    fontSize: 28, fontWeight: '800', color: '#f1f5f9',
    textAlign: 'center', marginBottom: 10,
  },
  subtitle: {
    fontSize: 15, color: '#94a3b8', textAlign: 'center',
    lineHeight: 23, marginBottom: 32,
  },
  emailText: { fontWeight: '700', color: '#818cf8' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155',
    borderRadius: 12, paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#f1f5f9' },
  primaryButton: {
    backgroundColor: '#4f46e5', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
    marginBottom: 16,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  backToLoginBtn: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', paddingVertical: 12,
  },
  backToLoginText: { color: '#818cf8', fontSize: 14, fontWeight: '600' },
  tipsCard: {
    backgroundColor: 'rgba(245,158,11,0.1)', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)', marginBottom: 20,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: '#fbbf24', marginBottom: 8 },
  tipItem: { fontSize: 13, color: '#94a3b8', lineHeight: 22 },
});

export default ForgotPasswordScreen;
