import React, { useState, useContext, useEffect } from 'react';
import Toast from 'react-native-toast-message';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, SafeAreaView, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const GRAD_CHARS = 'KampusCart'.split('');
const GRAD_START = [139, 92, 246];  // #8b5cf6 purple
const GRAD_END   = [59,  130, 246]; // #3b82f6 blue
const GradientBrand = ({ fontSize = 32, fontWeight = '800', letterSpacing = -1 }) => (
  <Text>
    {GRAD_CHARS.map((char, i) => {
      const t = i / (GRAD_CHARS.length - 1);
      const r = Math.round(GRAD_START[0] + t * (GRAD_END[0] - GRAD_START[0]));
      const g = Math.round(GRAD_START[1] + t * (GRAD_END[1] - GRAD_START[1]));
      const b = Math.round(GRAD_START[2] + t * (GRAD_END[2] - GRAD_START[2]));
      return <Text key={i} style={{ fontSize, fontWeight, letterSpacing, color: `rgb(${r},${g},${b})` }}>{char}</Text>;
    })}
  </Text>
);

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { theme } = useTheme();

  const { login, skipLogin } = useContext(AuthContext);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: Constants.expoConfig?.extra?.googleWebClientId,
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const { accessToken } = await GoogleSignin.getTokens();

      try {
        const res = await API.post('/auth/google-login', { access_token: accessToken });
        await login(res.data.token, res.data.user);
      } catch (err) {
        if (err.response?.status === 404) {
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const profile = await profileRes.json();
          const emailDomain = profile.email?.split('@')[1];
          if (!emailDomain) throw new Error('Could not determine email domain');
          const signupRes = await API.post('/auth/google-signup', { access_token: accessToken, emailDomain });
          await login(signupRes.data.token, signupRes.data.user);
          Toast.show({ type: 'success', text1: 'Welcome!', text2: 'Account created with Google.' });
        } else {
          Toast.show({ type: 'error', text1: 'Sign In Failed', text2: err.response?.data?.message || 'Google sign-in failed.' });
        }
      }
    } catch (err) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled, do nothing
      } else if (err.code === statusCodes.IN_PROGRESS) {
        Toast.show({ type: 'error', text1: 'Google Error', text2: 'Sign-in already in progress.' });
      } else {
        Toast.show({ type: 'error', text1: 'Google Error', text2: err.message || 'Google sign-in failed.' });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please fill in all fields.' });
      return;
    }

    try {
      setLoading(true);
      const response = await API.post('/auth/login', { email: email.trim().toLowerCase(), password });

      if (response.data.token) {
        await login(response.data.token, response.data.user);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      Toast.show({ type: 'error', text1: 'Login Failed', text2: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <View style={{ marginBottom: 36, alignItems: 'center' }}>
            <Image
              source={require('../../assets/images/splash-icon.png')}
              style={{ width: 80, height: 80, resizeMode: 'contain', marginBottom: 10 }}
            />
            <GradientBrand />
            <Text style={{ fontSize: 15, color: theme.textTertiary, marginTop: 6 }}>Your Campus, Your Marketplace</Text>
          </View>

          {/* Email */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textSub, marginBottom: 8 }}>College Email</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 12, paddingHorizontal: 14 }}>
              <Ionicons name="mail-outline" size={20} color={theme.textTertiary} style={{ marginRight: 10 }} />
              <TextInput
                style={{ flex: 1, paddingVertical: 14, fontSize: 16, color: theme.textMain }}
                placeholder="yourname@collegedomain"
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Password */}
          <View style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textSub }}>Password</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={{ fontSize: 13, color: theme.primaryAccent, fontWeight: '600' }}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 12, paddingHorizontal: 14 }}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.textTertiary} style={{ marginRight: 10 }} />
              <TextInput
                style={{ flex: 1, paddingVertical: 14, fontSize: 16, color: theme.textMain }}
                placeholder="Enter your password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={{ backgroundColor: theme.primaryAction, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4, shadowColor: theme.primaryAction, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4, opacity: loading ? 0.7 : 1 }}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={{ color: theme.textOnPrimary || '#ffffff',  fontSize: 16, fontWeight: 'bold', letterSpacing: 0.3 }}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.inputBorder }} />
            <Text style={{ marginHorizontal: 12, color: theme.textTertiary, fontSize: 14 }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.inputBorder }} />
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity
            style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.inputBorder, backgroundColor: theme.inputBg, marginBottom: 12, opacity: googleLoading ? 0.7 : 1 }}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#EA4335" size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 10 }} />
                <Text style={{ color: theme.textSub, fontSize: 15, fontWeight: '600' }}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Guest Mode */}
          <TouchableOpacity style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }}>
            <Ionicons name="eye-outline" size={18} color={theme.textSub} style={{ marginRight: 8 }} />
            <Text style={{ color: theme.textSub, fontSize: 15, fontWeight: '600' }} onPress={skipLogin}>Browse as Guest</Text>
          </TouchableOpacity>

          {/* Register Link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ color: theme.textTertiary, fontSize: 14 }}>New to KampusCart? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={{ color: theme.primaryAccent, fontSize: 14, fontWeight: 'bold' }}>Create Account</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;