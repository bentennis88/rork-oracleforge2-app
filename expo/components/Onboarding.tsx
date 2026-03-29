import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Hexagon, Wand2, Edit3, Play, ArrowRight, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import colors from '@/constants/colors';

const { width } = Dimensions.get('window');

interface OnboardingStep {
  icon: React.ComponentType<{ size: number; color: string }>;
  title: string;
  description: string;
  example: string;
}

const steps: OnboardingStep[] = [
  {
    icon: Hexagon,
    title: 'Welcome to OracleForge',
    description: 'Create custom tools using natural language. Describe any tracker, calculator, or utility you need and watch it materialize.',
    example: 'Built for creators who need unique tools',
  },
  {
    icon: Wand2,
    title: 'Describe Your Vision',
    description: 'Use plain English to describe your tool. The AI understands context, features, and design preferences.',
    example: '"Create a habit tracker with streak counting and daily reminders"',
  },
  {
    icon: Edit3,
    title: 'Refine Unlimited Times',
    description: 'Not perfect? Simply describe changes. Add features, adjust colors, modify behavior - no limits on refinements.',
    example: '"Add a dark mode toggle" or "Make the buttons larger"',
  },
  {
    icon: Play,
    title: 'Use Your Oracles',
    description: 'Your tools save data locally, work offline, and stay synchronized. Each oracle is a fully functional mini-app.',
    example: 'Tap any oracle to start using it',
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      scrollViewRef.current?.scrollTo({ x: nextStep * width, animated: true });
      
      Animated.spring(progressAnim, {
        toValue: nextStep,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleComplete();
  };

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  const handleDotPress = (index: number) => {
    Haptics.selectionAsync();
    setCurrentStep(index);
    scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
    
    Animated.spring(progressAnim, {
      toValue: index,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, steps.length - 1],
    outputRange: ['25%', '100%'],
  });

  const isLastStep = currentStep === steps.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <X size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.scrollView}
      >
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          return (
            <View key={index} style={styles.stepContainer}>
              <View style={styles.iconContainer}>
                <View style={styles.iconBorder}>
                  <StepIcon size={48} color={colors.accent} />
                </View>
              </View>

              <View style={styles.content}>
                <Text style={styles.stepNumber}>
                  STEP {index + 1} OF {steps.length}
                </Text>
                <Text style={styles.title}>{step.title}</Text>
                <Text style={styles.description}>{step.description}</Text>

                <View style={styles.exampleContainer}>
                  <View style={styles.exampleBorder}>
                    <Text style={styles.exampleText}>{step.example}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dotsContainer}>
          {steps.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleDotPress(index)}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <View
                style={[
                  styles.dot,
                  index === currentStep && styles.dotActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {isLastStep ? 'Get Started' : 'Next'}
          </Text>
          <ArrowRight size={18} color={colors.background} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  progressBarContainer: {
    flex: 1,
    height: 2,
    backgroundColor: colors.surfaceBorder,
    marginRight: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  skipButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    width: width,
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 48,
  },
  iconBorder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.accentMuted,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 2,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '300' as const,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  exampleContainer: {
    width: '100%',
  },
  exampleBorder: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  exampleText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
    fontStyle: 'italic' as const,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    gap: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceBorder,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
  nextButton: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.onAccent,
    letterSpacing: 0.5,
  },
});
