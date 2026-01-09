import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { 
  Mic, 
  MicOff, 
  Send, 
  Sparkles, 
  Wand2, 
  Bot, 
  User,
  Zap,
  ChevronRight,
  X,
  Code,
  Palette,
  Layers,
  CheckCircle,
  Save,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useOracles } from '@/contexts/OracleContext';
import { generateOracleCode, refineOracleCode } from '@/utils/grokApi';
import DynamicOracleRenderer from '@/components/DynamicOracleRenderer';
import firebaseService from '@/services/firebaseService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SMART_SUGGESTIONS = [
  { icon: '📊', title: 'Investment Portfolio', hint: 'Track stocks with charts and gains' },
  { icon: '💧', title: 'Water Tracker', hint: 'Daily intake with streaks and goals' },
  { icon: '🔥', title: 'Habit Builder', hint: 'Build habits with streak tracking' },
  { icon: '🛒', title: 'Shopping List', hint: 'Groceries with categories and search' },
  { icon: '⏱️', title: 'Pomodoro Timer', hint: 'Focus sessions with statistics' },
  { icon: '😊', title: 'Mood Journal', hint: 'Track emotions with notes and trends' },
  { icon: '💰', title: 'Expense Tracker', hint: 'Budget and spending by category' },
  { icon: '📝', title: 'Quick Notes', hint: 'Capture ideas with tags and search' },
];

interface OracleCode {
  name: string;
  description: string;
  code: string;
  accentColor: string;
  icon: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isGenerating?: boolean;
  generatingStage?: string;
  oracleData?: {
    config: OracleCode;
  };
  isError?: boolean;
}

interface ClaudeConversation {
  role: 'user' | 'assistant';
  content: string;
}

const GENERATION_STAGES = [
  { icon: Sparkles, text: 'Understanding your request...' },
  { icon: Palette, text: 'Designing the interface...' },
  { icon: Code, text: 'Writing the code...' },
  { icon: Layers, text: 'Adding functionality...' },
  { icon: CheckCircle, text: 'Finalizing...' },
];

