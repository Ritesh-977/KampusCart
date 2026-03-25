import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const SECTIONS = [
  {
    icon: 'person-outline',
    title: 'Information We Collect',
    body: 'We collect the information you provide when you register — including your name, college email, phone number, and profile picture. We also collect data about items you list, messages you send, and your activity within the app to provide and improve our services.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'How We Use Your Data',
    body: 'Your information is used solely to operate KampusCart — to show your profile, enable buying and selling, deliver in-app messages, and personalise your experience. We do not sell your data to third parties.',
  },
  {
    icon: 'image-outline',
    title: 'Profile & Listing Images',
    body: 'Images you upload are stored securely on our servers (Cloudinary). They are visible to other users within the app as part of your profile or item listings. You can update or delete them at any time from your profile.',
  },
  {
    icon: 'chatbubble-outline',
    title: 'Messages',
    body: 'Chat messages between buyers and sellers are stored to provide a seamless messaging experience. They are not read or shared by KampusCart staff unless required for resolving reported abuse.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Data Security',
    body: 'We use industry-standard security measures including HTTPS, hashed passwords, and JWT / cookie-based authentication to protect your account. No system is 100% secure, but we work hard to keep your data safe.',
  },
  {
    icon: 'trash-outline',
    title: 'Account Deletion',
    body: 'You may request deletion of your account and associated data at any time by contacting us. Upon deletion, your profile, listings, and messages will be permanently removed from our systems.',
  },
  {
    icon: 'refresh-outline',
    title: 'Policy Updates',
    body: 'We may update this Privacy Policy from time to time. When we do, we will notify you via the App Updates section. Continued use of KampusCart after changes constitutes acceptance of the revised policy.',
  },
];

const PrivacyPolicyScreen = () => {
  const { theme } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header card */}
      <View style={{ backgroundColor: theme.card, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(52,211,153,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name="shield-checkmark-outline" size={26} color="#34d399" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '900', color: theme.textMain, marginBottom: 6 }}>Privacy Policy</Text>
        <Text style={{ fontSize: 13, color: theme.textTertiary, lineHeight: 19 }}>
          Last updated: March 2025{'\n'}We respect your privacy. Here's exactly how we handle your data.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        {SECTIONS.map((s, i) => (
          <View key={i} style={{ backgroundColor: theme.card, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(52,211,153,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                <Ionicons name={s.icon} size={17} color="#34d399" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textMain, flex: 1 }}>{s.title}</Text>
            </View>
            <Text style={{ fontSize: 13, color: theme.textTertiary, lineHeight: 20 }}>{s.body}</Text>
          </View>
        ))}

        <Text style={{ fontSize: 12, color: theme.textTertiary, textAlign: 'center', marginTop: 8, lineHeight: 18 }}>
          Questions? Contact us at{' '}
          <Text style={{ color: theme.primaryAction, fontWeight: '600' }}>support@kampuscart.in</Text>
        </Text>
      </View>
    </ScrollView>
  );
};

export default PrivacyPolicyScreen;
