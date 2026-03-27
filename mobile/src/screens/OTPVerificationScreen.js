import React, { useState, useRef, useContext, useMemo } from 'react';
import Toast from 'react-native-toast-message';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const OTPVerificationScreen = ({ route, navigation }) => {
  const { email } = route.params;
  const { login } = useContext(AuthContext);
  const { theme } = useTheme();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef([]);

  const memoStyles = useMemo(() => ({
    safeArea: { flex: 1, backgroundColor: theme.background },
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
    backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 30 },
    iconCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: theme.primaryAccent + '20', justifyContent: 'center', alignItems: 'center',
      marginBottom: 20, alignSelf: 'center',
    },
    iconEmoji: { fontSize: 36 },
    title: {
      fontSize: 28, fontWeight: '800', color: theme.textMain,
      textAlign: 'center', marginBottom: 10,
    },
    subtitle: {
      fontSize: 15, color: theme.textBody, textAlign: 'center',
      lineHeight: 22, marginBottom: 36,
    },
    emailText: { fontWeight: '700', color: theme.primaryAction },
    otpContainer: {
      flexDirection: 'row', justifyContent: 'space-between',
      marginBottom: 32,
    },
    otpInput: {
      width: 48, height: 58, borderRadius: 12,
      borderWidth: 2, borderColor: theme.inputBorder,
      backgroundColor: theme.card, textAlign: 'center',
      fontSize: 22, fontWeight: '700', color: theme.textMain,
    },
    otpInputFilled: {
      borderColor: theme.primaryAction, backgroundColor: theme.primaryAccent + '20',
    },
    verifyButton: {
      backgroundColor: theme.primaryAction, borderRadius: 12,
      paddingVertical: 16, alignItems: 'center',
      shadowColor: theme.primaryAction, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    verifyButtonText: {color: theme.textOnPrimary || '#ffffff', fontSize: 16, fontWeight: 'bold' },
    resendContainer: {
      flexDirection: 'row', justifyContent: 'center',
      alignItems: 'center', marginTop: 24,
    },
    resendText: { fontSize: 14, color: theme.textBody },
    resendLink: { fontSize: 14, color: theme.primaryAction, fontWeight: '700' },
    resendCooldown: { fontSize: 14, color: theme.textTertiary },
  }), [theme]);

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
      Toast.show({ type: 'error', text1: 'Incomplete', text2: 'Please enter the full 6-digit code.' });
      return;
    }

    let token = null;
    let user = null;

    try {
      setLoading(true);
      const response = await API.post('/auth/verify-otp', { email, otp: code });
      token = response.data.token;
      user = response.data.user;
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid or expired OTP.';
      Toast.show({ type: 'error', text1: 'Verification Failed', text2: message });
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }

    if (token) {
      await login(token, user);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      setResendLoading(true);
      await API.post('/auth/resend-otp', { email });
        Toast.show({ type: 'success', text1: 'OTP Sent', text2: `A new code was sent to ${email}` });

      // 30-second cooldown
      let countdown = 30;
      setResendCooldown(countdown);
      const interval = setInterval(() => {
        countdown -= 1;
        setResendCooldown(countdown);
        if (countdown === 0) clearInterval(interval);
      }, 1000);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not resend OTP. Please try again.' });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={memoStyles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={memoStyles.container}>

          {/* Back */}
          <TouchableOpacity style={memoStyles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={theme.textBody} />
          </TouchableOpacity>

          {/* Header */}
          <View style={memoStyles.iconCircle}>
            <Text style={memoStyles.iconEmoji}>📧</Text>
          </View>
          <Text style={memoStyles.title}>Verify Your Email</Text>
          <Text style={memoStyles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={memoStyles.emailText}>{email}</Text>
          </Text>

          {/* OTP Inputs */}
          <View style={memoStyles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[memoStyles.otpInput, digit ? memoStyles.otpInputFilled : null]}
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
            style={[memoStyles.verifyButton, loading && { opacity: 0.7 }]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={memoStyles.verifyButtonText}>Verify & Continue</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={memoStyles.resendContainer}>
            <Text style={memoStyles.resendText}>Didn't receive the code? </Text>
            {resendCooldown > 0 ? (
              <Text style={memoStyles.resendCooldown}>Resend in {resendCooldown}s</Text>
            ) : resendLoading ? (
              <ActivityIndicator size="small" color={theme.primaryAction} />
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={memoStyles.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


export default OTPVerificationScreen;
