import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/ProfileScreen';
import EditItemScreen from '../screens/EditItemScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

const Stack = createNativeStackNavigator();

const ProfileStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="EditItem" 
        component={EditItemScreen} 
        options={{ title: 'Manage Listing', headerBackTitle: 'Back' }} 
      />
      {/* 🚀 ADD THE NEW SCREEN HERE */}
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen} 
        options={{ title: 'Edit Profile', headerBackTitle: 'Back' }} 
      />
  
    </Stack.Navigator>
    
  );
};

export default ProfileStackNavigator;