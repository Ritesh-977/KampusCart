import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Platform,
  KeyboardAvoidingView, SafeAreaView, Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['Exam Paper', 'Note', 'Book'];
const SEMESTERS  = ['1', '2', '3', '4', '5', '6', '7', '8'];

const CAT_META = {
  'Exam Paper': { color: '#818cf8', icon: 'document-text-outline' },
  'Note':       { color: '#34d399', icon: 'pencil-outline' },
  'Book':       { color: '#f472b6', icon: 'book-outline' },
};

// ── UploadMaterialScreen ──────────────────────────────────────────────────────

const UploadMaterialScreen = ({ navigation }) => {
  const { currentUser } = useContext(AuthContext);

  // Form fields
  const [title, setTitle]         = useState('');
  const [subject, setSubject]     = useState('');
  const [semester, setSemester]   = useState('');
  const [category, setCategory]   = useState('');
  const [file, setFile]           = useState(null);   // DocumentPicker result

  // UI state
  const [submitting, setSubmitting]         = useState(false);
  const [showCatPicker, setShowCatPicker]   = useState(false);
  const [showSemPicker, setShowSemPicker]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── File picker ────────────────────────────────────────────────────────────

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      // Expo SDK 50+ returns { canceled, assets }
      if (result.canceled) return;
      const asset = result.assets?.[0] ?? result; // backwards compat

      if (!asset.uri) return;

      // 5 MB guard (DocumentPicker gives size in bytes)
      if (asset.size && asset.size > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select a file smaller than 5 MB.');
        return;
      }

      setFile(asset);
    } catch {
      Alert.alert('Error', 'Could not open file picker.');
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    // Validation
    if (!title.trim())   { Alert.alert('Missing', 'Please enter a title.');        return; }
    if (!subject.trim()) { Alert.alert('Missing', 'Please enter the subject name.'); return; }
    if (!semester)       { Alert.alert('Missing', 'Please select a semester.');     return; }
    if (!category)       { Alert.alert('Missing', 'Please select a category.');     return; }
    if (!file)           { Alert.alert('Missing', 'Please attach a PDF or image.'); return; }

    try {
      setSubmitting(true);
      setUploadProgress(0);

      // Build multipart/form-data payload
      const form = new FormData();
      form.append('title',       title.trim());
      form.append('subjectName', subject.trim());
      form.append('semester',    semester);
      form.append('category',    category);
      form.append('file', {
        uri:  Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
        name: file.name || `upload_${Date.now()}.pdf`,
        type: file.mimeType || 'application/pdf',
      });

      await API.post('/materials/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      Alert.alert('Uploaded!', 'Your material has been shared with your campus.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Upload failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const catMeta   = category ? CAT_META[category] : null;
  const fileIsImg = file?.mimeType?.startsWith('image/');

  const truncateName = (name = '', max = 32) =>
    name.length > max ? `${name.slice(0, max)}…` : name;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Material</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Campus chip */}
          <View style={styles.campusChip}>
            <Ionicons name="school-outline" size={13} color="#818cf8" />
            <Text style={styles.campusChipText}>{currentUser?.college || 'Your Campus'}</Text>
          </View>

          {/* Title */}
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Mid-Term 2023 – Data Structures"
            placeholderTextColor="#475569"
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />

          {/* Subject */}
          <Text style={styles.label}>Subject Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Data Structures & Algorithms"
            placeholderTextColor="#475569"
            value={subject}
            onChangeText={setSubject}
            maxLength={80}
          />

          {/* Semester + Category row */}
          <View style={styles.rowInputs}>
            {/* Semester */}
            <View style={styles.halfBlock}>
              <Text style={styles.label}>Semester *</Text>
              <TouchableOpacity
                style={[styles.selectBtn, semester && styles.selectBtnFilled]}
                onPress={() => setShowSemPicker(true)}
              >
                <Ionicons name="layers-outline" size={16} color={semester ? '#818cf8' : '#475569'} />
                <Text style={[styles.selectBtnText, semester && { color: '#f1f5f9' }]}>
                  {semester ? `Semester ${semester}` : 'Select…'}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Category */}
            <View style={styles.halfBlock}>
              <Text style={styles.label}>Category *</Text>
              <TouchableOpacity
                style={[styles.selectBtn, category && styles.selectBtnFilled]}
                onPress={() => setShowCatPicker(true)}
              >
                {catMeta
                  ? <Ionicons name={catMeta.icon} size={16} color={catMeta.color} />
                  : <Ionicons name="list-outline" size={16} color="#475569" />
                }
                <Text style={[styles.selectBtnText, category && { color: '#f1f5f9' }]}>
                  {category || 'Select…'}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>

          {/* File picker */}
          <Text style={styles.label}>File (PDF or Image, max 5 MB) *</Text>
          <TouchableOpacity
            style={[styles.filePicker, file && styles.filePickerFilled]}
            onPress={pickFile}
          >
            {file ? (
              <>
                <Ionicons
                  name={fileIsImg ? 'image-outline' : 'document-outline'}
                  size={28}
                  color="#818cf8"
                />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {truncateName(file.name)}
                  </Text>
                  {file.size && (
                    <Text style={styles.fileSize}>
                      {(file.size / 1024).toFixed(0)} KB
                    </Text>
                  )}
                </View>
                <Ionicons name="checkmark-circle" size={20} color="#34d399" />
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={32} color="#334155" />
                <Text style={styles.filePickerLabel}>Tap to browse PDF or Image</Text>
                <Text style={styles.filePickerSub}>Max 5 MB · PDF, JPG, PNG</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Progress bar (visible while uploading) */}
          {submitting && uploadProgress > 0 && (
            <View style={styles.progressWrap}>
              <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
              <Text style={styles.progressText}>{uploadProgress}%</Text>
            </View>
          )}

          {/* Info note */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={15} color="#64748b" />
            <Text style={styles.infoText}>
              Uploaded materials are visible to all students on your campus. Please ensure you have the right to share this file.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                  <Text style={styles.submitText}>Upload Material</Text>
                </>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Category Picker Modal ── */}
      <Modal visible={showCatPicker} transparent animationType="fade" onRequestClose={() => setShowCatPicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCatPicker(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Select Category</Text>
          {CATEGORIES.map(cat => {
            const m = CAT_META[cat];
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.sheetRow, category === cat && styles.sheetRowActive]}
                onPress={() => { setCategory(cat); setShowCatPicker(false); }}
              >
                <View style={[styles.sheetIcon, { backgroundColor: m.color + '18' }]}>
                  <Ionicons name={m.icon} size={18} color={m.color} />
                </View>
                <Text style={[styles.sheetRowText, category === cat && { color: m.color, fontWeight: '700' }]}>
                  {cat}
                </Text>
                {category === cat && <Ionicons name="checkmark" size={18} color={m.color} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>

      {/* ── Semester Picker Modal ── */}
      <Modal visible={showSemPicker} transparent animationType="fade" onRequestClose={() => setShowSemPicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowSemPicker(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Select Semester</Text>
          <View style={styles.semGrid}>
            {SEMESTERS.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.semCell, semester === s && styles.semCellActive]}
                onPress={() => { setSemester(s); setShowSemPicker(false); }}
              >
                <Text style={[styles.semCellText, semester === s && styles.semCellTextActive]}>
                  Sem {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 12,
    paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  backBtn:     { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#f1f5f9' },

  form: { padding: 20, paddingBottom: 48 },

  campusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(129,140,248,0.1)',
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#4f46e540', marginBottom: 24,
  },
  campusChipText: { fontSize: 13, color: '#818cf8', fontWeight: '600' },

  label: {
    fontSize: 12, fontWeight: '700', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: 6, marginTop: 18,
  },
  input: {
    backgroundColor: '#1e293b', color: '#f1f5f9',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, borderWidth: 1, borderColor: '#334155',
  },

  rowInputs: { flexDirection: 'row', gap: 12 },
  halfBlock: { flex: 1 },

  selectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1e293b', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 13,
    borderWidth: 1, borderColor: '#334155',
  },
  selectBtnFilled: { borderColor: '#4f46e550' },
  selectBtnText: { flex: 1, color: '#475569', fontSize: 13 },

  // File picker
  filePicker: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#273549',
    borderRadius: 16, paddingVertical: 28, paddingHorizontal: 20,
    backgroundColor: '#0d1525', gap: 8, marginTop: 4,
  },
  filePickerFilled: {
    flexDirection: 'row', paddingVertical: 18,
    borderStyle: 'solid', borderColor: '#4f46e550',
  },
  filePickerLabel: { fontSize: 14, fontWeight: '600', color: '#475569' },
  filePickerSub:   { fontSize: 12, color: '#334155' },
  fileInfo: { flex: 1, marginLeft: 10 },
  fileName: { fontSize: 14, fontWeight: '600', color: '#f1f5f9' },
  fileSize: { fontSize: 11, color: '#64748b', marginTop: 2 },

  // Progress
  progressWrap: {
    height: 6, backgroundColor: '#1e293b', borderRadius: 3,
    marginTop: 12, overflow: 'hidden', position: 'relative',
  },
  progressBar: { height: '100%', backgroundColor: '#6366f1', borderRadius: 3 },
  progressText: {
    position: 'absolute', right: 0, top: -18,
    fontSize: 11, color: '#818cf8', fontWeight: '700',
  },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#0d1525', padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#1e293b', marginTop: 22,
  },
  infoText: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 18 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#4f46e5', borderRadius: 14,
    paddingVertical: 16, marginTop: 26,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    borderTopWidth: 1, borderColor: '#334155',
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#f1f5f9', marginBottom: 16 },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#273549',
  },
  sheetRowActive: { backgroundColor: 'rgba(129,140,248,0.06)', borderRadius: 10, paddingHorizontal: 8 },
  sheetIcon:      { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sheetRowText:   { flex: 1, fontSize: 15, color: '#94a3b8' },

  semGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  semCell: {
    width: '22%', paddingVertical: 14,
    backgroundColor: '#273549', borderRadius: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  semCellActive:     { backgroundColor: 'rgba(99,102,241,0.2)', borderColor: '#6366f1' },
  semCellText:       { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  semCellTextActive: { color: '#818cf8', fontWeight: '800' },
});

export default UploadMaterialScreen;
