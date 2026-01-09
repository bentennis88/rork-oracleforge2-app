import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import colors from '@/constants/colors';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(lineWidth, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, [fadeAnim, scaleAnim, lineWidth, subtitleOpacity, onFinish]);

  const animatedLineStyle = {
    width: lineWidth.interpolate({
      inputRange: [0, 1],
      outputRange: [0, width * 0.4],
    }),
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>ORACLE</Text>
          <Text style={styles.logoTextAccent}>FORGE</Text>
        </View>
        
        <Animated.View style={[styles.line, animatedLineStyle]} />
        
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          Build tools with words
        </Animated.Text>
      </Animated.View>

      <View style={styles.cornerTL} />
      <View style={styles.cornerTR} />
      <View style={styles.cornerBL} />
      <View style={styles.cornerBR} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '200' as const,
    color: colors.text,
    letterSpacing: 8,
  },
  logoTextAccent: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.accent,
    letterSpacing: 8,
  },
  line: {
    height: 1,
    backgroundColor: colors.accent,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 4,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  cornerTL: {
    position: 'absolute',
    top: 60,
    left: 24,
    width: 24,
    height: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cornerTR: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 24,
    height: 24,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    width: 24,
    height: 24,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 60,
    right: 24,
    width: 24,
    height: 24,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.surfaceBorder,
  },
});
