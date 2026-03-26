import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

export default function AnimatedSplashScreen({ onAnimationFinish }) {
  const animation = useRef(null);

  return (
    <View style={styles.container}>
      <LottieView
        autoPlay
        loop={false} // We only want it to play once!
        ref={animation}
        style={styles.animation}
        // Replace this path with wherever you put your downloaded JSON file
        source={require('../../assets/animations/splash.json')}
        // This triggers the moment the animation reaches the last frame
        onAnimationFinish={onAnimationFinish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a', // Match this to your app.json background color!
  },
  animation: {
    width: 250,
    height: 250,
  },
});