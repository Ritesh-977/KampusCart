import React, { useState } from 'react';
import Toast from 'react-native-toast-message';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';

const CATEGORIES = [
  { label: 'General',    icon: 'chatbox-outline' },
  { label: 'Bug Report', icon: 'bug-outline' },
  { label: 'Feature',    icon: 'bulb-outline' },
  { label: 'Other',      icon: 'ellipsis-horizontal-outline' },
];

const FeedbackScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('General');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Toast.show({
        type: 'error',
        text1: 'Rating required',
        text2: 'Please select a star rating before submitting.',
      });
      return;
    }
    if (message.trim().length < 10) {
      Toast.show({
        type: 'error',
        text1: 'Too short',
        text2: 'Please write at least 10 characters of feedback.',
      });
      return;
    }
    setSubmitting(true);
    try {
      await API.post('/feedback', { rating, category, message: message.trim() });
      Toast.show({
        type: 'success',
        text1: 'Thank you!',
        text2: 'Your feedback has been submitted.',
      });
      navigation.goBack();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Submission failed',
        text2: err.response?.data?.message || 'Please try again later.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View style={{ backgroundColor: theme.card, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(244,114,182,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="chatbox-ellipses-outline" size={26} color="#f472b6" />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: theme.textMain, marginBottom: 6 }}>Share Feedback</Text>
          <Text style={{ fontSize: 13, color: theme.textTertiary, lineHeight: 19 }}>
            Help us make KampusCart better. Your thoughts matter!
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>

          {/* Star Rating */}
          <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textMain, marginBottom: 14 }}>How would you rate your experience?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= rating ? '#fbbf24' : theme.inputBorder}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: theme.textTertiary }}>
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
              </Text>
            )}
          </View>

          {/* Category */}
          <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textMain, marginBottom: 12 }}>Feedback category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {CATEGORIES.map((c) => {
                const active = category === c.label;
                return (
                  <TouchableOpacity
                    key={c.label}
                    onPress={() => setCategory(c.label)}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: active ? '#f472b6' : theme.inputBorder,
                      backgroundColor: active ? 'rgba(244,114,182,0.12)' : theme.cardAccent,
                    }}
                  >
                    <Ionicons name={c.icon} size={15} color={active ? '#f472b6' : theme.textTertiary} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#f472b6' : theme.textTertiary }}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Message */}
          <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 18, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textMain, marginBottom: 10 }}>Tell us more</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your experience, report a bug, or suggest a feature..."
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={5}
              style={{
                backgroundColor: theme.cardAccent,
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                color: theme.textMain,
                minHeight: 120,
                textAlignVertical: 'top',
                borderWidth: 1,
                borderColor: theme.inputBorder,
              }}
            />
            <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 6, textAlign: 'right' }}>
              {message.length} / 500
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#f472b6',
              borderRadius: 14, paddingVertical: 15,
              alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
              opacity: submitting ? 0.7 : 1,
              shadowColor: '#f472b6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
            }}
          >
            {submitting
              ? <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
              : <Ionicons name="send-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            }
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
              {submitting ? 'Submitting…' : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default FeedbackScreen;
