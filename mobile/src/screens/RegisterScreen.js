import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, FlatList, SafeAreaView
} from 'react-native';
import { colleges } from '../utils/colleges';
import API from '../api/axios';
import { saveToken } from '../utils/secureStorage';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // State for our custom dropdown
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !selectedCollege) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    // Basic Domain Validation Check
    if (!email.endsWith(selectedCollege.emailDomain)) {
        Alert.alert("Invalid Email", `Please use your official @${selectedCollege.emailDomain} email.`);
        return;
    }

    try {
      setLoading(true);
      const response = await API.post('/auth/register', { 
        name, 
        email, 
        password, 
        college: selectedCollege.name 
      });

      if (response.data.token) {
        await saveToken(response.data.token);
        Alert.alert("Success!", "Account created successfully!");
        // We will navigate to Home here later
      }
    } catch (error) {
      const message = error.response?.data?.message || "Registration failed.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const handleWaitlist = () => {
      if (!email) return Alert.alert("Waitlist", "Please enter your email.");
      // Here you would hit a /waitlist endpoint
      Alert.alert("You're on the list!", `We'll let you know when we launch at ${selectedCollege.name}!`);
      navigation.goBack();
  };

  // The item renderer for our College Modal List
  const renderCollegeItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.collegeItem}
      onPress={() => {
        setSelectedCollege(item);
        setModalVisible(false);
      }}
    >
      <Text style={styles.collegeItemText}>{item.emoji} {item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.formContainer}>
        
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join your campus marketplace today.</Text>

        {/* 1. CAMPUS SELECTOR BUTTON */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select your Campus</Text>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setModalVisible(true)}>
            <Text style={{ color: selectedCollege ? '#1f2937' : '#9ca3af', fontSize: 16 }}>
              {selectedCollege ? `${selectedCollege.emoji} ${selectedCollege.name}` : "Tap to choose..."}
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- DYNAMIC UI: Show Waitlist OR Standard Form --- */}
        
        {!selectedCollege ? null : selectedCollege.emailDomain === null ? (
            
          /* 🚀 WAITLIST UI */
          <View style={styles.waitlistCard}>
              <Text style={styles.waitlistTitle}>We're expanding fast! 🚀</Text>
              <Text style={styles.waitlistDesc}>KampusCart hasn't officially launched at {selectedCollege.name} yet. Enter your email to get early access.</Text>
              <TextInput
                style={styles.input}
                placeholder="Your email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.loginButton} onPress={handleWaitlist}>
                 <Text style={styles.loginButtonText}>Join the Waitlist</Text>
              </TouchableOpacity>
          </View>

        ) : (
            
          /* 🎓 STANDARD REGISTRATION UI */
          <View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput style={styles.input} placeholder="John Doe" value={name} onChangeText={setName} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>College Email</Text>
              <TextInput style={styles.input} placeholder={`e.g. name@${selectedCollege.emailDomain}`} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput style={styles.input} placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.loginButtonText}>Sign Up</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Navigation to Login */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Sign In</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* --- MODAL FOR COLLEGE SELECTION --- */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Campus</Text>
            <FlatList
              data={colleges}
              keyExtractor={(item) => item.id}
              renderItem={renderCollegeItem}
            />
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1 },
  formContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 32, fontWeight: '800', color: '#4f46e5', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 30 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  dropdownButton: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  loginButton: { backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10, shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  footerText: { color: '#6b7280', fontSize: 14 },
  linkText: { color: '#4f46e5', fontSize: 14, fontWeight: 'bold' },
  
  // Waitlist Styles
  waitlistCard: { backgroundColor: '#eef2ff', padding: 20, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: '#c7d2fe' },
  waitlistTitle: { fontSize: 18, fontWeight: 'bold', color: '#3730a3', marginBottom: 8 },
  waitlistDesc: { fontSize: 14, color: '#4338ca', marginBottom: 15, lineHeight: 20 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  collegeItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  collegeItemText: { fontSize: 16, color: '#1f2937' },
  closeModalBtn: { marginTop: 20, padding: 15, backgroundColor: '#f3f4f6', borderRadius: 10, alignItems: 'center' },
  closeModalText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 }
});

export default RegisterScreen;