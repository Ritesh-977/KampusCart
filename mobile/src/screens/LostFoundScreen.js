import React, { useState, useCallback, useContext } from 'react';
import Toast from 'react-native-toast-message';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, Modal, TextInput, ScrollView, Alert, Image,
  RefreshControl, Platform, KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import { useThemeStyles } from '../hooks/useThemeStyles'; // <-- Update path as needed

const CATEGORIES = ['All', 'ID Card', 'Keys', 'Electronics', 'Books', 'Other'];
const ITEM_CATEGORIES = ['ID Card', 'Keys', 'Electronics', 'Books', 'Other'];
const CATEGORY_ICONS = {
  'All': 'grid-outline',
  'ID Card': 'card-outline',
  'Keys': 'key-outline',
  'Electronics': 'phone-portrait-outline',
  'Books': 'book-outline',
  'Other': 'ellipsis-horizontal-circle-outline',
};

const LostFoundScreen = ({ navigation }) => {
  // 1. Initialize dynamic theme hook
  const { styles, colors } = useThemeStyles(createStyles);

  const { isGuest, logout } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeType, setActiveType] = useState('Lost');
  const [activeCategory, setActiveCategory] = useState('All');
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // Report form state
  const [formType, setFormType] = useState('Lost');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('Other');
  const [formLocation, setFormLocation] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formImage, setFormImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = async () => {
    try {
      let url = `/lost-found?type=${activeType}`;
      if (activeCategory !== 'All') url += `&category=${activeCategory}`;
      const response = await API.get(url);
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching lost & found:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchItems();
    }, [activeType, activeCategory])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setFormImage(result.assets[0].uri);
  };

  const resetForm = () => {
    setFormType('Lost'); setFormTitle(''); setFormDescription('');
    setFormCategory('Other'); setFormLocation(''); setFormContact('');
    setFormImage(null);
  };

  const handleSubmitReport = async () => {
    if (!formTitle.trim() || !formLocation.trim() || !formContact.trim()) {
      Toast.show({ type: 'error', text1: 'Missing Info', text2: 'Please fill in title, location, and contact number.' });
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('title', formTitle.trim());
      formData.append('description', formDescription.trim());
      formData.append('category', formCategory);
      formData.append('type', formType);
      formData.append('location', formLocation.trim());
      formData.append('contact', formContact.trim());

      if (formImage) {
        const filename = formImage.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('image', { uri: formImage, name: filename, type });
      }

      await API.post('/lost-found', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Toast.show({ type: 'success', text1: 'Reported!', text2: `Your ${formType.toLowerCase()} item has been posted. Hope you find it!` });
      setReportModalVisible(false);
      resetForm();
      fetchItems();
    } catch (error) {
      const message = error.response?.data?.message || 'Could not submit report.';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = (itemId) => {
    Alert.alert('Mark as Resolved', 'Has this item been found?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Resolved!',
        onPress: async () => {
          try {
            await API.put(`/lost-found/${itemId}/resolve`);
            setItems(prev => prev.filter(i => i._id !== itemId));
          } catch (e) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Could not mark as resolved. Please try again.' });
          }
        }
      }
    ]);
  };

  const getTimeSince = (dateStr) => {
    const diff = Date.now() - new Date(dateStr);
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.cardImage} />
      )}
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          {/* Maintained hardcoded semantic colors for Lost/Found state badging */}
          <View style={[styles.typeBadge, item.type === 'Lost' ? styles.lostBadge : styles.foundBadge]}>
            <Text style={[styles.typeBadgeText, item.type === 'Lost' ? styles.lostBadgeText : styles.foundBadgeText]}>
              {item.type}
            </Text>
          </View>
          <Text style={styles.timeText}>{getTimeSince(item.createdAt)}</Text>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.metaText}>{item.location}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="pricetag-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.metaText}>{item.category}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Alert.alert('Contact', `Reach out to: ${item.contact}`)}
          >
            <Ionicons name="call-outline" size={16} color={colors.primaryAction} />
            <Text style={styles.contactBtnText}>Contact Reporter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resolveBtn} onPress={() => handleResolve(item._id)}>
            <Text style={styles.resolveBtnText}>Resolved ✓</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lost & Found</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Type Toggle */}
      <View style={styles.typeToggle}>
        {['Lost', 'Found'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.toggleBtn, activeType === type && styles.toggleBtnActive]}
            onPress={() => setActiveType(type)}
          >
            <Text style={[styles.toggleText, activeType === type && styles.toggleTextActive]}>
              {type === 'Lost' ? '🔍 Lost' : '✅ Found'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, activeCategory === cat && styles.catChipActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Ionicons
              name={CATEGORY_ICONS[cat]}
              size={12}
              color={activeCategory === cat ? (colors.textOnPrimary || '#ffffff'): colors.textTertiary}
              style={{ marginRight: 3 }}
            />
            <Text style={[styles.catChipText, activeCategory === cat && styles.catChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Item List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryAction} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[colors.primaryAction]} 
              tintColor={colors.primaryAction} 
              progressBackgroundColor={colors.card} // <-- Added this!
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>
                {activeType === 'Lost' ? '🔍' : '✅'}
              </Text>
              <Text style={styles.emptyTitle}>No {activeType} Items</Text>
              <Text style={styles.emptySubtitle}>
                {activeType === 'Lost'
                  ? 'No lost items reported for this category.'
                  : 'No found items reported. Did you find something? Report it!'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB to Report */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (isGuest) {
            Alert.alert(
              'Login Required',
              'Please sign in to report a lost or found item.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign In', onPress: logout },
              ]
            );
            return;
          }
          setReportModalVisible(true);
        }}
      >
        <Ionicons name="add" size={28} color={colors.textOnPrimary || '#ffffff'} />
      </TouchableOpacity>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Report an Item</Text>
                <TouchableOpacity onPress={() => { setReportModalVisible(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color={colors.textSub} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* Lost / Found toggle */}
                <View style={styles.formTypeRow}>
                  {['Lost', 'Found'].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.formTypeBtn, formType === t && styles.formTypeBtnActive]}
                      onPress={() => setFormType(t)}
                    >
                      <Text style={[styles.formTypeBtnText, formType === t && styles.formTypeBtnTextActive]}>
                        {t === 'Lost' ? '😔 I Lost It' : '😊 I Found It'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Item Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Blue Water Bottle"
                    value={formTitle}
                    onChangeText={setFormTitle}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Category *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {ITEM_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.catChip, formCategory === cat && styles.catChipActive, { marginBottom: 0 }]}
                        onPress={() => setFormCategory(cat)}
                      >
                        <Text style={[styles.catChipText, formCategory === cat && styles.catChipTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Last Seen Location *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Library, Ground Floor"
                    value={formLocation}
                    onChangeText={setFormLocation}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                    placeholder="Any identifying features..."
                    value={formDescription}
                    onChangeText={setFormDescription}
                    multiline
                    numberOfLines={3}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Your Contact Number *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 9876543210"
                    value={formContact}
                    onChangeText={setFormContact}
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                {/* Image picker */}
                <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                  {formImage ? (
                    <Image source={{ uri: formImage }} style={styles.imagePreview} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={24} color={colors.textTertiary} />
                      <Text style={styles.imagePickerText}>Add Photo (optional)</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleSubmitReport}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit Report</Text>
                  )}
                </TouchableOpacity>

              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ─── Theme-Aware Style Generator ─────────────────────────────────────────────
const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 50 : 14,
    paddingBottom: 14, backgroundColor: theme.header,
    borderBottomWidth: 1, borderBottomColor: theme.headerDivider,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: theme.textMain },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  typeToggle: {
    flexDirection: 'row', margin: 16,
    backgroundColor: theme.card, borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: theme.cardAccent,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
  },
  toggleBtnActive: { 
    backgroundColor: theme.inputBg, // Slightly varied background for the active toggle pill
    shadowColor: theme.textMain, shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 
  },
  toggleText: { fontSize: 15, fontWeight: '600', color: theme.textSub },
  toggleTextActive: { color: theme.textMain },

  categoryRow: { paddingLeft: 16, marginBottom: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 28, paddingHorizontal: 11, borderRadius: 14,
    backgroundColor: theme.card, marginRight: 7, marginBottom: 10,
    borderWidth: 1, borderColor: theme.cardAccent,
  },
  catChipActive: { backgroundColor: theme.primaryAction, borderColor: theme.primaryAction },
  catChipText: { fontSize: 12, fontWeight: '600', color: theme.textSub, lineHeight: 16 },
  catChipTextActive: { color: theme.textOnPrimary || '#ffffff' }, // Always white text on primaryAction backgrounds

  list: { padding: 16 },
  card: {
    backgroundColor: theme.card, borderRadius: 14, marginBottom: 14,
    borderWidth: 1, borderColor: theme.cardAccent,
    shadowColor: theme.textMain, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },
  cardImage: { width: '100%', height: 160, backgroundColor: theme.cardAccent },
  cardContent: { padding: 14 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  
  // Kept Semantic Status Badges (Red for Lost, Green for Found/Resolved)
  lostBadge: { backgroundColor: 'rgba(239,68,68,0.15)' },
  foundBadge: { backgroundColor: 'rgba(22,163,74,0.15)' },
  lostBadgeText: { fontSize: 12, fontWeight: '700', color: '#f87171' },
  foundBadgeText: { fontSize: 12, fontWeight: '700', color: '#4ade80' },
  
  timeText: { fontSize: 12, color: theme.textTertiary },
  cardTitle: { fontSize: 17, fontWeight: '700', color: theme.textMain, marginBottom: 4 },
  cardDesc: { fontSize: 14, color: theme.textSub, lineHeight: 20, marginBottom: 10 },
  cardMeta: { flexDirection: 'row', marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  metaText: { fontSize: 13, color: theme.textTertiary, marginLeft: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.cardAccent, paddingTop: 12 },
  contactBtn: { flexDirection: 'row', alignItems: 'center' },
  contactBtnText: { fontSize: 14, color: theme.primaryAccent, fontWeight: '600', marginLeft: 4 },
  resolveBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(22,163,74,0.15)', borderRadius: 8 },
  resolveBtnText: { fontSize: 13, color: '#4ade80', fontWeight: '600' },

  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.textMain, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: theme.textSub, textAlign: 'center', lineHeight: 22 },

  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: theme.primaryAction, justifyContent: 'center', alignItems: 'center',
    shadowColor: theme.primaryAction, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  modalContent: {
    backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '90%', borderWidth: 1, borderColor: theme.cardAccent,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.textMain },

  formTypeRow: { flexDirection: 'row', backgroundColor: theme.inputBg, borderRadius: 12, padding: 4, marginBottom: 16 },
  formTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  formTypeBtnActive: { backgroundColor: theme.primaryAction },
  formTypeBtnText: { fontSize: 14, fontWeight: '600', color: theme.textSub },
  formTypeBtnTextActive: { color: theme.textOnPrimary || '#ffffff'},

  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: '600', color: theme.textSub, marginBottom: 8 },
  formInput: {
    backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.inputBorder,
    borderRadius: 10, padding: 13, fontSize: 15, color: theme.textMain,
  },
  imagePickerBtn: {
    height: 120, backgroundColor: theme.inputBg, borderRadius: 12,
    borderWidth: 1, borderColor: theme.primaryAction, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePickerText: { fontSize: 14, color: theme.textTertiary, marginTop: 6 },
  submitBtn: {
    backgroundColor: theme.primaryAction, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginBottom: 20,
  },
  submitBtnText: { color: theme.textOnPrimary || '#ffffff', fontSize: 16, fontWeight: 'bold' },
});

export default LostFoundScreen;