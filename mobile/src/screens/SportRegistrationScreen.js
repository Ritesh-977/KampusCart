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
import { useThemeStyles } from '../hooks/useThemeStyles'; // <-- Update path as needed

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Other'];

// ── FIXED: Moved Field component OUTSIDE the main screen component ──────────
// Added `styles` prop to access dynamic theme safely
const Field = ({ label, required, children, styles }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}{required && <Text style={styles.req}> *</Text>}</Text>
    {children}
  </View>
);
// ─────────────────────────────────────────────────────────────────────────────

const SportRegistrationScreen = ({ navigation, route }) => {
  // 1. Initialize dynamic theme hook
  const { styles, colors } = useThemeStyles(createStyles);

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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.header} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Register for {sport.sportType}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Sport info banner */}
        <View style={styles.sportBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sportBannerTitle} numberOfLines={2}>{sport.title}</Text>
            <Text style={styles.sportBannerMeta}>
              {sport.teamSize === 1 ? 'Individual event' : `Team size: ${sport.teamSize} players`}
            </Text>
          </View>
          {hasFee && (
            <View style={styles.feeBadge}>
              <Text style={styles.feeTxt}>₹{sport.registrationFee}</Text>
            </View>
          )}
        </View>

        {/* Payment QR (if paid) */}
        {hasFee && !!sport.qrCodeUrl && (
          <View style={styles.qrCard}>
            <Text style={styles.qrCardTitle}>Step 1 — Pay Registration Fee</Text>
            <Text style={styles.qrCardSub}>Scan the QR code below to pay ₹{sport.registrationFee}</Text>
            <View style={styles.qrWrapper}>
              <Image source={{ uri: sport.qrCodeUrl }} style={styles.qrImage} resizeMode="contain" />
            </View>
            <Text style={styles.qrNote}>
              Take a screenshot after payment and attach it as proof below.
            </Text>
          </View>
        )}

        <Text style={styles.sectionHeading}>
          {hasFee ? 'Step 2 — Registration Details' : 'Registration Details'}
        </Text>

        {/* Team Name */}
        <Field label="Team Name" required styles={styles}>
          <TextInput
            style={styles.input}
            placeholder={sport.teamSize === 1 ? 'Your name or identifier' : 'e.g. The Champions'}
            placeholderTextColor={colors.textTertiary}
            value={teamName}
            onChangeText={setTeamName}
          />
        </Field>

        {/* Captain Name */}
        <Field label="Captain's Name" required styles={styles}>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={colors.textTertiary}
            value={captainName}
            onChangeText={setCaptainName}
          />
        </Field>

        {/* Captain Contact */}
        <Field label="Captain's Contact No." required styles={styles}>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            value={captainContact}
            onChangeText={setCaptainContact}
          />
        </Field>

        {/* Course */}
        <Field label="Course" required styles={styles}>
          <TextInput
            style={styles.input}
            placeholder="e.g. B.Tech CSE, BBA, MBA…"
            placeholderTextColor={colors.textTertiary}
            value={course}
            onChangeText={setCourse}
          />
        </Field>

        {/* Year */}
        <Field label="Year" required styles={styles}>
          <TouchableOpacity style={styles.picker} onPress={() => setShowYearPicker(true)}>
            <Text style={year ? styles.pickerValue : styles.pickerPlaceholder}>
              {year || 'Select year…'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </Field>

        {/* Payment Proof */}
        {hasFee && (
          <Field label="Payment Proof (screenshot / PDF)" required styles={styles}>
            <Text style={styles.hint}>Attach screenshot of your payment transaction.</Text>
            <TouchableOpacity style={styles.fileBtn} onPress={pickProof}>
              {proofFile ? (
                <View style={styles.fileSelected}>
                  <Ionicons name={proofFile.mimeType === 'application/pdf' ? 'document-outline' : 'image-outline'} size={20} color={colors.primaryAccent} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={1}>{proofFile.name || 'payment_proof'}</Text>
                    {proofFile.size && (
                      <Text style={styles.fileSize}>{(proofFile.size / 1024).toFixed(0)} KB</Text>
                    )}
                  </View>
                  <Ionicons name="checkmark-circle" size={18} color="#34d399" />
                </View>
              ) : (
                <View style={styles.filePlaceholder}>
                  <Ionicons name="cloud-upload-outline" size={28} color={colors.textTertiary} />
                  <Text style={styles.filePlaceholderTxt}>Tap to attach proof</Text>
                  <Text style={styles.filePlaceholderSub}>Image or PDF · Max 5 MB</Text>
                </View>
              )}
            </TouchableOpacity>
          </Field>
        )}

        {/* Upload progress */}
        {submitting && uploadProgress > 0 && uploadProgress < 100 && (
          <View style={styles.progressBox}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={styles.progressTxt}>Uploading… {uploadProgress}%</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitOff]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#ffffff" />
            : <>
                <Ionicons name="trophy-outline" size={18} color="#ffffff" />
                <Text style={styles.submitTxt}>Submit Registration</Text>
              </>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Year picker modal */}
      <Modal visible={showYearPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowYearPicker(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Select Year</Text>
          {YEARS.map(y => (
            <TouchableOpacity
              key={y}
              style={[styles.yearRow, year === y && styles.yearRowActive]}
              onPress={() => { setYear(y); setShowYearPicker(false); }}
            >
              <Text style={[styles.yearTxt, year === y && styles.yearTxtActive]}>{y}</Text>
              {year === y && <Ionicons name="checkmark" size={16} color={colors.primaryAccent} />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SportRegistrationScreen;

// ─── Theme-Aware Style Generator ─────────────────────────────────────────────
const createStyles = (theme) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.headerDivider,
    backgroundColor: theme.header,
  },
  iconBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, color: theme.textMain, fontSize: 15, fontWeight: '700', textAlign: 'center', marginHorizontal: 4 },

  form: { padding: 16 },

  // Sport banner
  sportBanner:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.card, borderRadius: 14, padding: 14, marginBottom: 14, gap: 12, borderWidth: 1, borderColor: theme.cardAccent },
  sportBannerTitle: { fontSize: 14, fontWeight: '700', color: theme.textMain, lineHeight: 20 },
  sportBannerMeta:  { fontSize: 12, color: theme.textSub, marginTop: 3 },
  feeBadge:  { backgroundColor: theme.primaryAction + '26', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  feeTxt:    { fontSize: 14, color: theme.primaryAccent, fontWeight: '800' },

  // QR card
  qrCard:      { backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 14, gap: 8, borderWidth: 1, borderColor: theme.cardAccent },
  qrCardTitle: { fontSize: 14, fontWeight: '800', color: theme.textMain },
  qrCardSub:   { fontSize: 12, color: theme.textSub },
  qrWrapper:   { alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, padding: 12 }, // Kept hardcoded white for QR scan reliability
  qrImage:     { width: 190, height: 190 },
  qrNote:      { fontSize: 12, color: '#fbbf24', textAlign: 'center', lineHeight: 18 }, // Semantic amber

  sectionHeading: { fontSize: 13, fontWeight: '800', color: theme.primaryAccent, marginBottom: 12, marginTop: 4 },

  // Fields
  field:  { marginBottom: 14 },
  label:  { fontSize: 13, fontWeight: '700', color: theme.textSub, marginBottom: 6 },
  req:    { color: '#ef4444' }, // Semantic red
  hint:   { fontSize: 12, color: theme.textTertiary, marginBottom: 6, lineHeight: 17 },

  input: {
    backgroundColor: theme.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    color: theme.textMain,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  picker: {
    backgroundColor: theme.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerValue:       { flex: 1, color: theme.textMain, fontSize: 14 },
  pickerPlaceholder: { flex: 1, color: theme.textTertiary, fontSize: 14 },

  // File picker
  fileBtn:         { borderRadius: 12, borderWidth: 1, borderColor: theme.inputBorder, borderStyle: 'dashed', overflow: 'hidden', backgroundColor: theme.inputBg },
  fileSelected:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: theme.primaryAction + '1A' },
  fileName:        { fontSize: 13, color: theme.textMain, fontWeight: '600', flex: 1 },
  fileSize:        { fontSize: 11, color: theme.textTertiary, marginTop: 1 },
  filePlaceholder: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  filePlaceholderTxt: { fontSize: 13, color: theme.textSub, fontWeight: '600' },
  filePlaceholderSub: { fontSize: 11, color: theme.textTertiary },

  // Progress
  progressBox:  { marginBottom: 14 },
  progressBar:  { height: 4, backgroundColor: theme.cardAccent, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.primaryAction, borderRadius: 2 },
  progressTxt:  { fontSize: 11, color: theme.textSub, marginTop: 4, textAlign: 'center' },

  // Submit
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primaryAction, paddingVertical: 16, borderRadius: 14, marginTop: 8 },
  submitOff: { opacity: 0.6 },
  submitTxt: { color: '#ffffff', fontWeight: '800', fontSize: 16 }, // Contrast lock

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:   { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.cardAccent, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: theme.textMain, marginBottom: 12 },
  yearRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.background },
  yearRowActive: { backgroundColor: theme.primaryAction + '1A', marginHorizontal: -20, paddingHorizontal: 20 },
  yearTxt:       { fontSize: 15, color: theme.textSub },
  yearTxtActive: { color: theme.primaryAccent, fontWeight: '700' },
});