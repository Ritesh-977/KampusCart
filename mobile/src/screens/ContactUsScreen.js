import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const open = (url) => {
  Linking.canOpenURL(url)
    .then((supported) => {
      if (supported) Linking.openURL(url);
      else Alert.alert('Cannot open', 'Unable to open this link on your device.');
    })
    .catch(() => Alert.alert('Error', 'Something went wrong.'));
};

const CONTACTS = [
  {
    icon: 'mail-outline',
    label: 'Email Us',
    value: 'support@kampuscart.site',
    sub: 'We reply within 24 hours',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.15)',
    url: 'mailto:support@kampuscart.site',
  },
  {
    icon: 'logo-instagram',
    label: 'Instagram',
    value: '@kampuscart',
    sub: 'DM us for quick support',
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.15)',
    url: 'https://instagram.com/kampuscart',
  },
  {
    icon: 'logo-linkedin',
    label: 'LinkedIn',
    value: 'KampusCart',
    sub: 'Follow our company page',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.15)',
    url: 'https://linkedin.com/company/kampuscart',
  },
];

const FAQ = [
  {
    q: 'How do I report a suspicious listing?',
    a: 'You will find a "Report" option on any listing and select it. Our team reviews it within 24 hours.',
  },
  {
    q: 'My payment didn\'t go through. What do I do?',
    a: 'KampusCart does not handle payments directly — transactions happen between buyer and seller. Contact the other party or email us if you need help.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Email us at support@kampuscart.site with subject "Account Deletion" from your registered email and we will process it within 3 business days.',
  },
  {
    q: 'Can I list items from outside my college?',
    a: 'KampusCart is designed for campus communities. Listings should be relevant to college students in your campus area.',
  },
];

const ContactUsScreen = () => {
  const { theme } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header card */}
      <View style={{ backgroundColor: theme.card, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(251,146,60,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name="call-outline" size={26} color="#fb923c" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '900', color: theme.textMain, marginBottom: 6 }}>Contact Us</Text>
        <Text style={{ fontSize: 13, color: theme.textTertiary, lineHeight: 19 }}>
          We'd love to hear from you. Reach out any time!
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20 }}>

        {/* Contact channels */}
        <Text style={{ fontSize: 15, fontWeight: '800', color: theme.textMain, marginBottom: 12 }}>Reach us on</Text>
        {CONTACTS.map((c) => (
          <TouchableOpacity
            key={c.label}
            onPress={() => open(c.url)}
            activeOpacity={0.75}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
              <Ionicons name={c.icon} size={22} color={c.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textMain }}>{c.label}</Text>
              <Text style={{ fontSize: 13, color: c.color, fontWeight: '600', marginTop: 1 }}>{c.value}</Text>
              <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 1 }}>{c.sub}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={theme.textTertiary} />
          </TouchableOpacity>
        ))}

        {/* Business hours */}
        <View style={{ backgroundColor: theme.card, borderRadius: 14, padding: 16, marginTop: 8, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Swapped to a green headset icon for an "Always Online" feel */}
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(16, 185, 129, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
              <Ionicons name="headset-outline" size={22} color="#10b981" />
            </View>
            
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textMain, marginBottom: 2 }}>
                Available 24/7
              </Text>
              <Text style={{ fontSize: 13, color: theme.textTertiary, lineHeight: 18 }}>
                Campus never sleeps, and neither do we. Reach out anytime you need help!
              </Text>
            </View>
          </View>
        </View>

        {/* FAQ */}
        <Text style={{ fontSize: 15, fontWeight: '800', color: theme.textMain, marginBottom: 12 }}>Frequently Asked</Text>
        {FAQ.map((item, i) => (
          <View key={i} style={{ backgroundColor: theme.card, borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(251,146,60,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 1, flexShrink: 0 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#fb923c' }}>Q</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: theme.textMain, lineHeight: 19 }}>{item.q}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: `${theme.primaryAction}18`, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 1, flexShrink: 0 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: theme.primaryAction }}>A</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: theme.textTertiary, lineHeight: 19 }}>{item.a}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default ContactUsScreen;
