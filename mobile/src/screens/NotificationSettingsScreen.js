import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Switch, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';
import Toast from 'react-native-toast-message';

const SETTINGS = [
  { key: 'items',     label: 'New Listings',      icon: 'pricetag-outline',           desc: 'When someone lists an item on campus' },
  { key: 'lostFound', label: 'Lost & Found',       icon: 'search-circle-outline',      desc: 'When a lost or found item is reported' },
  { key: 'events',    label: 'Campus Events',      icon: 'calendar-outline',           desc: 'When a new event is posted' },
  { key: 'sports',    label: 'Sports',             icon: 'football-outline',           desc: 'New sports events and registrations' },
  { key: 'messages',  label: 'Messages',           icon: 'chatbubble-ellipses-outline', desc: 'When you receive a new message' },
];

const DEFAULT_PREFS = { all: true, items: true, lostFound: true, events: true, sports: true, messages: true };

const NotificationSettingsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/users/notification-prefs')
      .then(res => setPrefs({ ...DEFAULT_PREFS, ...res.data }))
      .catch(() => setPrefs(DEFAULT_PREFS))
      .finally(() => setLoading(false));
  }, []);

  const save = async (newPrefs) => {
    setSaving(true);
    try {
      await API.put('/users/notification-prefs', { prefs: newPrefs });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save', text2: 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key) => {
    let newPrefs;
    if (key === 'all') {
      const newAll = !prefs.all;
      newPrefs = { ...prefs, all: newAll };
    } else {
      newPrefs = { ...prefs, [key]: !prefs[key] };
    }
    setPrefs(newPrefs);
    save(newPrefs);
  };

  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingTop: Platform.OS === 'android' ? 48 : 16,
      paddingBottom: 14, paddingHorizontal: 16,
      backgroundColor: theme.header,
      borderBottomWidth: 1, borderBottomColor: theme.headerDivider,
    },
    backBtn: { marginRight: 12, padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: theme.textMain },
    section: { marginTop: 24, paddingHorizontal: 16 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
    card: { backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.cardAccent, overflow: 'hidden', marginBottom: 24 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.cardAccent },
    rowLast: { borderBottomWidth: 0 },
    iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    rowText: { flex: 1 },
    rowLabel: { fontSize: 15, fontWeight: '600', color: theme.textMain },
    rowDesc: { fontSize: 12, color: theme.textSub, marginTop: 2 },
  });

  if (loading) {
    return (
      <View style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primaryAction} />
      </View>
    );
  }

  const allDisabled = prefs.all === false;

  return (
    <View style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.textMain} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        {saving && <ActivityIndicator size="small" color={theme.primaryAction} style={{ marginLeft: 'auto' }} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Master toggle */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>General</Text>
          <View style={s.card}>
            <View style={[s.row, s.rowLast]}>
              <View style={[s.iconBox, { backgroundColor: `${theme.primaryAction}20` }]}>
                <Ionicons name="notifications-outline" size={20} color={theme.primaryAction} />
              </View>
              <View style={s.rowText}>
                <Text style={s.rowLabel}>All Notifications</Text>
                <Text style={s.rowDesc}>Turn off to silence everything</Text>
              </View>
              <Switch
                value={prefs.all !== false}
                onValueChange={() => toggle('all')}
                trackColor={{ false: theme.cardAccent, true: theme.primaryAction }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Per-type toggles */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Notification Types</Text>
          <View style={s.card}>
            {SETTINGS.map((item, idx) => {
              const isLast = idx === SETTINGS.length - 1;
              const enabled = !allDisabled && prefs[item.key] !== false;
              return (
                <View key={item.key} style={[s.row, isLast && s.rowLast, allDisabled && { opacity: 0.45 }]}>
                  <View style={[s.iconBox, { backgroundColor: `${theme.secondaryAccent}20` }]}>
                    <Ionicons name={item.icon} size={20} color={theme.secondaryAccent} />
                  </View>
                  <View style={s.rowText}>
                    <Text style={s.rowLabel}>{item.label}</Text>
                    <Text style={s.rowDesc}>{item.desc}</Text>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={() => !allDisabled && toggle(item.key)}
                    trackColor={{ false: theme.cardAccent, true: theme.primaryAction }}
                    thumbColor="#fff"
                    disabled={allDisabled}
                  />
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </View>
  );
};

export default NotificationSettingsScreen;
