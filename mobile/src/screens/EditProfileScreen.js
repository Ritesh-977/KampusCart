import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Image, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import API from '../api/axios';

const EditProfileScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  
  // Grab the current profile data passed from ProfileScreen
  const { userProfile } = route.params;

  const [name, setName] = useState(userProfile.name || '');
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [year, setYear] = useState(userProfile.year || '');
  
  const [profilePicUri, setProfilePicUri] = useState(userProfile.profilePic || null);
  const [coverImageUri, setCoverImageUri] = useState(userProfile.coverImage || null);
  
  const [loading, setLoading] = useState(false);

  // Reusable Image Picker Function
  const pickImage = async (isCoverPhoto = false) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.granted === false) {
      Alert.alert("Permission Required", "Allow access to photos to change your pictures.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: isCoverPhoto ? [16, 9] : [1, 1], // Widescreen for cover, square for avatar
      quality: 0.7, 
    });

    if (!result.canceled) {
      if (isCoverPhoto) setCoverImageUri(result.assets[0].uri);
      else setProfilePicUri(result.assets[0].uri);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);
      formData.append('year', year);

      // Check if a NEW profile pic was selected (it will start with 'file://' instead of 'http')
      if (profilePicUri && !profilePicUri.startsWith('http')) {
        let filename = profilePicUri.split('/').pop();
        let match = /\.(\w+)$/.exec(filename);
        let type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('profilePic', { uri: profilePicUri, name: filename, type });
      }

      // Check if a NEW cover photo was selected
      if (coverImageUri && !coverImageUri.startsWith('http')) {
        let filename = coverImageUri.split('/').pop();
        let match = /\.(\w+)$/.exec(filename);
        let type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('coverImage', { uri: coverImageUri, name: filename, type });
      }

      // Hit your backend route!
      const response = await API.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert("Success", "Profile updated successfully!");
      navigation.goBack(); // Return to the beautifully updated Profile Screen

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not update profile.");
    } finally {
      setLoading(false);
    }
  };

  const displayCover = coverImageUri 
    ? { uri: coverImageUri } 
    : { uri: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80' };
  
  const displayAvatar = profilePicUri 
    ? { uri: profilePicUri } 
    : { uri: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
      <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
        
        {/* Cover Photo Editor */}
        <TouchableOpacity style={{ height: 180, width: '100%', backgroundColor: theme.card, position: 'relative' }} onPress={() => pickImage(true)}>
          <Image source={displayCover} style={{ width: '100%', height: '100%' }} />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="camera" size={28} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: 'bold', marginTop: 5 }}>Change Cover</Text>
          </View>
        </TouchableOpacity>

        {/* Profile Avatar Editor */}
        <View style={{ alignItems: 'center', marginTop: -60, marginBottom: 20 }}>
          <TouchableOpacity style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: theme.background, backgroundColor: theme.cardAccent, overflow: 'hidden', position: 'relative' }} onPress={() => pickImage(false)}>
            <Image source={displayAvatar} style={{ width: '100%', height: '100%' }} />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', height: 35, alignItems: 'center', paddingTop: 3 }}>
              <Ionicons name="camera" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Form Inputs */}
        <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textSub, marginBottom: 8 }}>Full Name</Text>
            <TextInput style={{ backgroundColor: theme.cardAccent, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 10, padding: 14, fontSize: 16, color: theme.textMain }} value={name} onChangeText={setName} placeholderTextColor={theme.textTertiary} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ marginBottom: 20, flex: 1, marginRight: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textSub, marginBottom: 8 }}>Phone Number</Text>
              <TextInput style={{ backgroundColor: theme.cardAccent, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 10, padding: 14, fontSize: 16, color: theme.textMain }} keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholderTextColor={theme.textTertiary} />
            </View>
            <View style={{ marginBottom: 20, flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textSub, marginBottom: 8 }}>Academic Year</Text>
              <TextInput style={{ backgroundColor: theme.cardAccent, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: 10, padding: 14, fontSize: 16, color: theme.textMain }} placeholder="e.g. 3rd Year" placeholderTextColor={theme.textTertiary} value={year} onChangeText={setYear} />
            </View>
          </View>

          <TouchableOpacity style={{ backgroundColor: theme.primaryAction, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40, shadowColor: theme.primaryAction, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 }} onPress={handleUpdateProfile} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: theme.textOnPrimary || '#ffffff', fontSize: 18, fontWeight: 'bold' }}>Save Profile</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default EditProfileScreen;