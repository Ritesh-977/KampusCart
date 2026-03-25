import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const TERMS = [
  {
    icon: 'person-add-outline',
    title: '1. Eligibility',
    body: 'KampusCart is available exclusively to enrolled students and staff of registered colleges. By creating an account, you confirm that you are a verified member of your institution and that the information you provide is accurate.',
  },
  {
    icon: 'pricetag-outline',
    title: '2. Listings & Selling',
    body: 'You may list only items you own and have the right to sell. Prohibited items include illegal goods, counterfeit products, prescription drugs, weapons, and any content that violates applicable laws or university policies. KampusCart reserves the right to remove any listing at its discretion.',
  },
  {
    icon: 'handshake-outline',
    title: '3. Transactions',
    body: 'All transactions are conducted directly between buyers and sellers. KampusCart is a platform only and is not a party to any transaction. We are not responsible for the quality, safety, or legality of listed items, or the truth or accuracy of any listing.',
  },
  {
    icon: 'chatbubble-ellipses-outline',
    title: '4. User Conduct',
    body: 'You agree not to harass, threaten, or deceive other users. Spam, phishing, or any form of fraudulent activity is strictly prohibited. Violations may result in immediate account suspension and, where necessary, reporting to college authorities.',
  },
  {
    icon: 'image-outline',
    title: '5. Content Ownership',
    body: 'You retain ownership of content you post (photos, descriptions, messages). By posting, you grant KampusCart a non-exclusive, royalty-free licence to display and use that content within the app for service delivery purposes.',
  },
  {
    icon: 'alert-circle-outline',
    title: '6. Limitation of Liability',
    body: 'KampusCart is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the app, failed transactions, or disputes between users. Use the platform at your own risk.',
  },
  {
    icon: 'close-circle-outline',
    title: '7. Termination',
    body: 'We reserve the right to suspend or terminate your account for violations of these Terms, with or without prior notice. You may delete your account at any time; such deletion does not negate obligations arising from prior activity.',
  },
  {
    icon: 'document-text-outline',
    title: '8. Changes to Terms',
    body: 'KampusCart may revise these Terms at any time. Continued use of the app after changes are published constitutes your acceptance. We will notify you of significant changes through the in-app App Updates section.',
  },
];

const TermsOfUseScreen = () => {
  const { theme } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header card */}
      <View style={{ backgroundColor: theme.card, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(251,191,36,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name="document-text-outline" size={26} color="#fbbf24" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '900', color: theme.textMain, marginBottom: 6 }}>Terms of Use</Text>
        <Text style={{ fontSize: 13, color: theme.textTertiary, lineHeight: 19 }}>
          Last updated: March 2025{'\n'}Please read these terms carefully before using KampusCart.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        {TERMS.map((t, i) => (
          <View key={i} style={{ backgroundColor: theme.card, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(251,191,36,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                <Ionicons name={t.icon} size={17} color="#fbbf24" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textMain, flex: 1 }}>{t.title}</Text>
            </View>
            <Text style={{ fontSize: 13, color: theme.textTertiary, lineHeight: 20 }}>{t.body}</Text>
          </View>
        ))}

        <Text style={{ fontSize: 12, color: theme.textTertiary, textAlign: 'center', marginTop: 8, lineHeight: 18 }}>
          For queries about these Terms, reach us at{' '}
          <Text style={{ color: theme.primaryAction, fontWeight: '600' }}>legal@kampuscart.in</Text>
        </Text>
      </View>
    </ScrollView>
  );
};

export default TermsOfUseScreen;
