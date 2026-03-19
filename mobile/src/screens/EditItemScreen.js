import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';

const EditItemScreen = ({ route, navigation }) => {
  const { item } = route.params;

  // Pre-fill the state with the item's current data
  const [title, setTitle] = useState(item.title);
  const [price, setPrice] = useState(item.price ? item.price.toString() : '');
  const [description, setDescription] = useState(item.description);
  const [contact, setContact] = useState(item.contactNumber ? item.contactNumber.toString() : '');
  const [isSold, setIsSold] = useState(item.isSold);
  
  const [loading, setLoading] = useState(false);

  // 🚀 1. UPDATE ITEM LOGIC
  const handleUpdate = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('title', title);
      formData.append('price', price);
      formData.append('description', description);
      formData.append('contactNumber', contact);
      formData.append('category', item.category); 

      // Send back the existing images so the backend doesn't delete them
      if (item.images) {
        formData.append('existingImages', JSON.stringify(item.images));
      }

      await API.put(`/items/${item._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert("Success", "Listing updated successfully!");
      navigation.goBack(); // Return to Profile
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Error", "Could not update the item.");
    } finally {
      setLoading(false);
    }
  };

  // 🚀 2. TOGGLE SOLD LOGIC
  const handleToggleSold = async () => {
    try {
      setLoading(true);
      const response = await API.patch(`/items/${item._id}/status`);
      setIsSold(response.data.isSold);
    } catch (error) {
      Alert.alert("Error", "Could not update status.");
    } finally {
      setLoading(false);
    }
  };

  // 🚀 3. DELETE LOGIC
  const handleDelete = () => {
    Alert.alert("Delete Listing", "Are you sure you want to permanently delete this?", [
      { text: "Cancel", style: 'cancel' },
      { 
        text: "Delete", 
        style: 'destructive', 
        onPress: async () => {
          try {
            setLoading(true);
            await API.delete(`/items/${item._id}`);
            navigation.goBack(); // Return to Profile
          } catch (error) {
            Alert.alert("Error", "Could not delete item.");
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
      <ScrollView style={styles.container}>
        
        {/* Top Status Bar */}
        <View style={styles.statusBanner}>
          <Text style={styles.statusText}>
            Status: {isSold ? "🔴 Sold Out" : "🟢 Available"}
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Price (₹)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contact Number</Text>
          <TextInput style={styles.input} keyboardType="phone-pad" value={contact} onChangeText={setContact} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            multiline 
            numberOfLines={4} 
            value={description} 
            onChangeText={setDescription} 
          />
        </View>

        {/* Update Button */}
        <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateBtnText}>Save Changes</Text>}
        </TouchableOpacity>

        {/* Quick Actions Container */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, isSold ? styles.availableBtn : styles.soldBtn]} 
            onPress={handleToggleSold}
            disabled={loading}
          >
            <Ionicons name={isSold ? "refresh-outline" : "checkmark-circle-outline"} size={20} color="#fff" />
            <Text style={styles.actionBtnText}>{isSold ? "Mark Available" : "Mark Sold"}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, styles.deleteBtn]} 
            onPress={handleDelete}
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 20 },
  statusBanner: { backgroundColor: '#e5e7eb', padding: 12, borderRadius: 8, marginBottom: 20, alignItems: 'center' },
  statusText: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  updateBtn: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  updateBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flex: 1, flexDirection: 'row', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginHorizontal: 5 },
  soldBtn: { backgroundColor: '#4f46e5' },
  availableBtn: { backgroundColor: '#10b981' }, // Green
  deleteBtn: { backgroundColor: '#ef4444' }, // Red
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }
});

export default EditItemScreen;