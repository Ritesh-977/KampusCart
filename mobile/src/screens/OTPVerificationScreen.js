import React, { useState, useRef, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const OTPVerificationScreen = ({ route, navigation }) => {
  const { email } = route.params;
  const { login } = useContext(AuthContext);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef([]);

  const handleOtpChange = (value, index) => {
    if (!/^\d*$/.test(value)) return; // Only digits

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance to next box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      Alert.alert('Incomplete', 'Please enter the full 6-digit code.');
      return;
    }

    try {
      setLoading(true);
      const response = await API.post('/auth/verify-otp', { email, otp: code });

      if (response.data.token) {
        await login(response.data.token, response.data.user);
      } else {
        Alert.alert('Verified!', 'Email verified. Please log in.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid or expired OTP.';
      Alert.alert('Verification Failed', message);
      // Clear OTP on failure
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      setResendLoading(true);
      await API.post('/auth/resend-otp', { email });
      Alert.alert('OTP Sent', `A new code was sent to ${email}`);

      // 60-second cooldown
      let countdown = 60;
      setResendCooldown(countdown);
      const interval = setInterval(() => {
        countdown -= 1;
        setResendCooldown(countdown);
        if (countdown === 0) clearInterval(interval);
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Could not resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>

          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>📧</Text>
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          {/* OTP Inputs */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                value={digit}
                onChangeText={(val) => handleOtpChange(val.slice(-1), index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.verifyButton, loading && { opacity: 0.7 }]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify & Continue</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            {resendCooldown > 0 ? (
              <Text style={styles.resendCooldown}>Resend in {resendCooldown}s</Text>
            ) : resendLoading ? (
              <ActivityIndicator size="small" color="#4f46e5" />
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 30 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, alignSelf: 'center',
  },
  iconEmoji: { fontSize: 36 },
  title: {
    fontSize: 28, fontWeight: '800', color: '#1f2937',
    textAlign: 'center', marginBottom: 10,
  },
  subtitle: {
    fontSize: 15, color: '#6b7280', textAlign: 'center',
    lineHeight: 22, marginBottom: 36,
  },
  emailText: { fontWeight: '700', color: '#4f46e5' },
  otpContainer: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpInput: {
    width: 48, height: 58, borderRadius: 12,
    borderWidth: 2, borderColor: '#d1d5db',
    backgroundColor: '#ffffff', textAlign: 'center',
    fontSize: 22, fontWeight: '700', color: '#1f2937',
  },
  otpInputFilled: {
    borderColor: '#4f46e5', backgroundColor: '#eef2ff',
  },
  verifyButton: {
    backgroundColor: '#4f46e5', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  verifyButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  resendContainer: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: 24,
  },
  resendText: { fontSize: 14, color: '#6b7280' },
  resendLink: { fontSize: 14, color: '#4f46e5', fontWeight: '700' },
  resendCooldown: { fontSize: 14, color: '#9ca3af' },
});

export default OTPVerificationScreen;
