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
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const { isGuest, currentUser } = useContext(AuthContext);
  const { theme } = useTheme();
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
        tabBarActiveTintColor: theme.primaryAccent,
        tabBarInactiveTintColor: theme.textTertiary,
        headerShown: false,
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 6,
          height: 64,
          borderTopWidth: 1,
          borderTopColor: theme.inputBorder,
          backgroundColor: theme.background,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        },
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ title: 'Home' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            if (navigation.isFocused()) {
              navigation.navigate('Home', {
                screen: 'HomeFeed',
                params: { scrollToTop: Date.now() },
              });
            }
          },
        })}
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

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default MainTabNavigator;
