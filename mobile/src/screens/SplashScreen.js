import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export default function SplashScreen({ onFinish }) {
  
  useEffect(() => {
    // Set the timer for 1 second (1000ms)
    const timer = setTimeout(() => {
      // Trigger the callback to let your App.js know it's time to show the homepage
      if (onFinish) {
        onFinish();
      }
    }, 1000);

    // Cleanup the timer
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      {/* Update the source path to wherever your logo image is stored */}
      <Image 
        source={require('../../assets/images/splash-icon.png')} 
        style={styles.logo} 
      />
      <Text style={styles.appName}>KampusCart</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a', // Kept your exact background color
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
});