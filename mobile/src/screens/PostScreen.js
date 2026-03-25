import React, { useState, useContext, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Image, ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Modal, FlatList, SafeAreaView, Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const CATEGORIES = [
  { id: '1', name: 'Cycles', icon: 'bicycle' },
  { id: '2', name: 'Books & Notes', icon: 'book' },
  { id: '3', name: 'Electronics', icon: 'laptop' },
  { id: '4', name: 'Hostel Essentials', icon: 'bed' },
  { id: '5', name: 'Stationary', icon: 'pencil' },
  { id: '6', name: 'Other', icon: 'cube' },
];
const MAX_IMAGES = 3;

const PostScreen = ({ navigation }) => {
  const { isGuest, logout } = useContext(AuthContext);
  const { theme } = useTheme();

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

  const memoStyles = useMemo(() => ({
    container: { flex: 1, backgroundColor: theme.background },
    pageHeader: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 12 },
    pageTitle: { fontSize: 26, fontWeight: '800', color: theme.textMain, marginTop: 10 },
    pageSubtitle: { fontSize: 14, color: theme.textSub, marginTop: 4 },
    sectionCard: {
      backgroundColor: theme.card, marginHorizontal: 16, marginBottom: 16,
      borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: theme.inputBorder,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
    },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.textMain, marginBottom: 3 },
    sectionHint: { fontSize: 12, color: theme.textTertiary },
    addMoreBtn: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.primaryAccent + '20', borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 6, gap: 3,
    },
    addMoreText: { fontSize: 13, color: theme.primaryAccent, fontWeight: '700' },
    imageThumbnailWrapper: {
      width: 112, height: 112, borderRadius: 12,
      position: 'relative', overflow: 'visible',
    },
    imageThumbnail: {
      width: 112, height: 112, borderRadius: 12, backgroundColor: theme.inputBg,
    },
    removeImageBtn: {
      position: 'absolute', top: -9, right: -9, zIndex: 10,
    },
    removeImageBtnInner: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: '#ef4444',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: theme.card,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.4, shadowRadius: 2, elevation: 4,
    },
    coverBadge: {
      position: 'absolute', bottom: 7, left: 7,
      backgroundColor: theme.primaryAccent + 'E0', borderRadius: 6,
      paddingHorizontal: 7, paddingVertical: 2,
    },
    coverBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
    addImageBtn: {
      width: 112, height: 112, borderRadius: 12,
      backgroundColor: theme.inputBg, borderWidth: 1.5, borderColor: theme.primaryAccent,
      borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 2,
    },
    addImageIcon: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: theme.primaryAccent + '20', alignItems: 'center', justifyContent: 'center',
      marginBottom: 4,
    },
    addImageText: { fontSize: 12, color: theme.primaryAccent, fontWeight: '700' },
    addImageSub: { fontSize: 10, color: theme.primaryAction },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    sourceSheet: {
      backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingTop: 12, paddingHorizontal: 20, paddingBottom: 40,
      borderWidth: 1, borderColor: theme.inputBorder,
    },
    sheetHandle: {
      width: 40, height: 4, borderRadius: 2, backgroundColor: theme.inputBorder,
      alignSelf: 'center', marginBottom: 18,
    },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: theme.textMain, marginBottom: 3 },
    sheetSubtitle: { fontSize: 13, color: theme.textSub, marginBottom: 20 },
    sheetOption: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.inputBorder,
    },
    sheetOptionIcon: {
      width: 46, height: 46, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center', marginRight: 14,
    },
    sheetOptionText: { flex: 1 },
    sheetOptionTitle: { fontSize: 15, fontWeight: '700', color: theme.textMain },
    sheetOptionDesc: { fontSize: 12, color: theme.textSub, marginTop: 2 },
    sheetCancel: {
      marginTop: 16, paddingVertical: 14,
      backgroundColor: theme.inputBg, borderRadius: 12, alignItems: 'center',
    },
    sheetCancelText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
    inputGroup: { marginBottom: 16 },
    row: { flexDirection: 'row' },
    label: { fontSize: 14, fontWeight: '600', color: theme.textSub, marginBottom: 8 },
    required: { color: '#ef4444' },
    input: {
      backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: theme.textMain,
    },
    textArea: { height: 110, textAlignVertical: 'top' },
    charCount: { fontSize: 11, color: theme.textTertiary, textAlign: 'right', marginTop: 4 },
    dropdownBtn: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    },
    submitBtn: {
      flexDirection: 'row', backgroundColor: theme.primaryAction,
      marginHorizontal: 16, paddingVertical: 17,
      borderRadius: 14, alignItems: 'center', justifyContent: 'center',
      shadowColor: theme.primaryAction, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
    },
    submitBtnText: { color: theme.textOnPrimary || '#ffffff', fontSize: 17, fontWeight: '700' },
    guestContainer: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: 24, backgroundColor: theme.background,
    },
    guestIconCircle: {
      width: 90, height: 90, borderRadius: 45,
      backgroundColor: theme.primaryAccent + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    guestTitle: { fontSize: 22, fontWeight: '800', color: theme.textMain, marginBottom: 8 },
    guestSubtitle: { textAlign: 'center', color: theme.textSub, lineHeight: 22, marginBottom: 24 },
    guestBtn: {
      backgroundColor: theme.primaryAction, paddingVertical: 14, borderRadius: 12,
      width: '100%', alignItems: 'center',
    },
    guestBtnText: { color: theme.textOnPrimary || '#ffffff', fontWeight: 'bold', fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, paddingBottom: 36, borderWidth: 1, borderColor: theme.inputBorder,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: theme.textMain, marginBottom: 16, textAlign: 'center' },
    categoryItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.inputBorder,
    },
    categoryIconBox: {
      width: 40, height: 40, borderRadius: 10, backgroundColor: theme.primaryAccent + '20',
      justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    categoryItemText: { fontSize: 16, fontWeight: '500', color: theme.textMain, flex: 1 },
    closeModalBtn: { marginTop: 12, paddingVertical: 14, backgroundColor: theme.inputBg, borderRadius: 10, alignItems: 'center' },
    closeModalText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  }), [theme]);

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
      <View style={memoStyles.guestContainer}>
        <View style={memoStyles.guestIconCircle}>
          <Ionicons name="lock-closed" size={40} color={theme.primaryAction} />
        </View>
        <Text style={memoStyles.guestTitle}>Sign In to Sell</Text>
        <Text style={memoStyles.guestSubtitle}>
          Create an account to list your items and reach hundreds of buyers on your campus.
        </Text>
        <TouchableOpacity style={memoStyles.guestBtn} onPress={logout}>
          <Text style={memoStyles.guestBtnText}>Sign In / Register</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
        <ScrollView
          style={memoStyles.container}
          contentContainerStyle={{ paddingBottom: 50 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={memoStyles.pageHeader}>
            <Text style={memoStyles.pageTitle}>Create Listing</Text>
            <Text style={memoStyles.pageSubtitle}>Fill in the details to list your item.</Text>
          </View>

          {/* ---- PHOTO UPLOAD SECTION ---- */}
          <View style={memoStyles.sectionCard}>
            <View style={memoStyles.sectionHeader}>
              <View>
                <Text style={memoStyles.sectionTitle}>Photos</Text>
                <Text style={memoStyles.sectionHint}>
                  {images.length}/{MAX_IMAGES} added · First photo is the cover
                </Text>
              </View>
              {images.length < MAX_IMAGES && (
                <TouchableOpacity style={memoStyles.addMoreBtn} onPress={openSourceSheet}>
                  <Ionicons name="add" size={16} color={theme.primaryAccent} />
                  <Text style={memoStyles.addMoreText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
              {images.map((uri, index) => (
                <View key={index} style={memoStyles.imageThumbnailWrapper}>
                  <Image source={{ uri }} style={memoStyles.imageThumbnail} />
                  {/* Clearly visible remove button */}
                  <TouchableOpacity
                    style={memoStyles.removeImageBtn}
                    onPress={() => removeImage(index)}
                    hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                  >
                    <View style={memoStyles.removeImageBtnInner}>
                      <Ionicons name="close" size={13} color="#fff" />
                    </View>
                  </TouchableOpacity>
                  {index === 0 && (
                    <View style={memoStyles.coverBadge}>
                      <Text style={memoStyles.coverBadgeText}>Cover</Text>
                    </View>
                  )}
                </View>
              ))}

              {images.length < MAX_IMAGES && (
                <TouchableOpacity style={memoStyles.addImageBtn} onPress={openSourceSheet}>
                  <View style={memoStyles.addImageIcon}>
                    <Ionicons name="camera" size={26} color={theme.primaryAccent} />
                  </View>
                  <Text style={memoStyles.addImageText}>Add Photo</Text>
                  <Text style={memoStyles.addImageSub}>{remaining} left</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* ---- ITEM DETAILS SECTION ---- */}
          <View style={memoStyles.sectionCard}>
            <Text style={memoStyles.sectionTitle}>Item Details</Text>

            <View style={memoStyles.inputGroup}>
              <Text style={memoStyles.label}>Item Title <Text style={memoStyles.required}>*</Text></Text>
              <TextInput
                style={memoStyles.input}
                placeholder="e.g. Hero Sprint Cycle 21-speed"
                placeholderTextColor={theme.textTertiary + '80'}
                value={title}
                onChangeText={setTitle}
                maxLength={80}
              />
            </View>

            <View style={memoStyles.row}>
              <View style={[memoStyles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={memoStyles.label}>Price (₹) <Text style={memoStyles.required}>*</Text></Text>
                <TextInput
                  style={memoStyles.input}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary + '80'}
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>

              <View style={[memoStyles.inputGroup, { flex: 1 }]}>
                <Text style={memoStyles.label}>Category <Text style={memoStyles.required}>*</Text></Text>
                <TouchableOpacity style={memoStyles.dropdownBtn} onPress={() => setModalVisible(true)}>
                  <Text style={{ color: selectedCategory ? theme.textMain : theme.textTertiary, fontSize: 15, flex: 1 }} numberOfLines={1}>
                    {selectedCategory ? selectedCategory.name : 'Select...'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>

            {selectedCategory?.name === 'Other' && (
              <View style={memoStyles.inputGroup}>
                <Text style={memoStyles.label}>Specify Category <Text style={memoStyles.required}>*</Text></Text>
                <TextInput
                  style={memoStyles.input}
                  placeholder="e.g. Drafting Instruments"
                  placeholderTextColor={theme.textTertiary + '80'}
                  value={customCategory}
                  onChangeText={setCustomCategory}
                />
              </View>
            )}

            <View style={memoStyles.inputGroup}>
              <Text style={memoStyles.label}>WhatsApp / Phone <Text style={memoStyles.required}>*</Text></Text>
              <TextInput
                style={memoStyles.input}
                placeholder="10-digit number"
                placeholderTextColor={theme.textTertiary + '80'}
                keyboardType="phone-pad"
                value={contact}
                onChangeText={setContact}
                maxLength={10}
              />
            </View>

            <View style={memoStyles.inputGroup}>
              <Text style={memoStyles.label}>Pickup Location</Text>
              <TextInput
                style={memoStyles.input}
                placeholder="e.g. Hostel 5, Room 203 or Library Gate"
                placeholderTextColor={theme.textTertiary + '80'}
                value={location}
                onChangeText={setLocation}
                maxLength={80}
              />
            </View>

            <View style={memoStyles.inputGroup}>
              <Text style={memoStyles.label}>Description <Text style={memoStyles.required}>*</Text></Text>
              <TextInput
                style={[memoStyles.input, memoStyles.textArea]}
                placeholder="Describe the condition, age, reason for selling..."
                placeholderTextColor={theme.textTertiary + '80'}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                maxLength={500}
              />
              <Text style={memoStyles.charCount}>{description.length}/500</Text>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[memoStyles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handlePostItem}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={memoStyles.submitBtnText}>Post Listing</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Image Source Picker Sheet ── */}
      <Modal visible={sourceSheetVisible} transparent animationType="none" onRequestClose={closeSourceSheet}>
        <TouchableOpacity style={memoStyles.sheetOverlay} activeOpacity={1} onPress={closeSourceSheet}>
          <Animated.View
            style={[
              memoStyles.sourceSheet,
              {
                transform: [{
                  translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }),
                }],
                opacity: sheetAnim,
              },
            ]}
          >
            <View style={memoStyles.sheetHandle} />
            <Text style={memoStyles.sheetTitle}>Add Photo</Text>
            <Text style={memoStyles.sheetSubtitle}>
              {remaining > 1 ? `You can add up to ${remaining} more photo${remaining > 1 ? 's' : ''}` : 'You can add 1 more photo'}
            </Text>

            <TouchableOpacity style={memoStyles.sheetOption} onPress={pickFromCamera} activeOpacity={0.7}>
              <View style={[memoStyles.sheetOptionIcon, { backgroundColor: theme.primaryAccent + '20' }]}>
                <Ionicons name="camera" size={22} color={theme.primaryAccent} />
              </View>
              <View style={memoStyles.sheetOptionText}>
                <Text style={memoStyles.sheetOptionTitle}>Take Photo</Text>
                <Text style={memoStyles.sheetOptionDesc}>Use your camera • optional crop</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={memoStyles.sheetOption} onPress={pickFromGallery} activeOpacity={0.7}>
              <View style={[memoStyles.sheetOptionIcon, { backgroundColor: theme.secondaryAction + '20' }]}>
                <Ionicons name="images" size={22} color={theme.secondaryAction} />
              </View>
              <View style={memoStyles.sheetOptionText}>
                <Text style={memoStyles.sheetOptionTitle}>Choose from Gallery</Text>
                <Text style={memoStyles.sheetOptionDesc}>
                  {remaining > 1 ? `Select up to ${remaining} photos` : 'Select 1 photo • optional crop'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={memoStyles.sheetCancel} onPress={closeSourceSheet}>
              <Text style={memoStyles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Category Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={memoStyles.modalOverlay}>
          <View style={memoStyles.modalContent}>
            <Text style={memoStyles.modalTitle}>Select Category</Text>
            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={memoStyles.categoryItem}
                  onPress={() => { setSelectedCategory(item); setModalVisible(false); }}
                >
                  <View style={memoStyles.categoryIconBox}>
                    <Ionicons name={item.icon} size={22} color={theme.primaryAccent} />
                  </View>
                  <Text style={memoStyles.categoryItemText}>{item.name}</Text>
                  {selectedCategory?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.primaryAccent} />
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={memoStyles.closeModalBtn} onPress={() => setModalVisible(false)}>
              <Text style={memoStyles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default PostScreen;
