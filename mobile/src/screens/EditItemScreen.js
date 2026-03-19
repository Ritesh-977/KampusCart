import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';

const FALLBACK = 'https://cdn.pixabay.com/photo/2016/11/19/14/00/code-1839406_1280.jpg';

const EditItemScreen = ({ route, navigation }) => {
  const { item } = route.params;

  const [title, setTitle] = useState(item.title);
  const [price, setPrice] = useState(item.price ? item.price.toString() : '');
  const [description, setDescription] = useState(item.description);
  const [contact, setContact] = useState(item.contactNumber ? item.contactNumber.toString() : '');
  const [location, setLocation] = useState(item.location || '');
  const [isSold, setIsSold] = useState(item.isSold);
  const [loading, setLoading] = useState(false);

  // Trash icon in nav header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ marginRight: 4 }}
        >
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleUpdate = async () => {
    if (!title.trim() || !price.trim()) {
      Alert.alert('Missing Fields', 'Title and price are required.');
      return;
    }
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('price', price);
      formData.append('description', description);
      formData.append('contactNumber', contact);
      formData.append('category', item.category);
      formData.append('location', location.trim());
      if (item.images) {
        formData.append('existingImages', JSON.stringify(item.images));
      }
      await API.put(`/items/${item._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Saved', 'Your listing has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not update the listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSold = async () => {
    try {
      setLoading(true);
      const response = await API.patch(`/items/${item._id}/status`);
      setIsSold(response.data.isSold);
    } catch {
      Alert.alert('Error', 'Could not update status.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Listing', 'This will permanently remove your listing. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await API.delete(`/items/${item._id}`);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Could not delete item.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const coverImage = item.images?.[0] || item.image;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Item preview card ─────────────────────────────── */}
        <View style={styles.previewCard}>
          <Image
            source={{ uri: coverImage || FALLBACK }}
            style={styles.previewImage}
            resizeMode="cover"
          />
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.previewMeta}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
              <View style={[styles.statusBadge, isSold ? styles.statusSold : styles.statusAvail]}>
                <View style={[styles.statusDot, isSold ? styles.dotSold : styles.dotAvail]} />
                <Text style={[styles.statusLabel, isSold ? styles.labelSold : styles.labelAvail]}>
                  {isSold ? 'Sold' : 'Available'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Listing status toggle ─────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listing Status</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, !isSold && styles.toggleActive]}
              onPress={() => !isSold || handleToggleSold()}
              disabled={loading}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={!isSold ? '#10b981' : '#9ca3af'}
              />
              <Text style={[styles.toggleLabel, !isSold && styles.toggleLabelActive]}>
                Available
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, isSold && styles.toggleSoldActive]}
              onPress={() => isSold || handleToggleSold()}
              disabled={loading}
            >
              <Ionicons
                name="ban-outline"
                size={18}
                color={isSold ? '#ef4444' : '#9ca3af'}
              />
              <Text style={[styles.toggleLabel, isSold && styles.toggleLabelSold]}>
                Mark as Sold
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Edit fields ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listing Details</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="What are you selling?"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Price</Text>
            <View style={styles.prefixInput}>
              <Text style={styles.prefix}>₹</Text>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                placeholder="0"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={contact}
              onChangeText={setContact}
              placeholder="Your phone number"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Pickup Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Hostel 5, Room 203 or Library Gate"
              placeholderTextColor="#9ca3af"
              maxLength={80}
            />
          </View>

          <View style={[styles.field, { marginBottom: 0 }]}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the condition, age, brand…"
              placeholderTextColor="#9ca3af"
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* ── Save button ───────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleUpdate}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f172a' },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Preview card
  previewCard: {
    flexDirection: 'row', backgroundColor: '#1e293b',
    borderRadius: 16, overflow: 'hidden', marginBottom: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  previewImage: { width: 90, height: 90 },
  previewInfo: { flex: 1, padding: 12, justifyContent: 'space-between' },
  previewTitle: { fontSize: 15, fontWeight: '700', color: '#f1f5f9', lineHeight: 21 },
  previewMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  categoryBadge: {
    backgroundColor: 'rgba(79,70,229,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  categoryText: { fontSize: 12, color: '#818cf8', fontWeight: '600' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, gap: 5,
  },
  statusAvail: { backgroundColor: 'rgba(16,185,129,0.15)' },
  statusSold: { backgroundColor: 'rgba(239,68,68,0.15)' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  dotAvail: { backgroundColor: '#10b981' },
  dotSold: { backgroundColor: '#ef4444' },
  statusLabel: { fontSize: 12, fontWeight: '700' },
  labelAvail: { color: '#34d399' },
  labelSold: { color: '#f87171' },

  // Section card
  section: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#334155',
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 },

  // Status toggle
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#334155',
  },
  toggleActive: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10b981' },
  toggleSoldActive: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleLabelActive: { color: '#34d399' },
  toggleLabelSold: { color: '#f87171' },

  // Form fields
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 7 },
  input: {
    backgroundColor: '#273549', borderWidth: 1, borderColor: '#334155',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 15, color: '#f1f5f9',
  },
  inputFlex: { flex: 1, borderWidth: 0, backgroundColor: 'transparent', paddingLeft: 0 },
  prefixInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#273549', borderWidth: 1, borderColor: '#334155',
    borderRadius: 10, paddingHorizontal: 14,
  },
  prefix: { fontSize: 16, color: '#94a3b8', fontWeight: '700', marginRight: 4 },
  textArea: { height: 110, paddingTop: 12, lineHeight: 22 },

  // Save button
  saveBtn: {
    flexDirection: 'row', backgroundColor: '#4f46e5',
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    justifyContent: 'center', marginTop: 4,
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});

export default EditItemScreen;
