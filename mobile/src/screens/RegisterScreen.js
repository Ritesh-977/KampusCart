import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

const RegisterScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join your campus marketplace today.</Text>
      
      {/* We will add the actual form and College Dropdown here next! */}
      
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back to Login</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#4f46e5', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 40 },
  backButton: { padding: 15, backgroundColor: '#e5e7eb', borderRadius: 10 },
  backButtonText: { color: '#374151', fontWeight: 'bold' }
});

export default RegisterScreen;