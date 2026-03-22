import React, { useContext } from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeStackNavigator from './HomeStackNavigator';
import PostScreen from '../screens/PostScreen';
import ChatStackNavigator from './ChatStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import { AuthContext } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const { isGuest, currentUser } = useContext(AuthContext);
  const isAdmin = currentUser?.isAdmin === true;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Sell':
              // Changed from 'add-circle' to 'camera'
              iconName = focused ? 'camera' : 'camera-outline';
              break;
            case 'ChatTab':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Admin':
              iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
              break;
            default:
              iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#818cf8',
        tabBarInactiveTintColor: '#475569',
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="Sell"
        component={PostScreen}
        // Removed the custom floating button overrides so it renders the label and uses the camera icon
        options={{ title: 'Sell' }} 
      />
      {!isGuest && (
        <Tab.Screen
          name="ChatTab"
          component={ChatStackNavigator}
          options={{ title: 'Messages' }}
          listeners={({ navigation }) => ({
            tabPress: () => {
              navigation.navigate('ChatTab', { screen: 'ChatList' });
            },
          })}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{ title: 'Profile' }}
      />
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminDashboardScreen}
          options={{
            title: 'Admin',
            tabBarActiveTintColor: '#818cf8',
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export const TAB_BAR_STYLE = {
  paddingBottom: 8,
  paddingTop: 6,
  height: 64,
  borderTopWidth: 1,
  borderTopColor: '#1e293b',
  backgroundColor: '#0f172a',
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
};

const styles = StyleSheet.create({
  tabBar: TAB_BAR_STYLE,
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default MainTabNavigator;
