import React, { useState, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Image, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, FlatList 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext'; // 🚀 IMPORT CONTEXT

const CATEGORIES = [
  { id: '1', name: 'Cycles', icon: 'bicycle' },
  { id: '2', name: 'Books & Notes', icon: 'book' },
  { id: '3', name: 'Electronics', icon: 'laptop' },
  { id: '4', name: 'Hostel Essentials', icon: 'bed' },
  { id: '5', name: 'Other', icon: 'cube' }
];

const PostScreen = ({ navigation }) => {
  const { isGuest, logout } = useContext(AuthContext); // 🚀 PULL GUEST STATE

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [customCategory, setCustomCategory] = useState(''); 
  const [modalVisible, setModalVisible] = useState(false);
  
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to allow access to your photos to post an item.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, 
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePostItem = async () => {
    if (!title || !price || !description || !selectedCategory || !contact) {
      Alert.alert("Missing Info", "Please fill out all required fields.");
      return;
    }

    if (selectedCategory.name === 'Other' && !customCategory.trim()) {
      Alert.alert("Missing Category", "Please specify the custom category name.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('title', title);
      formData.append('price', price);
      formData.append('description', description);
      formData.append('contactNumber', contact);

      const finalCategory = selectedCategory.name === 'Other' ? customCategory.trim() : selectedCategory.name;
      formData.append('category', finalCategory);

      if (imageUri) {
        let filename = imageUri.split('/').pop();
        let match = /\.(\w+)$/.exec(filename);
        let type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('images', {
          uri: imageUri,
          name: filename,
          type: type
        });
      }

      const response = await API.post('/items', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert("Success!", "Your item is now live on campus!");
      
      setTitle(''); setPrice(''); setDescription(''); setContact('');
      setSelectedCategory(null); setCustomCategory(''); setImageUri(null);
      navigation.navigate('Home'); 

    } catch (error) {
      const errorMessage = error.response?.data?.message || "Could not post the item. Check your connection.";
      Alert.alert("Upload Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.categoryItem}
      onPress={() => {
        setSelectedCategory(item);
        setModalVisible(false);
      }}
    >
      <Ionicons name={item.icon} size={20} color="#4f46e5" style={{ marginRight: 10 }} />
      <Text style={styles.categoryItemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  // 🚀 BLOCK GUESTS FROM SEEING THE FORM
  if (isGuest) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f9fafb' }}>
        <Ionicons name="lock-closed-outline" size={60} color="#9ca3af" />
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 15, color: '#1f2937' }}>Login Required</Text>
        <Text style={{ textAlign: 'center', color: '#6b7280', marginTop: 10, marginBottom: 20 }}>
          You must have an account to post an item for sale.
        </Text>
        <TouchableOpacity 
          style={{ backgroundColor: '#4f46e5', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' }} 
          onPress={logout}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Log In / Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        
        <Text style={styles.header}>Sell an Item</Text>

        <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholderBox}>
              <Ionicons name="camera" size={40} color="#9ca3af" />
              <Text style={styles.placeholderText}>Tap to upload a photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Item Title</Text>
          <TextInput style={styles.input} placeholder="e.g. Hero Sprint Cycle" value={title} onChangeText={setTitle} />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Price (₹)</Text>
            <TextInput style={styles.input} placeholder="e.g. 2500" keyboardType="numeric" value={price} onChangeText={setPrice} />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setModalVisible(true)}>
              <Text style={{ color: selectedCategory ? '#1f2937' : '#9ca3af', fontSize: 16 }}>
                {selectedCategory ? selectedCategory.name : "Select..."}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {selectedCategory?.name === 'Other' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Specify Category</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Drafting Instruments" 
              value={customCategory} 
              onChangeText={setCustomCategory} 
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>WhatsApp / Phone Number</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. 9876543210" 
            keyboardType="phone-pad"
            value={contact} 
            onChangeText={setContact} 
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Describe the condition, age, etc." 
            multiline 
            numberOfLines={4} 
            value={description} 
            onChangeText={setDescription} 
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handlePostItem} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Post Item Now</Text>}
        </TouchableOpacity>

      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item.id}
              renderItem={renderCategoryItem}
            />
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', padding: 20 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#1f2937', marginBottom: 20, marginTop: 10 },
  imageContainer: { width: '100%', height: 200, backgroundColor: '#f3f4f6', borderRadius: 12, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  previewImage: { width: '100%', height: '100%' },
  placeholderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { marginTop: 10, color: '#6b7280', fontWeight: '500' },
  inputGroup: { marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, fontSize: 16, color: '#1f2937' },
  dropdownButton: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, justifyContent: 'center' },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#4f46e5', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '50%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  categoryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  categoryItemText: { fontSize: 16, color: '#1f2937', fontWeight: '500' },
  closeModalBtn: { marginTop: 20, padding: 15, backgroundColor: '#f3f4f6', borderRadius: 10, alignItems: 'center' },
  closeModalText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 }
});

export default PostScreen;