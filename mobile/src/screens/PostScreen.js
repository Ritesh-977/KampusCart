import React, { useState, useContext, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Modal, FlatList, SafeAreaView, Animated,
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
  const [location, setLocation] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [sourceSheetVisible, setSourceSheetVisible] = useState(false);
  const [images, setImages] = useState([]); // array of URIs
  const [loading, setLoading] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const remaining = MAX_IMAGES - images.length;

  const openSourceSheet = () => {
    if (remaining <= 0) {
      Alert.alert('Limit Reached', `You can add up to ${MAX_IMAGES} photos.`);
      return;
    }
    setSourceSheetVisible(true);
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, tension: 70, friction: 11 }).start();
  };

  const closeSourceSheet = () => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
      setSourceSheetVisible(false)
    );
  };

  // Ask user if they want to crop (returns true/false via Alert)
  const askCrop = () =>
    new Promise((resolve) => {
      Alert.alert(
        'Crop Image?',
        'Would you like to crop or adjust this photo before adding it?',
        [
          { text: 'Skip', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Crop', onPress: () => resolve(true) },
        ]
      );
    });

  const pickFromCamera = async () => {
    closeSourceSheet();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Allow camera access to take photos.');
      return;
    }
    const wantCrop = await askCrop();
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: wantCrop,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  const pickFromGallery = async () => {
    closeSourceSheet();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Allow access to your photos to upload images.');
      return;
    }

    if (remaining === 1) {
      // Single pick — offer optional crop
      const wantCrop = await askCrop();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: wantCrop,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setImages(prev => [...prev, result.assets[0].uri]);
      }
    } else {
      // Multi-select (crop not available for multi)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const newUris = result.assets.map(a => a.uri);
        setImages(prev => [...prev, ...newUris].slice(0, MAX_IMAGES));
      }
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
      formData.append('location', location.trim());

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
            setLocation('');
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
              <View>
                <Text style={styles.sectionTitle}>Photos</Text>
                <Text style={styles.sectionHint}>
                  {images.length}/{MAX_IMAGES} added · First photo is the cover
                </Text>
              </View>
              {images.length < MAX_IMAGES && (
                <TouchableOpacity style={styles.addMoreBtn} onPress={openSourceSheet}>
                  <Ionicons name="add" size={16} color="#4f46e5" />
                  <Text style={styles.addMoreText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageThumbnailWrapper}>
                  <Image source={{ uri }} style={styles.imageThumbnail} />
                  {/* Clearly visible remove button */}
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(index)}
                    hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                  >
                    <View style={styles.removeImageBtnInner}>
                      <Ionicons name="close" size={13} color="#fff" />
                    </View>
                  </TouchableOpacity>
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  )}
                </View>
              ))}

              {images.length < MAX_IMAGES && (
                <TouchableOpacity style={styles.addImageBtn} onPress={openSourceSheet}>
                  <View style={styles.addImageIcon}>
                    <Ionicons name="camera" size={26} color="#4f46e5" />
                  </View>
                  <Text style={styles.addImageText}>Add Photo</Text>
                  <Text style={styles.addImageSub}>{remaining} left</Text>
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
              <Text style={styles.label}>Pickup Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Hostel 5, Room 203 or Library Gate"
                placeholderTextColor="#9ca3af"
                value={location}
                onChangeText={setLocation}
                maxLength={80}
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

      {/* ── Image Source Picker Sheet ── */}
      <Modal visible={sourceSheetVisible} transparent animationType="none" onRequestClose={closeSourceSheet}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={closeSourceSheet}>
          <Animated.View
            style={[
              styles.sourceSheet,
              {
                transform: [{
                  translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }),
                }],
                opacity: sheetAnim,
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add Photo</Text>
            <Text style={styles.sheetSubtitle}>
              {remaining > 1 ? `You can add up to ${remaining} more photo${remaining > 1 ? 's' : ''}` : 'You can add 1 more photo'}
            </Text>

            <TouchableOpacity style={styles.sheetOption} onPress={pickFromCamera} activeOpacity={0.7}>
              <View style={[styles.sheetOptionIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="camera" size={22} color="#2563eb" />
              </View>
              <View style={styles.sheetOptionText}>
                <Text style={styles.sheetOptionTitle}>Take Photo</Text>
                <Text style={styles.sheetOptionDesc}>Use your camera • optional crop</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetOption} onPress={pickFromGallery} activeOpacity={0.7}>
              <View style={[styles.sheetOptionIcon, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="images" size={22} color="#16a34a" />
              </View>
              <View style={styles.sheetOptionText}>
                <Text style={styles.sheetOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.sheetOptionDesc}>
                  {remaining > 1 ? `Select up to ${remaining} photos` : 'Select 1 photo • optional crop'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCancel} onPress={closeSourceSheet}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 3 },
  sectionHint: { fontSize: 12, color: '#9ca3af' },
  addMoreBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#eef2ff', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, gap: 3,
  },
  addMoreText: { fontSize: 13, color: '#4f46e5', fontWeight: '700' },

  // Image thumbnails
  imageThumbnailWrapper: {
    width: 112, height: 112, borderRadius: 12,
    position: 'relative', overflow: 'visible',
  },
  imageThumbnail: {
    width: 112, height: 112, borderRadius: 12, backgroundColor: '#f3f4f6',
  },
  removeImageBtn: {
    position: 'absolute', top: -9, right: -9, zIndex: 10,
  },
  removeImageBtnInner: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25, shadowRadius: 2, elevation: 4,
  },
  coverBadge: {
    position: 'absolute', bottom: 7, left: 7,
    backgroundColor: 'rgba(79,70,229,0.88)', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  coverBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
  addImageBtn: {
    width: 112, height: 112, borderRadius: 12,
    backgroundColor: '#f8f7ff', borderWidth: 1.5, borderColor: '#c7d2fe',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 2,
  },
  addImageIcon: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  addImageText: { fontSize: 12, color: '#4f46e5', fontWeight: '700' },
  addImageSub: { fontSize: 10, color: '#a5b4fc' },

  // Source picker sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sourceSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 40,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0',
    alignSelf: 'center', marginBottom: 18,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#1f2937', marginBottom: 3 },
  sheetSubtitle: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  sheetOptionIcon: {
    width: 46, height: 46, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  sheetOptionText: { flex: 1 },
  sheetOptionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  sheetOptionDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  sheetCancel: {
    marginTop: 16, paddingVertical: 14,
    backgroundColor: '#f3f4f6', borderRadius: 12, alignItems: 'center',
  },
  sheetCancelText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },

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
