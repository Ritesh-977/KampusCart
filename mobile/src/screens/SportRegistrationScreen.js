import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, ScrollView, TextInput, Alert, ActivityIndicator,
  Modal, Image, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Other'];

// ── FIXED: Moved Field component OUTSIDE the main screen component ──────────
const Field = ({ label, required, children }) => (
  <View style={s.field}>
    <Text style={s.label}>{label}{required && <Text style={s.req}> *</Text>}</Text>
    {children}
  </View>
);
// ─────────────────────────────────────────────────────────────────────────────

const SportRegistrationScreen = ({ navigation, route }) => {
  const { sport } = route.params;
  const { currentUser } = useContext(AuthContext);

  const [teamName,       setTeamName]       = useState('');
  const [captainName,    setCaptainName]    = useState(currentUser?.name || '');
  const [captainContact, setCaptainContact] = useState('');
  const [course,         setCourse]         = useState('');
  const [year,           setYear]           = useState('');
  const [proofFile,      setProofFile]      = useState(null);

  const [showYearPicker, setShowYearPicker] = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const hasFee = sport.registrationFee > 0;

  // ── Pick payment proof ──────────────────────────────────────────────────────
  const pickProof = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0] ?? result;
      if (!asset.uri) return;
      if (asset.size && asset.size > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select a file smaller than 5 MB.');
        return;
      }
      setProofFile(asset);
    } catch {
      Alert.alert('Error', 'Could not open file picker.');
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!teamName.trim())       { Alert.alert('Missing', 'Please enter team name.');          return; }
    if (!captainName.trim())    { Alert.alert('Missing', 'Please enter captain name.');       return; }
    if (!captainContact.trim()) { Alert.alert('Missing', 'Please enter captain\'s contact.'); return; }
    if (!course.trim())         { Alert.alert('Missing', 'Please enter course.');             return; }
    if (!year)                  { Alert.alert('Missing', 'Please select year.');              return; }
    if (hasFee && !proofFile)   { Alert.alert('Missing', 'Please attach payment proof.');     return; }

    try {
      setSubmitting(true);
      setUploadProgress(0);

      const form = new FormData();
      form.append('teamName',       teamName.trim());
      form.append('captainName',    captainName.trim());
      form.append('captainContact', captainContact.trim());
      form.append('course',         course.trim());
      form.append('year',           year);

      if (proofFile) {
        form.append('paymentProof', {
          uri:  Platform.OS === 'android' ? proofFile.uri : proofFile.uri.replace('file://', ''),
          name: proofFile.name || `payment_proof_${Date.now()}.jpg`,
          type: proofFile.mimeType || 'image/jpeg',
        });
      }

      await API.post(`/sports/${sport._id}/register`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      Alert.alert(
        'Registered! 🎉',
        'You have successfully registered for this sport event. The organizer will review and confirm your registration.',
        [{ text: 'Great!', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      const msg = e?.response?.data?.message || 'Registration failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };


  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Register for {sport.sportType}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Sport info banner */}
        <View style={s.sportBanner}>
          <View>
            <Text style={s.sportBannerTitle} numberOfLines={2}>{sport.title}</Text>
            <Text style={s.sportBannerMeta}>
              {sport.teamSize === 1 ? 'Individual event' : `Team size: ${sport.teamSize} players`}
            </Text>
          </View>
          {hasFee && (
            <View style={s.feeBadge}>
              <Text style={s.feeTxt}>₹{sport.registrationFee}</Text>
            </View>
          )}
        </View>

        {/* Payment QR (if paid) */}
        {hasFee && !!sport.qrCodeUrl && (
          <View style={s.qrCard}>
            <Text style={s.qrCardTitle}>Step 1 — Pay Registration Fee</Text>
            <Text style={s.qrCardSub}>Scan the QR code below to pay ₹{sport.registrationFee}</Text>
            <View style={s.qrWrapper}>
              <Image source={{ uri: sport.qrCodeUrl }} style={s.qrImage} resizeMode="contain" />
            </View>
            <Text style={s.qrNote}>
              Take a screenshot after payment and attach it as proof below.
            </Text>
          </View>
        )}

        <Text style={s.sectionHeading}>
          {hasFee ? 'Step 2 — Registration Details' : 'Registration Details'}
        </Text>

        {/* Team Name */}
        <Field label="Team Name" required>
          <TextInput
            style={s.input}
            placeholder={sport.teamSize === 1 ? 'Your name or identifier' : 'e.g. The Champions'}
            placeholderTextColor="#475569"
            value={teamName}
            onChangeText={setTeamName}
          />
        </Field>

        {/* Captain Name */}
        <Field label="Captain's Name" required>
          <TextInput
            style={s.input}
            placeholder="Full name"
            placeholderTextColor="#475569"
            value={captainName}
            onChangeText={setCaptainName}
          />
        </Field>

        {/* Captain Contact */}
        <Field label="Captain's Contact No." required>
          <TextInput
            style={s.input}
            placeholder="10-digit mobile number"
            placeholderTextColor="#475569"
            keyboardType="phone-pad"
            value={captainContact}
            onChangeText={setCaptainContact}
          />
        </Field>

        {/* Course */}
        <Field label="Course" required>
          <TextInput
            style={s.input}
            placeholder="e.g. B.Tech CSE, BBA, MBA…"
            placeholderTextColor="#475569"
            value={course}
            onChangeText={setCourse}
          />
        </Field>

        {/* Year */}
        <Field label="Year" required>
          <TouchableOpacity style={s.picker} onPress={() => setShowYearPicker(true)}>
            <Text style={year ? s.pickerValue : s.pickerPlaceholder}>
              {year || 'Select year…'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#475569" />
          </TouchableOpacity>
        </Field>

        {/* Payment Proof */}
        {hasFee && (
          <Field label="Payment Proof (screenshot / PDF)" required>
            <Text style={s.hint}>Attach screenshot of your payment transaction.</Text>
            <TouchableOpacity style={s.fileBtn} onPress={pickProof}>
              {proofFile ? (
                <View style={s.fileSelected}>
                  <Ionicons name={proofFile.mimeType === 'application/pdf' ? 'document-outline' : 'image-outline'} size={20} color="#818cf8" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.fileName} numberOfLines={1}>{proofFile.name || 'payment_proof'}</Text>
                    {proofFile.size && (
                      <Text style={s.fileSize}>{(proofFile.size / 1024).toFixed(0)} KB</Text>
                    )}
                  </View>
                  <Ionicons name="checkmark-circle" size={18} color="#34d399" />
                </View>
              ) : (
                <View style={s.filePlaceholder}>
                  <Ionicons name="cloud-upload-outline" size={28} color="#334155" />
                  <Text style={s.filePlaceholderTxt}>Tap to attach proof</Text>
                  <Text style={s.filePlaceholderSub}>Image or PDF · Max 5 MB</Text>
                </View>
              )}
            </TouchableOpacity>
          </Field>
        )}

        {/* Upload progress */}
        {submitting && uploadProgress > 0 && uploadProgress < 100 && (
          <View style={s.progressBox}>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={s.progressTxt}>Uploading… {uploadProgress}%</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, submitting && s.submitOff]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="trophy-outline" size={18} color="#fff" />
                <Text style={s.submitTxt}>Submit Registration</Text>
              </>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Year picker modal */}
      <Modal visible={showYearPicker} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowYearPicker(false)} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>Select Year</Text>
          {YEARS.map(y => (
            <TouchableOpacity
              key={y}
              style={[s.yearRow, year === y && s.yearRowActive]}
              onPress={() => { setYear(y); setShowYearPicker(false); }}
            >
              <Text style={[s.yearTxt, year === y && s.yearTxtActive]}>{y}</Text>
              {year === y && <Ionicons name="checkmark" size={16} color="#818cf8" />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SportRegistrationScreen;

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#0f172a' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1e293b' 
  },
  iconBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, color: '#f1f5f9', fontSize: 15, fontWeight: '700', textAlign: 'center', marginHorizontal: 4 },

  form: { padding: 16 },

  // Sport banner
  sportBanner:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 14, gap: 12 },
  sportBannerTitle: { fontSize: 14, fontWeight: '700', color: '#f1f5f9', flex: 1, lineHeight: 20 },
  sportBannerMeta:  { fontSize: 12, color: '#64748b', marginTop: 3 },
  feeBadge:  { backgroundColor: 'rgba(129,140,248,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  feeTxt:    { fontSize: 14, color: '#818cf8', fontWeight: '800' },

  // QR card
  qrCard:      { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 14, gap: 8 },
  qrCardTitle: { fontSize: 14, fontWeight: '800', color: '#f1f5f9' },
  qrCardSub:   { fontSize: 12, color: '#64748b' },
  qrWrapper:   { alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  qrImage:     { width: 190, height: 190 },
  qrNote:      { fontSize: 12, color: '#fbbf24', textAlign: 'center', lineHeight: 18 },

  sectionHeading: { fontSize: 13, fontWeight: '800', color: '#818cf8', marginBottom: 12, marginTop: 4 },

  // Fields
  field:  { marginBottom: 14 },
  label:  { fontSize: 13, fontWeight: '700', color: '#94a3b8', marginBottom: 6 },
  req:    { color: '#ef4444' },
  hint:   { fontSize: 12, color: '#475569', marginBottom: 6, lineHeight: 17 },

  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f1f5f9',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  picker: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerValue:       { flex: 1, color: '#f1f5f9', fontSize: 14 },
  pickerPlaceholder: { flex: 1, color: '#475569', fontSize: 14 },

  // File picker
  fileBtn:         { borderRadius: 12, borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed', overflow: 'hidden' },
  fileSelected:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: 'rgba(129,140,248,0.06)' },
  fileName:        { fontSize: 13, color: '#f1f5f9', fontWeight: '600', flex: 1 },
  fileSize:        { fontSize: 11, color: '#64748b', marginTop: 1 },
  filePlaceholder: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  filePlaceholderTxt: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  filePlaceholderSub: { fontSize: 11, color: '#475569' },

  // Progress
  progressBox:  { marginBottom: 14 },
  progressBar:  { height: 4, backgroundColor: '#334155', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#818cf8', borderRadius: 2 },
  progressTxt:  { fontSize: 11, color: '#64748b', marginTop: 4, textAlign: 'center' },

  // Submit
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#818cf8', paddingVertical: 16, borderRadius: 14, marginTop: 8 },
  submitOff: { opacity: 0.6 },
  submitTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:   { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#f1f5f9', marginBottom: 12 },
  yearRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  yearRowActive: { backgroundColor: 'rgba(129,140,248,0.06)', marginHorizontal: -20, paddingHorizontal: 20 },
  yearTxt:       { fontSize: 15, color: '#94a3b8' },
  yearTxtActive: { color: '#818cf8', fontWeight: '700' },
});