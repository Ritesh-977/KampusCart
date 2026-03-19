import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { AuthContext } from '../context/AuthContext';

const HomeScreen = () => {
  // Grab the logout function from our global brain
  const { logout } = useContext(AuthContext);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🛒 KampusCart</Text>
      <Text style={styles.subtitle}>Welcome to the Main App!</Text>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#4f46e5', marginBottom: 10 },
  subtitle: { fontSize: 18, color: '#6b7280', marginBottom: 40 },
  logoutBtn: { backgroundColor: '#ef4444', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 10 },
  logoutText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default HomeScreen;