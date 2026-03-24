import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, ScrollView, TextInput, Alert, ActivityIndicator,
  Modal, Image, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import { useThemeStyles } from '../hooks/useThemeStyles'; // <-- Update path as needed

const SPORT_TYPES = [
  { label: 'Cricket',      emoji: '🏏' },
  { label: 'Football',     emoji: '⚽' },
  { label: 'Basketball',   emoji: '🏀' },
  { label: 'Volleyball',   emoji: '🏐' },
  { label: 'Badminton',    emoji: '🏸' },
  { label: 'Table Tennis', emoji: '🏓' },
  { label: 'Chess',        emoji: '♟️' },
  { label: 'Athletics',    emoji: '🏃' },
  { label: 'Kabaddi',      emoji: '🤼' },
  { label: 'Other',        emoji: '🏆' },
];

const fmtDate = (d) =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// ── FIXED: Moved Field component OUTSIDE the main screen component ──────────
// Added `styles` as a prop so it can access the dynamic theme safely
const Field = ({ label, children, optional, styles }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>
      {label}{optional ? <Text style={styles.optional}> (optional)</Text> : <Text style={styles.required}> *</Text>}
    </Text>
    {children}
  </View>
);
// ─────────────────────────────────────────────────────────────────────────────

const PostSportScreen = ({ navigation, route }) => {
  // 1. Initialize dynamic theme hook
  const { styles, colors } = useThemeStyles(createStyles);

  const { currentUser } = useContext(AuthContext);
  const editSport = route.params?.sport;
  const isEdit    = !!editSport;

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title,          setTitle]          = useState(editSport?.title          || '');
  const [sportType,      setSportType]      = useState(editSport?.sportType      || '');
  const [description,    setDescription]    = useState(editSport?.description    || '');
  const [venue,          setVenue]          = useState(editSport?.venue          || '');
  const [organizerPhone, setOrganizerPhone] = useState(editSport?.organizer?.phone || '');
  const [teamSize,       setTeamSize]       = useState(String(editSport?.teamSize || '1'));
  const [maxTeams,       setMaxTeams]       = useState(editSport?.maxTeams ? String(editSport.maxTeams) : '');
  const [fee,            setFee]            = useState(String(editSport?.registrationFee || '0'));
  const [rules,          setRules]          = useState(editSport?.rules          || '');

  // Dates
  const [eventDate,    setEventDate]    = useState(editSport ? new Date(editSport.eventDate) : new Date(Date.now() + 7 * 86400000));
  const [deadline,     setDeadline]     = useState(editSport ? new Date(editSport.lastRegistrationDate) : new Date(Date.now() + 5 * 86400000));
  const [showEventDP,  setShowEventDP]  = useState(false);
  const [showDeadDP,   setShowDeadDP]   = useState(false);

  // QR code
  const [qrUri,   setQrUri]   = useState(null);    // new image selected
  const [existingQr, setExistingQr] = useState(editSport?.qrCodeUrl || '');

  // UI
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [submitting,     setSubmitting]     = useState(false);

  // ── QR code picker ──────────────────────────────────────────────────────────
  const pickQR = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Allow photo access to upload QR code.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets?.[0] ?? result;
      setQrUri(asset.uri);
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim())   { Alert.alert('Missing', 'Please enter a title.');      return; }
    if (!sportType)      { Alert.alert('Missing', 'Please select a sport type.'); return; }
    if (!venue.trim())   { Alert.alert('Missing', 'Please enter the venue.');    return; }
    if (eventDate <= new Date() && !isEdit) {
      Alert.alert('Invalid', 'Event date must be in the future.'); return;
    }
    if (deadline >= eventDate) {
      Alert.alert('Invalid', 'Registration deadline must be before the event date.'); return;
    }

    try {
      setSubmitting(true);
      const form = new FormData();
      form.append('title',               title.trim());
      form.append('sportType',           sportType);
      form.append('description',         description.trim());
      form.append('venue',               venue.trim());
      form.append('eventDate',           eventDate.toISOString());
      form.append('lastRegistrationDate', deadline.toISOString());
      form.append('teamSize',            teamSize || '1');
      form.append('registrationFee',     fee || '0');
      form.append('organizerPhone',      organizerPhone.trim());
      form.append('rules',               rules.trim());
      if (maxTeams.trim()) form.append('maxTeams', maxTeams.trim());

      // Attach new QR image if selected
      if (qrUri) {
        form.append('qrCode', {
          uri:  Platform.OS === 'android' ? qrUri : qrUri.replace('file://', ''),
          name: `qr_${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
      }

      if (isEdit) {
        await API.put(`/sports/${editSport._id}`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('Updated!', 'Sport event updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await API.post('/sports', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('Posted!', 'Your sport event has been posted on your campus.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e) {
      const msg = e?.response?.data?.message || 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType = SPORT_TYPES.find(t => t.label === sportType);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.header} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Sport Event' : 'Post Sport Event'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Sport type */}
        <Field label="Sport Type" styles={styles}>
          <TouchableOpacity style={styles.picker} onPress={() => setShowTypePicker(true)}>
            {selectedType
              ? <Text style={styles.pickerValue}>{selectedType.emoji}  {selectedType.label}</Text>
              : <Text style={styles.pickerPlaceholder}>Select sport type…</Text>
            }
            <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </Field>

        {/* Title */}
        <Field label="Title" styles={styles}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Inter-Branch Cricket Tournament"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
        </Field>

        {/* Venue */}
        <Field label="Venue" styles={styles}>
          <TextInput
            style={styles.input}
            placeholder="e.g. College Ground, Sector 5"
            placeholderTextColor={colors.textTertiary}
            value={venue}
            onChangeText={setVenue}
          />
        </Field>

        {/* Event Date */}
        <Field label="Event Date" styles={styles}>
          <TouchableOpacity style={styles.picker} onPress={() => setShowEventDP(true)}>
            <Ionicons name="calendar-outline" size={16} color={colors.textTertiary} />
            <Text style={styles.pickerValue}>{fmtDate(eventDate)}</Text>
          </TouchableOpacity>
          {showEventDP && (
            <DateTimePicker
              value={eventDate}
              mode="date"
              minimumDate={new Date()}
              textColor={colors.textMain} // Improves visibility on iOS picker
              onChange={(_, d) => { setShowEventDP(false); if (d) setEventDate(d); }}
            />
          )}
        </Field>

        {/* Registration Deadline */}
        <Field label="Registration Deadline" styles={styles}>
          <TouchableOpacity style={styles.picker} onPress={() => setShowDeadDP(true)}>
            <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
            <Text style={styles.pickerValue}>{fmtDate(deadline)}</Text>
          </TouchableOpacity>
          {showDeadDP && (
            <DateTimePicker
              value={deadline}
              mode="date"
              minimumDate={new Date()}
              maximumDate={eventDate}
              textColor={colors.textMain} // Improves visibility on iOS picker
              onChange={(_, d) => { setShowDeadDP(false); if (d) setDeadline(d); }}
            />
          )}
        </Field>

        {/* Team size + Max teams */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Team Size <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              value={teamSize}
              onChangeText={setTeamSize}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Max Teams <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="No limit"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              value={maxTeams}
              onChangeText={setMaxTeams}
            />
          </View>
        </View>

        {/* Registration Fee */}
        <Field label="Registration Fee (₹)" styles={styles}>
          <TextInput
            style={styles.input}
            placeholder="0 for free"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            value={fee}
            onChangeText={setFee}
          />
        </Field>

        {/* Payment QR */}
        <Field label="Payment QR Code" optional styles={styles}>
          <Text style={styles.fieldHint}>
            Upload a QR code image so participants can pay the fee before registering.
          </Text>
          <TouchableOpacity style={styles.qrPickerBtn} onPress={pickQR}>
            {qrUri || existingQr ? (
              <Image source={{ uri: qrUri || existingQr }} style={styles.qrPreview} resizeMode="contain" />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={36} color={colors.textTertiary} />
                <Text style={styles.qrPlaceholderTxt}>Tap to upload QR code</Text>
              </View>
            )}
          </TouchableOpacity>
          {(qrUri || existingQr) && (
            <TouchableOpacity onPress={() => { setQrUri(null); setExistingQr(''); }}>
              <Text style={styles.removeLink}>Remove QR code</Text>
            </TouchableOpacity>
          )}
        </Field>

        {/* Organizer Phone */}
        <Field label="Your Contact Number" styles={styles}>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            value={organizerPhone}
            onChangeText={setOrganizerPhone}
          />
        </Field>

        {/* Description */}
        <Field label="Description" optional styles={styles}>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Brief overview of the tournament…"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />
        </Field>

        {/* Rules */}
        <Field label="Rules & Guidelines" optional styles={styles}>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="List the rules, eligibility criteria, etc."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            value={rules}
            onChangeText={setRules}
          />
        </Field>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnOff]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#ffffff" />
            : <>
                <Ionicons name="trophy-outline" size={18} color="#ffffff" />
                <Text style={styles.submitTxt}>{isEdit ? 'Save Changes' : 'Post Sport Event'}</Text>
              </>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sport Type Picker Modal */}
      <Modal visible={showTypePicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTypePicker(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select Sport Type</Text>
          <View style={styles.typeGrid}>
            {SPORT_TYPES.map(t => (
              <TouchableOpacity
                key={t.label}
                style={[styles.typeItem, sportType === t.label && styles.typeItemActive]}
                onPress={() => { setSportType(t.label); setShowTypePicker(false); }}
              >
                <Text style={styles.typeEmoji}>{t.emoji}</Text>
                <Text style={[styles.typeLabel, sportType === t.label && styles.typeLabelActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default PostSportScreen;

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
  headerTitle: { flex: 1, color: theme.textMain, fontSize: 17, fontWeight: '700', textAlign: 'center' },

  form: { padding: 16 },
  row:  { flexDirection: 'row', gap: 12 },

  field:       { marginBottom: 16 },
  fieldLabel:  { fontSize: 13, fontWeight: '700', color: theme.textSub, marginBottom: 6 },
  required:    { color: '#ef4444' }, // Kept semantic red for required fields
  optional:    { color: theme.textTertiary, fontWeight: '500' },
  fieldHint:   { fontSize: 12, color: theme.textTertiary, marginBottom: 8, lineHeight: 17 },

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
  multiline: { height: 90, textAlignVertical: 'top', paddingTop: 12 },

  picker: {
    backgroundColor: theme.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerValue:       { flex: 1, color: theme.textMain, fontSize: 14 },
  pickerPlaceholder: { flex: 1, color: theme.textTertiary, fontSize: 14 },

  // QR
  qrPickerBtn:    { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.inputBorder, borderStyle: 'dashed' },
  qrPreview:      { width: '100%', height: 160, backgroundColor: theme.cardAccent }, // Off-white/gray base for transparent images
  qrPlaceholder:  { height: 120, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: theme.inputBg },
  qrPlaceholderTxt: { fontSize: 13, color: theme.textTertiary },
  removeLink:     { fontSize: 12, color: '#ef4444', marginTop: 6, textAlign: 'center' }, // Kept semantic red for destructive action

  // Submit
  submitBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primaryAction, paddingVertical: 16, borderRadius: 14, marginTop: 8 },
  submitBtnOff: { opacity: 0.6 },
  submitTxt:    { color: '#ffffff', fontWeight: '800', fontSize: 16 }, // Contrast lock

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet:   { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.cardAccent, alignSelf: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 16, fontWeight: '800', color: theme.textMain, marginBottom: 16 },
  typeGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeItem:     { width: '18%', alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.cardAccent, backgroundColor: theme.background, flexGrow: 1 },
  typeItemActive: { borderColor: theme.primaryAction, backgroundColor: theme.primaryAction + '1A' }, // 10% opacity tint
  typeEmoji:    { fontSize: 24, marginBottom: 4 },
  typeLabel:    { fontSize: 10, color: theme.textSub, fontWeight: '600', textAlign: 'center' },
  typeLabelActive: { color: theme.primaryAccent },
});