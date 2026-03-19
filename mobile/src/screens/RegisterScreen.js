import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  Modal, FlatList, SafeAreaView, StatusBar, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colleges } from '../utils/colleges';
import API from '../api/axios';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredColleges = colleges.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.shortName && c.shortName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
      style={styles.collegeItem}
      onPress={() => {
        setSelectedCollege(item);
        setModalVisible(false);
        setSearchQuery('');
      }}
    >
      <Text style={styles.collegeEmoji}>{item.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.collegeItemText}>{item.name}</Text>
        {item.location && <Text style={styles.collegeLocation}>{item.location}</Text>}
      </View>
      {item.emailDomain === null && (
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Soon</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">

          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join your campus marketplace today.</Text>

          {/* Campus Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Campus</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setModalVisible(true)}>
              <Text style={{ color: selectedCollege ? '#1f2937' : '#9ca3af', fontSize: 16, flex: 1 }}>
                {selectedCollege ? `${selectedCollege.emoji} ${selectedCollege.name}` : 'Select your college...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Dynamic UI based on college selection */}
          {!selectedCollege ? null : selectedCollege.emailDomain === null ? (

            /* WAITLIST UI */
            <View style={styles.waitlistCard}>
              <Text style={styles.waitlistEmoji}>🚀</Text>
              <Text style={styles.waitlistTitle}>Coming Soon!</Text>
              <Text style={styles.waitlistDesc}>
                KampusCart is expanding to {selectedCollege.name}! Enter your email to get notified at launch.
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Your email address"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity style={styles.loginButton} onPress={handleWaitlist}>
                <Text style={styles.loginButtonText}>Join Waitlist</Text>
              </TouchableOpacity>
            </View>

          ) : (

            /* STANDARD REGISTRATION */
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    placeholderTextColor="#9ca3af"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>College Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={`name@${selectedCollege.emailDomain}`}
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.loginButton} onPress={handleRegister} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.loginButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Login link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* College Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Campus</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setSearchQuery(''); }}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search college..."
                placeholderTextColor="#9ca3af"
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  formContainer: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 20, width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: '#1f2937', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6b7280', marginBottom: 28 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 12, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1f2937' },
  eyeIcon: { padding: 4 },
  dropdownButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
  },
  loginButton: {
    backgroundColor: '#4f46e5', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { color: '#6b7280', fontSize: 14 },
  linkText: { color: '#4f46e5', fontSize: 14, fontWeight: 'bold' },

  // Waitlist
  waitlistCard: {
    backgroundColor: '#eef2ff', padding: 24, borderRadius: 16,
    borderWidth: 1, borderColor: '#c7d2fe', alignItems: 'center', marginBottom: 10,
  },
  waitlistEmoji: { fontSize: 36, marginBottom: 10 },
  waitlistTitle: { fontSize: 20, fontWeight: 'bold', color: '#3730a3', marginBottom: 8 },
  waitlistDesc: { fontSize: 14, color: '#4338ca', textAlign: 'center', lineHeight: 22, marginBottom: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937' },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1f2937' },
  collegeItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  collegeEmoji: { fontSize: 22, marginRight: 12 },
  collegeItemText: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  collegeLocation: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  comingSoonBadge: {
    backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: '#fcd34d',
  },
  comingSoonText: { fontSize: 11, color: '#92400e', fontWeight: '600' },
});

export default RegisterScreen;
