import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Image, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';

const EditProfileScreen = ({ route, navigation }) => {
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#0f172a' }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
      <ScrollView style={styles.container}>
        
        {/* Cover Photo Editor */}
        <TouchableOpacity style={styles.coverImageContainer} onPress={() => pickImage(true)}>
          <Image source={displayCover} style={styles.coverImage} />
          <View style={styles.cameraOverlay}>
            <Ionicons name="camera" size={28} color="#fff" />
            <Text style={styles.overlayText}>Change Cover</Text>
          </View>
        </TouchableOpacity>

        {/* Profile Avatar Editor */}
        <View style={styles.avatarWrapper}>
          <TouchableOpacity style={styles.avatarContainer} onPress={() => pickImage(false)}>
            <Image source={displayAvatar} style={styles.avatarImage} />
            <View style={styles.avatarCameraOverlay}>
              <Ionicons name="camera" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Form Inputs */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor="#64748b" />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput style={styles.input} keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholderTextColor="#64748b" />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Academic Year</Text>
              <TextInput style={styles.input} placeholder="e.g. 3rd Year" placeholderTextColor="#64748b" value={year} onChangeText={setYear} />
            </View>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateProfile} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Profile</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  coverImageContainer: { height: 180, width: '100%', backgroundColor: '#1e293b', position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  cameraOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  overlayText: { color: '#fff', fontWeight: 'bold', marginTop: 5 },

  avatarWrapper: { alignItems: 'center', marginTop: -60, marginBottom: 20 },
  avatarContainer: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#0f172a', backgroundColor: '#273549', overflow: 'hidden', position: 'relative' },
  avatarImage: { width: '100%', height: '100%' },
  avatarCameraOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', height: 35, alignItems: 'center', paddingTop: 3 },

  formContainer: { paddingHorizontal: 20, paddingTop: 10 },
  inputGroup: { marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  input: { backgroundColor: '#273549', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 14, fontSize: 16, color: '#f1f5f9' },

  submitBtn: { backgroundColor: '#4f46e5', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40,
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  submitBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' }
});

export default EditProfileScreen;