export default function CreateScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isPro } = useAuth();
  const { oracles } = useOracles();
  
  const FREE_ORACLE_LIMIT = 2;
  const isAtLimit = oracles.length >= FREE_ORACLE_LIMIT && !isPro;
  
  const [input, setInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [pendingOracle, setPendingOracle] = useState<OracleCode | null>(null);
  const [lastCreatedOracle, setLastCreatedOracle] = useState<OracleCode | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ClaudeConversation[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [oracleName, setOracleName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const stageAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  useEffect(() => {
    if (isGenerating) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      spinAnim.setValue(0);
      dotAnim.setValue(0);
    }
  }, [isGenerating, spinAnim, dotAnim]);

  useEffect(() => {
    if (isGenerating) {
      stageAnim.setValue(0);
      Animated.timing(stageAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [currentStage, isGenerating, stageAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    if (pendingOracle) {
      const oracleMsg: ChatMessage = {
        id: `oracle_${Date.now()}`,
        role: 'assistant',
        content: `I've built **${pendingOracle.name}** for you!\n\n${pendingOracle.description}\n\nTap the button below to preview it and make any refinements.`,
        timestamp: Date.now(),
        oracleData: { config: pendingOracle },
      };
      setChatMessages(prev => [...prev, oracleMsg]);
      setPendingOracle(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      scrollToBottom();
    }
  }, [pendingOracle, scrollToBottom]);

  const processUserMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isGenerating) return;

    if (isAtLimit) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const limitMsg: ChatMessage = {
        id: `limit_${Date.now()}`,
        role: 'assistant',
        content: `You've reached the free limit of ${FREE_ORACLE_LIMIT} oracles. Upgrade to Pro for unlimited oracle creation!`,
        timestamp: Date.now(),
        isError: true,
      };
      setChatMessages(prev => [...prev, limitMsg]);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSuggestions(false);
    setInput('');
    setCurrentStage(0);
    setShowPreview(false);
    
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    
    const generatingMsgId = `gen_${Date.now()}`;
    const generatingMsg: ChatMessage = {
      id: generatingMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isGenerating: true,
      generatingStage: GENERATION_STAGES[0].text,
    };
    setChatMessages(prev => [...prev, generatingMsg]);
    scrollToBottom();
    
    setIsGenerating(true);
    
    try {
      console.log('[Create] Calling Claude API with prompt:', userMessage);
      
      const isRefinement = lastCreatedOracle && generatedCode;
      let result;
      
      if (isRefinement) {
        console.log('[Create] Refining existing oracle...');
        setCurrentStage(2);
        setChatMessages(prev => prev.map(m => 
          m.id === generatingMsgId 
            ? { ...m, generatingStage: GENERATION_STAGES[2].text }
            : m
        ));
        
        const apiResult = await refineOracleCode(
          generatedCode,
          userMessage,
          conversationHistory
        );
        
        setGeneratedCode(apiResult.code);
        setConversationHistory(apiResult.conversationHistory);
        
        result = {
          ...lastCreatedOracle,
          code: apiResult.code,
        };
      } else {
        console.log('[Create] Generating new oracle...');
        
        for (let i = 0; i < GENERATION_STAGES.length; i++) {
          setCurrentStage(i);
          setChatMessages(prev => prev.map(m => 
            m.id === generatingMsgId 
              ? { ...m, generatingStage: GENERATION_STAGES[i].text }
              : m
          ));
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        const apiResult = await generateOracleCode(userMessage, []);
        
        setGeneratedCode(apiResult.code);
        setConversationHistory(apiResult.conversationHistory);
        
        result = {
          name: userMessage.split(':')[0].trim().substring(0, 30),
          description: userMessage,
          code: apiResult.code,
          accentColor: '#0AFFE6',
          icon: '🔮',
        };
        
        setOracleName(result.name);
      }
      
      console.log('[Create] Oracle generated/refined:', result.name);
      
      setPendingOracle(result);
      setLastCreatedOracle(result);
      
      setChatMessages(prev => prev.filter(m => m.id !== generatingMsgId));
      
    } catch (error: unknown) {
      console.error('[Create] Error generating oracle:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      setChatMessages(prev => prev.filter(m => m.id !== generatingMsgId));
      
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: errorMessage.includes('API key') 
          ? 'API key not configured. Please check your environment settings.'
          : errorMessage.includes('API error')
          ? 'There was a connection issue. Please try again.'
          : 'I had trouble generating that oracle. Try rephrasing your request or breaking it into simpler parts.',
        timestamp: Date.now(),
        isError: true,
      };
      setChatMessages(prev => [...prev, errorMsg]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGenerating(false);
      setCurrentStage(0);
      scrollToBottom();
    }
  };

  const handleSend = () => {
    if (input.trim() && !isGenerating) {
      processUserMessage(input.trim());
    }
  };

  const handleSuggestionPress = (suggestion: typeof SMART_SUGGESTIONS[0]) => {
    Haptics.selectionAsync();
    const fullPrompt = `${suggestion.title}: ${suggestion.hint}`;
    processUserMessage(fullPrompt);
  };

  const handlePreviewOracle = (oracleData: ChatMessage['oracleData']) => {
    if (!oracleData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowPreview(true);
    scrollToBottom();
  };

  const handleSaveOracle = async () => {
    if (!lastCreatedOracle || !generatedCode) {
      Alert.alert('Error', 'No oracle to save');
      return;
    }

    if (!oracleName.trim()) {
      Alert.alert('Error', 'Please provide a name for your oracle');
      return;
    }

    setIsSaving(true);
    try {
      const oracleId = `oracle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const oracleData = {
        id: oracleId,
        name: oracleName.trim(),
        description: lastCreatedOracle.description,
        prompt: lastCreatedOracle.description,
        code: generatedCode,
        accentColor: lastCreatedOracle.accentColor,
        icon: lastCreatedOracle.icon,
        conversationHistory,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await firebaseService.saveOracle(user?.id || '', oracleData);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Success!',
        'Your oracle has been saved',
        [
          {
            text: 'View Dashboard',
            onPress: () => router.push('/(tabs)'),
          },
          {
            text: 'Create Another',
            onPress: () => {
              setInput('');
              setChatMessages([]);
              setGeneratedCode('');
              setConversationHistory([]);
              setShowPreview(false);
              setLastCreatedOracle(null);
              setOracleName('');
              setShowSuggestions(true);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Save Failed', error.message || 'Failed to save oracle');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const startRecording = async () => {
    try {
      console.log('Requesting audio permissions...');
      const { granted } = await Audio.requestPermissionsAsync();
      
      if (!granted) {
        console.log('Permission denied');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording...');
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
    } catch (error) {
      console.log('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    console.log('Stopping recording...');
    setIsRecording(false);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      
      const uri = recording.getURI();
      console.log('Recording URI:', uri);
      
      if (uri) {
        setInput('Transcribing...');
        
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        const formData = new FormData();
        formData.append('audio', {
          uri,
          name: `recording.${fileType}`,
          type: `audio/${fileType}`,
        } as unknown as Blob);

        const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Transcription:', data.text);
          setInput(data.text || '');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          console.log('Transcription failed');
          setInput('');
        }
      }
    } catch (error) {
      console.log('Error stopping recording:', error);
      setInput('');
    }

    setRecording(null);
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const clearChat = () => {
    Haptics.selectionAsync();
    setChatMessages([]);
    setConversationHistory([]);
    setGeneratedCode('');
    setShowSuggestions(true);
    setLastCreatedOracle(null);
    setShowPreview(false);
    setOracleName('');
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.authPrompt}>
          <Wand2 size={48} color={colors.accent} strokeWidth={1} />
          <Text style={styles.authTitle}>Sign in to Create</Text>
          <Text style={styles.authText}>
            Create an account to start building your custom oracles
          </Text>
          <TouchableOpacity 
            style={styles.authButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.authButtonText}>Go to Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const StageIcon = GENERATION_STAGES[currentStage]?.icon || Sparkles;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Bot size={18} color={colors.accent} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Oracle Builder</Text>
            <Text style={styles.headerSubtitle}>Describe what you want to create</Text>
          </View>
        </View>
        {chatMessages.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {showSuggestions && chatMessages.length === 0 && (
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeIcon}>
              <Sparkles size={32} color={colors.accent} />
            </View>
            <Text style={styles.welcomeTitle}>What would you like to build?</Text>
            <Text style={styles.welcomeSubtitle}>
              Describe any tool, tracker, or utility and I&apos;ll create it for you
            </Text>

            <View style={styles.suggestionsGrid}>
              {SMART_SUGGESTIONS.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionCard}
                  onPress={() => handleSuggestionPress(suggestion)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionIcon}>{suggestion.icon}</Text>
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                    <Text style={styles.suggestionHint}>{suggestion.hint}</Text>
                  </View>
                  <ChevronRight size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {chatMessages.map((message) => (
          <View 
            key={message.id}
            style={[
              styles.messageContainer,
              message.role === 'user' ? styles.userMessageContainer : styles.assistantMessageContainer,
            ]}
          >
            <View style={[
              styles.messageAvatar,
              message.role === 'user' ? styles.userAvatar : styles.assistantAvatar,
            ]}>
              {message.role === 'user' ? (
                <User size={14} color={colors.background} />
              ) : (
                <Bot size={14} color={colors.accent} />
              )}
            </View>
            
            <View style={[
              styles.messageBubble,
              message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              message.isError && styles.errorBubble,
            ]}>
              {message.isGenerating ? (
                <View style={styles.generatingContainer}>
                  <Animated.View style={[styles.generatingIcon, { transform: [{ rotate: spin }] }]}>
                    <StageIcon size={18} color={colors.accent} />
                  </Animated.View>
                  <View style={styles.generatingTextContainer}>
                    <Animated.Text style={[styles.generatingText, { opacity: stageAnim }]}>
                      {message.generatingStage}
                    </Animated.Text>
                    <View style={styles.dotsContainer}>
                      <Animated.View style={[styles.dot, { opacity: dotAnim }]} />
                      <Animated.View style={[styles.dot, { opacity: dotAnim }]} />
                      <Animated.View style={[styles.dot, { opacity: dotAnim }]} />
                    </View>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={[
                    styles.messageText,
                    message.role === 'user' && styles.userMessageText,
                    message.isError && styles.errorText,
                  ]}>
                    {message.content}
                  </Text>
                  
                  {message.oracleData && !showPreview && (
                    <TouchableOpacity
                      style={styles.previewButton}
                      onPress={() => handlePreviewOracle(message.oracleData)}
                    >
                      <Zap size={16} color={colors.background} />
                      <Text style={styles.previewButtonText}>Show Preview</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        ))}

        {showPreview && lastCreatedOracle && generatedCode && (
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Preview</Text>
              <TouchableOpacity
                style={styles.closePreviewButton}
                onPress={() => setShowPreview(false)}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.previewContainer}>
              <DynamicOracleRenderer
                code={generatedCode}
                userId={user?.id || 'preview'}
                oracleId="preview"
                data={{ items: [] }}
                logs={[]}
                config={lastCreatedOracle}
                onError={(error) => {
                  console.error('Preview error:', error);
                  Alert.alert('Preview Error', error.message);
                }}
              />
            </View>

            <View style={styles.saveSection}>
              <Text style={styles.saveLabel}>Oracle Name</Text>
              <TextInput
                style={styles.nameInput}
                value={oracleName}
                onChangeText={setOracleName}
                placeholder="My Awesome Oracle"
                placeholderTextColor={colors.textMuted}
              />
              
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSaveOracle}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Save size={20} color={colors.background} />
                    <Text style={styles.saveButtonText}>Save Oracle</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        {lastCreatedOracle && !isGenerating && (
          <View style={styles.refineHint}>
            <Text style={styles.refineHintText}>
              💡 You can refine your oracle by describing changes
            </Text>
          </View>
        )}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={
              isRecording 
                ? 'Listening...' 
                : lastCreatedOracle 
                  ? 'Describe changes or create something new...'
                  : 'Describe what you want to build...'
            }
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            editable={!isGenerating && !isRecording}
          />
          
          <View style={styles.inputActions}>
            <TouchableOpacity
              style={[
                styles.micButton,
                isRecording && styles.micButtonActive,
              ]}
              onPress={handleMicPress}
              disabled={isGenerating}
            >
              <Animated.View style={isRecording ? { transform: [{ scale: pulseAnim }] } : undefined}>
                {isRecording ? (
                  <MicOff size={20} color={colors.background} />
                ) : (
                  <Mic size={20} color={colors.textSecondary} />
                )}
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() || isGenerating) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!input.trim() || isGenerating || isAtLimit}
            >
              {isGenerating ? (
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Sparkles size={18} color={colors.background} />
                </Animated.View>
              ) : (
                <Send size={18} color={colors.background} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: colors.accent + '15',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  clearButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 20,
  },
  welcomeSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    backgroundColor: colors.accent + '15',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  suggestionsGrid: {
    width: '100%',
    gap: 8,
  },
  suggestionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  suggestionIcon: {
    fontSize: 24,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.text,
    marginBottom: 2,
  },
  suggestionHint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  userMessageContainer: {
    flexDirection: 'row-reverse',
  },
  assistantMessageContainer: {
    flexDirection: 'row',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatar: {
    backgroundColor: colors.accent,
  },
  assistantAvatar: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  messageBubble: {
    maxWidth: SCREEN_WIDTH * 0.72,
    borderRadius: 16,
    padding: 14,
  },
  userBubble: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    borderColor: colors.error + '40',
    backgroundColor: colors.error + '10',
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  userMessageText: {
    color: colors.background,
  },
  errorText: {
    color: colors.error,
  },
  generatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  generatingIcon: {
    width: 32,
    height: 32,
    backgroundColor: colors.accent + '15',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingTextContainer: {
    flex: 1,
  },
  generatingText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.background,
  },
  previewSection: {
    marginTop: 24,
    gap: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  closePreviewButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  previewContainer: {
    height: 400,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  saveSection: {
    gap: 12,
    paddingTop: 8,
  },
  saveLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  nameInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.background,
  },
  inputContainer: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    backgroundColor: colors.background,
  },
  refineHint: {
    backgroundColor: colors.accent + '10',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  refineHintText: {
    fontSize: 12,
    color: colors.accent,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    minHeight: 48,
  },
  inputActions: {
    flexDirection: 'row',
    gap: 8,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.accent + '40',
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '500' as const,
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  authText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  authButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  authButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
