import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Modal, FlatList, SafeAreaView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const CATEGORIES = [
  { id: '1', name: 'Cycles', icon: 'bicycle' },
  { id: '2', name: 'Books & Notes', icon: 'book' },
  { id: '3', name: 'Electronics', icon: 'laptop' },
  { id: '4', name: 'Hostel Essentials', icon: 'bed' },
  { id: '5', name: 'Other', icon: 'cube' },
];
const MAX_IMAGES = 3;

const PostScreen = ({ navigation }) => {
  const { isGuest, logout } = useContext(AuthContext);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [customCategory, setCustomCategory] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [images, setImages] = useState([]); // array of URIs
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `You can add up to ${MAX_IMAGES} photos.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Allow access to your photos to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.75,
    });

    if (!result.canceled) {
      setImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handlePostItem = async () => {
    if (!title.trim() || !price || !description.trim() || !selectedCategory || !contact) {
      Alert.alert('Missing Info', 'Please fill out all required fields.');
      return;
    }

    if (selectedCategory.name === 'Other' && !customCategory.trim()) {
      Alert.alert('Missing Category', 'Please specify what category your item falls under.');
      return;
    }

    if (isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('price', price);
      formData.append('description', description.trim());
      formData.append('contactNumber', contact);

      const finalCategory = selectedCategory.name === 'Other' ? customCategory.trim() : selectedCategory.name;
      formData.append('category', finalCategory);

      images.forEach((uri) => {
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('images', { uri, name: filename, type });
      });

      await API.post('/items', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Listed! 🎉', 'Your item is now live on campus marketplace.', [
        {
          text: 'View Listing',
          onPress: () => {
            setTitle(''); setPrice(''); setDescription(''); setContact('');
            setSelectedCategory(null); setCustomCategory(''); setImages([]);
            navigation.navigate('Home');
          }
        }
      ]);
    } catch (error) {
      const msg = error.response?.data?.message || 'Upload failed. Check your connection.';
      Alert.alert('Upload Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  // Guest block
  if (isGuest) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.guestIconCircle}>
          <Ionicons name="lock-closed" size={40} color="#4f46e5" />
        </View>
        <Text style={styles.guestTitle}>Sign In to Sell</Text>
        <Text style={styles.guestSubtitle}>
          Create an account to list your items and reach hundreds of buyers on your campus.
        </Text>
        <TouchableOpacity style={styles.guestBtn} onPress={logout}>
          <Text style={styles.guestBtnText}>Sign In / Register</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 50 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Create Listing</Text>
            <Text style={styles.pageSubtitle}>Fill in the details to list your item.</Text>
          </View>

          {/* ---- PHOTO UPLOAD SECTION ---- */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <Text style={styles.sectionHint}>{images.length}/{MAX_IMAGES} added</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {/* Existing images */}
              {images.map((uri, index) => (
                <View key={index} style={styles.imageThumbnailWrapper}>
                  <Image source={{ uri }} style={styles.imageThumbnail} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={22} color="#ef4444" />
                  </TouchableOpacity>
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  )}
                </View>
              ))}

              {/* Add photo button */}
              {images.length < MAX_IMAGES && (
                <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={28} color="#9ca3af" />
                  <Text style={styles.addImageText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* ---- ITEM DETAILS SECTION ---- */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Item Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Item Title <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Hero Sprint Cycle 21-speed"
                placeholderTextColor="#9ca3af"
                value={title}
                onChangeText={setTitle}
                maxLength={80}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Price (₹) <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => setModalVisible(true)}>
                  <Text style={{ color: selectedCategory ? '#1f2937' : '#9ca3af', fontSize: 15, flex: 1 }} numberOfLines={1}>
                    {selectedCategory ? selectedCategory.name : 'Select...'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>

            {selectedCategory?.name === 'Other' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Specify Category <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Drafting Instruments"
                  placeholderTextColor="#9ca3af"
                  value={customCategory}
                  onChangeText={setCustomCategory}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>WhatsApp / Phone <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit number"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                value={contact}
                onChangeText={setContact}
                maxLength={10}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the condition, age, reason for selling..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                maxLength={500}
              />
              <Text style={styles.charCount}>{description.length}/500</Text>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handlePostItem}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Post Listing</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => { setSelectedCategory(item); setModalVisible(false); }}
                >
                  <View style={styles.categoryIconBox}>
                    <Ionicons name={item.icon} size={22} color="#4f46e5" />
                  </View>
                  <Text style={styles.categoryItemText}>{item.name}</Text>
                  {selectedCategory?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  pageHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#1f2937' },
  pageSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },

  sectionCard: {
    backgroundColor: '#ffffff', marginHorizontal: 16, marginBottom: 16,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  sectionHint: { fontSize: 13, color: '#9ca3af' },

  // Image upload
  imageThumbnailWrapper: {
    width: 110, height: 110, borderRadius: 10, marginRight: 10, position: 'relative', overflow: 'visible',
  },
  imageThumbnail: { width: 110, height: 110, borderRadius: 10, backgroundColor: '#f3f4f6' },
  removeImageBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#ffffff', borderRadius: 12 },
  coverBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: 'rgba(79,70,229,0.85)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  coverBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
  addImageBtn: {
    width: 110, height: 110, borderRadius: 10,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
  },
  addImageText: { fontSize: 12, color: '#9ca3af', marginTop: 4 },

  // Inputs
  inputGroup: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  required: { color: '#ef4444' },
  input: {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#1f2937',
  },
  textArea: { height: 110, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 4 },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
  },

  submitBtn: {
    flexDirection: 'row', backgroundColor: '#4f46e5',
    marginHorizontal: 16, paddingVertical: 17,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  submitBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },

  // Guest
  guestContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24, backgroundColor: '#f9fafb',
  },
  guestIconCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  guestTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937', marginBottom: 8 },
  guestSubtitle: { textAlign: 'center', color: '#6b7280', lineHeight: 22, marginBottom: 24 },
  guestBtn: {
    backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 12,
    width: '100%', alignItems: 'center',
  },
  guestBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16, textAlign: 'center' },
  categoryItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  categoryIconBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#eef2ff',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  categoryItemText: { fontSize: 16, fontWeight: '500', color: '#1f2937', flex: 1 },
  closeModalBtn: { marginTop: 12, paddingVertical: 14, backgroundColor: '#f3f4f6', borderRadius: 10, alignItems: 'center' },
  closeModalText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});

export default PostScreen;
