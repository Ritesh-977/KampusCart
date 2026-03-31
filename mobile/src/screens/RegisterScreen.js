import React, { useState, useMemo, useEffect, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  Modal, FlatList, SafeAreaView, StatusBar, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { colleges } from '../utils/colleges';
import API from '../api/axios';

WebBrowser.maybeCompleteAuthSession();

const RegisterScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId;
  const GOOGLE_ANDROID_CLIENT_ID = Constants.expoConfig?.extra?.googleAndroidClientId;
  const [, googleResponse, googlePrompt] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      handleGoogleAuth(googleResponse.authentication?.accessToken);
    } else if (googleResponse?.type === 'error') {
      Alert.alert('Google Error', googleResponse.error?.message || 'Google sign-in failed.');
    }
  }, [googleResponse]);

  const handleGoogleAuth = async (accessToken) => {
    if (!accessToken) return;
    setGoogleLoading(true);
    try {
      // Try login first (user may already exist)
      const res = await API.post('/auth/google-login', { access_token: accessToken });
      await login(res.data.token, res.data.user);
    } catch (err) {
      if (err.response?.status === 404) {
        try {
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const profile = await profileRes.json();
          const emailDomain = profile.email?.split('@')[1];
          if (!emailDomain) throw new Error('Could not determine email domain');
          const signupRes = await API.post('/auth/google-signup', { access_token: accessToken, emailDomain });
          await login(signupRes.data.token, signupRes.data.user);
        } catch (signupErr) {
          Alert.alert('Sign Up Failed', signupErr.response?.data?.message || 'Could not create account.');
        }
      } else {
        Alert.alert('Sign In Failed', err.response?.data?.message || 'Google sign-in failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const filteredColleges = colleges.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.shortName && c.shortName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const memoStyles = useMemo(() => ({
    safeArea: { flex: 1, backgroundColor: theme.background },
    formContainer: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
    backBtn: { marginBottom: 20, width: 40, height: 40, justifyContent: 'center' },
    title: { fontSize: 30, fontWeight: '800', color: theme.textMain, marginBottom: 6 },
    subtitle: { fontSize: 15, color: theme.textTertiary, marginBottom: 28 },
    inputGroup: { marginBottom: 18 },
    label: { fontSize: 14, fontWeight: '600', color: theme.textSub, marginBottom: 8 },
    inputWrapper: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder,
      borderRadius: 12, paddingHorizontal: 14,
    },
    inputIcon: { marginRight: 10, color: theme.textTertiary },
    input: { flex: 1, paddingVertical: 14, fontSize: 16, color: theme.textMain },
    eyeIcon: { padding: 4 },
    dropdownButton: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder,
      borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    },
    loginButton: {
      backgroundColor: theme.primaryAction, borderRadius: 12,
      paddingVertical: 16, alignItems: 'center', marginTop: 8,
      shadowColor: theme.primaryAction, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
    },
    loginButtonText: { color: theme.textOnPrimary || '#ffffff', fontSize: 16, fontWeight: 'bold' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
    footerText: { color: theme.textTertiary, fontSize: 14 },
    linkText: { color: theme.primaryAccent, fontSize: 14, fontWeight: 'bold' },
    waitlistCard: {
      backgroundColor: theme.primaryAccent + '25', padding: 24, borderRadius: 16,
      borderWidth: 1, borderColor: theme.primaryAccent + '40', alignItems: 'center', marginBottom: 10,
    },
    waitlistEmoji: { fontSize: 36, marginBottom: 10 },
    waitlistTitle: { fontSize: 20, fontWeight: 'bold', color: theme.primaryAccent, marginBottom: 8 },
    waitlistDesc: { fontSize: 14, color: theme.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: theme.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      maxHeight: '80%', paddingBottom: 20,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.inputBorder },
    modalTitle: { fontSize: 18, fontWeight: '700', color: theme.textMain },
    searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg,
      borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 12, marginHorizontal: 16, marginVertical: 12,
      paddingHorizontal: 12, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: 15, color: theme.textMain },
    collegeItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: theme.inputBorder },
    collegeEmoji: { fontSize: 24, marginRight: 12 },
    collegeItemText: { fontSize: 15, fontWeight: '600', color: theme.textMain, flex: 1 },
    collegeLocation: { fontSize: 12, color: theme.textTertiary, marginTop: 2 },
    comingSoonBadge: { backgroundColor: theme.primaryAccent + '25', borderRadius: 6,
      paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: theme.primaryAccent + '50' },
    comingSoonText: { fontSize: 11, fontWeight: '700', color: theme.primaryAccent },
  }), [theme]);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !selectedCollege) {
      Alert.alert('Error', 'Please fill in all fields and select your campus.');
      return;
    }

    if (selectedCollege.emailDomain && !email.trim().toLowerCase().endsWith(selectedCollege.emailDomain)) {
      Alert.alert('Invalid Email', `Please use your official @${selectedCollege.emailDomain} college email.`);
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      await API.post('/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        college: selectedCollege.name,
      });

      Alert.alert(
        'Check Your Email!',
        `A 6-digit verification code has been sent to ${email.trim().toLowerCase()}`,
        [{ text: 'Continue', onPress: () => navigation.navigate('OTPVerification', { email: email.trim().toLowerCase() }) }]
      );
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleWaitlist = async () => {
    if (!email.trim()) {
      Alert.alert('Waitlist', 'Please enter your email address.');
      return;
    }
    Alert.alert("You're on the list! 🎉", `We'll notify you when KampusCart launches at ${selectedCollege.name}!`);
    navigation.goBack();
  };

  const renderCollegeItem = ({ item }) => (
    <TouchableOpacity
      style={memoStyles.collegeItem}
      onPress={() => {
        setSelectedCollege(item);
        setModalVisible(false);
        setSearchQuery('');
      }}
    >
      <Text style={memoStyles.collegeEmoji}>{item.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={memoStyles.collegeItemText}>{item.name}</Text>
        {item.location && <Text style={memoStyles.collegeLocation}>{item.location}</Text>}
      </View>
      {item.emailDomain === null && (
        <View style={memoStyles.comingSoonBadge}>
          <Text style={memoStyles.comingSoonText}>Soon</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={memoStyles.safeArea}>
      <StatusBar barStyle={theme.statusBarStyle === 'light-content' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={memoStyles.formContainer} keyboardShouldPersistTaps="handled">

          {/* Back button */}
          <TouchableOpacity style={memoStyles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={theme.textMain} />
          </TouchableOpacity>

          <Text style={memoStyles.title}>Create Account</Text>
          <Text style={memoStyles.subtitle}>Join your campus marketplace today.</Text>

          {/* Campus Selector */}
          <View style={memoStyles.inputGroup}>
            <Text style={memoStyles.label}>Your Campus</Text>
            <TouchableOpacity style={memoStyles.dropdownButton} onPress={() => setModalVisible(true)}>
              <Text style={{ color: selectedCollege ? theme.textMain : theme.textBody, fontSize: 16, flex: 1 }}>
                {selectedCollege ? `${selectedCollege.emoji} ${selectedCollege.name}` : 'Select your college...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Dynamic UI based on college selection */}
          {!selectedCollege ? null : selectedCollege.emailDomain === null ? (

            /* WAITLIST UI */
            <View style={memoStyles.waitlistCard}>
              <Text style={memoStyles.waitlistEmoji}>🚀</Text>
              <Text style={memoStyles.waitlistTitle}>Coming Soon!</Text>
              <Text style={memoStyles.waitlistDesc}>
                KampusCart is expanding to {selectedCollege.name}! Enter your email to get notified at launch.
              </Text>
              <View style={memoStyles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={theme.textTertiary} style={memoStyles.inputIcon} />
                <TextInput
                  style={memoStyles.input}
                  placeholder="Your email address"
                  placeholderTextColor={theme.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity style={memoStyles.loginButton} onPress={handleWaitlist}>
                <Text style={memoStyles.loginButtonText}>Join Waitlist</Text>
              </TouchableOpacity>
            </View>

          ) : (

            /* STANDARD REGISTRATION */
            <View>
              <View style={memoStyles.inputGroup}>
                <Text style={memoStyles.label}>Full Name</Text>
                <View style={memoStyles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color={theme.textTertiary} style={memoStyles.inputIcon} />
                  <TextInput
                    style={memoStyles.input}
                    placeholder="John Doe"
                    placeholderTextColor={theme.textTertiary}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>

              <View style={memoStyles.inputGroup}>
                <Text style={memoStyles.label}>College Email</Text>
                <View style={memoStyles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color={theme.textTertiary} style={memoStyles.inputIcon} />
                  <TextInput
                    style={memoStyles.input}
                    placeholder={`name@${selectedCollege.emailDomain}`}
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              <View style={memoStyles.inputGroup}>
                <Text style={memoStyles.label}>Password</Text>
                <View style={memoStyles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.textTertiary} style={memoStyles.inputIcon} />
                  <TextInput
                    style={memoStyles.input}
                    placeholder="At least 6 characters"
                    placeholderTextColor={theme.textTertiary}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={memoStyles.eyeIcon}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={memoStyles.loginButton} onPress={handleRegister} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={theme.textMain} />
                ) : (
                  <Text style={memoStyles.loginButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 16 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.inputBorder }} />
            <Text style={{ marginHorizontal: 12, color: theme.textTertiary, fontSize: 14 }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.inputBorder }} />
          </View>

          {/* Google Sign-Up */}
          <TouchableOpacity
            style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.inputBorder, backgroundColor: theme.inputBg, marginBottom: 20, opacity: googleLoading ? 0.7 : 1 }}
            onPress={() => googlePrompt()}
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

          {/* Login link */}
          <View style={memoStyles.footer}>
            <Text style={memoStyles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={memoStyles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* College Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={memoStyles.modalOverlay}>
          <View style={memoStyles.modalContent}>
            <View style={memoStyles.modalHeader}>
              <Text style={memoStyles.modalTitle}>Select Campus</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setSearchQuery(''); }}>
                <Ionicons name="close" size={24} color={theme.textSub} />
              </TouchableOpacity>
            </View>

            <View style={memoStyles.searchWrapper}>
              <Ionicons name="search" size={18} color={theme.textTertiary} style={{ marginRight: 8 }} />
              <TextInput
                style={memoStyles.searchInput}
                placeholder="Search college..."
                placeholderTextColor={theme.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            <FlatList
              data={filteredColleges}
              keyExtractor={(item) => item.id}
              renderItem={renderCollegeItem}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};


export default RegisterScreen;
