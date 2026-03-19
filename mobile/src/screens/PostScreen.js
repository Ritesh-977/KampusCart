import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

const PostScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>📷 Post an Item</Text>
      <Text style={styles.subtitle}>Form to sell items coming soon...</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 10 }
});

export default PostScreen;