import React, { useState, useContext } from 'react';
import Toast from 'react-native-toast-message';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Platform,
  KeyboardAvoidingView, SafeAreaView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { useThemeStyles } from '../hooks/useThemeStyles'; // <-- Make sure path is correct

// Hardcoded accent colors specifically for the event cards
const COLORS = [
  '#6366f1', '#818cf8', '#34d399', '#f472b6',
  '#fbbf24', '#38bdf8', '#fb923c', '#a78bfa',
];

const formatDisplay = (date) =>
  date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

const PostEventScreen = ({ navigation, route }) => {
  // 1. Initialize dynamic theme hook
  const { styles, colors } = useThemeStyles(createStyles);

  const { currentUser } = useContext(AuthContext);
  const existing = route.params?.event || null;          // present when editing
  const college  = route.params?.college || existing?.college || currentUser?.college || '';
  const isEdit   = !!existing;

  const [title, setTitle]           = useState(existing?.title || '');
  const [description, setDesc]      = useState(existing?.description || '');
  const [location, setLocation]     = useState(existing?.location || '');
  const [duration, setDuration]     = useState(String(existing?.duration ?? 60));
  const [color, setColor]           = useState(existing?.color || COLORS[0]);
  const [date, setDate]             = useState(() => {
    if (existing?.startTime) return new Date(existing.startTime);
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  const [submitting, setSubmitting] = useState(false);

  // DateTimePicker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date'); // 'date' | 'time'

  const openDatePicker = () => {
    setPickerMode('date');
    setShowPicker(true);
  };

  const onPickerChange = (event, selected) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'dismissed') return;
      const picked = selected || date;
      if (pickerMode === 'date') {
        const merged = new Date(date);
        merged.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
        setDate(merged);
        // Auto-open time picker next
        setTimeout(() => { setPickerMode('time'); setShowPicker(true); }, 100);
      } else {
        const merged = new Date(date);
        merged.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
        setDate(merged);
      }
    } else {
      // iOS — update live as user scrolls
      if (selected) setDate(selected);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim())    { Toast.show({ type: 'error', text1: 'Missing', text2: 'Please enter a title.' }); return; }
    if (!location.trim()) { Toast.show({ type: 'error', text1: 'Missing', text2: 'Please enter a location.' }); return; }
    if (!isEdit && date < new Date()) { Toast.show({ type: 'error', text1: 'Invalid Date', text2: 'Event date must be in the future.' }); return; }

    const payload = {
      title:       title.trim(),
      description: description.trim(),
      location:    location.trim(),
      startTime:   date.toISOString(),
      duration:    parseInt(duration, 10) || 60,
      color,
    };

    try {
      setSubmitting(true);
      if (isEdit) {
        await API.put(`/events/${existing._id}`, payload);
        Toast.show({ type: 'success', text1: 'Saved', text2: 'Your changes have been saved.' });
        navigation.goBack();
      } else {
        await API.post('/events', payload);
        Toast.show({ type: 'success', text1: 'Posted', text2: 'Your event has been published to the campus feed.' });
        navigation.goBack();
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err?.response?.data?.message || 'Could not save event.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Event' : 'Post Event'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Campus tag */}
          <View style={styles.campusTag}>
            <Ionicons name="location-outline" size={14} color={colors.primaryAccent} />
            <Text style={styles.campusText}>{college}</Text>
          </View>

          {/* Title */}
          <Text style={styles.label}>Event Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Annual Tech Fest"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="What's this event about?"
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDesc}
            multiline
            numberOfLines={4}
            maxLength={400}
          />

          {/* Location */}
          <Text style={styles.label}>Venue / Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Main Auditorium, LT-1"
            placeholderTextColor={colors.textTertiary}
            value={location}
            onChangeText={setLocation}
            maxLength={100}
          />

          {/* Date & Time */}
          <Text style={styles.label}>Date & Time *</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={openDatePicker}>
            <Ionicons name="calendar-outline" size={18} color={colors.primaryAccent} />
            <Text style={styles.dateBtnText}>{formatDisplay(date)}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* iOS inline picker */}
          {Platform.OS === 'ios' && (
            <DateTimePicker
              value={date}
              mode="datetime"
              display="spinner"
              onChange={onPickerChange}
              minimumDate={new Date()}
              style={styles.iosPicker}
              textColor={colors.textMain}
            />
          )}

          {/* Android picker (shown on demand) */}
          {Platform.OS === 'android' && showPicker && (
            <DateTimePicker
              value={date}
              mode={pickerMode}
              display="default"
              onChange={onPickerChange}
              minimumDate={pickerMode === 'date' ? new Date() : undefined}
            />
          )}

          {/* Duration */}
          <Text style={styles.label}>Duration (minutes)</Text>
          <TextInput
            style={styles.input}
            placeholder="60"
            placeholderTextColor={colors.textTertiary}
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            maxLength={4}
          />

          {/* Color picker */}
          <Text style={styles.label}>Event Color</Text>
          <View style={styles.colorRow}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  color === c && styles.colorSelected,
                ]}
              >
                {color === c && <Ionicons name="checkmark" size={14} color="#ffffff" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Organizer info note */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primaryAccent} />
            <Text style={styles.infoText}>
              Your name and phone number will be shown as the organizer so students can contact you.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#ffffff" />
              : <>
                  <Ionicons name="megaphone-outline" size={18} color="#ffffff" />
                  <Text style={styles.submitText}>{isEdit ? 'Save Changes' : 'Publish Event'}</Text>
                </>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Theme-Aware Style Generator ─────────────────────────────────────────────
const createStyles = (theme) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 12,
    paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: theme.headerDivider,
    backgroundColor: theme.header,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: theme.textMain },

  form: { padding: 20, paddingBottom: 40 },

  campusTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.primaryAction + '15',
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: theme.primaryAction + '40',
    marginBottom: 24,
  },
  campusText: { fontSize: 13, color: theme.primaryAccent, fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '700', color: theme.textSub, marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },

  input: {
    backgroundColor: theme.inputBg, color: theme.textMain,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, borderWidth: 1, borderColor: theme.inputBorder,
  },
  multiline: { height: 100, textAlignVertical: 'top', paddingTop: 14 },

  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.inputBg, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: theme.inputBorder,
  },
  dateBtnText: { flex: 1, color: theme.textMain, fontSize: 15 },
  iosPicker: { marginTop: 8 },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  colorSelected: {
    borderWidth: 3, borderColor: '#ffffff', // Always white so it stands out against any selected swatch color
    shadowColor: theme.textMain, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: theme.primaryAction + '10',
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: theme.primaryAction + '30',
    marginTop: 24,
  },
  infoText: { flex: 1, fontSize: 13, color: theme.textSub, lineHeight: 18 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.primaryAction, borderRadius: 14,
    paddingVertical: 16, marginTop: 28,
  },
  submitText: { color: theme.textOnPrimary || '#ffffff', fontWeight: '800', fontSize: 16 }, // Contrast lock for buttons
});

export default PostEventScreen;