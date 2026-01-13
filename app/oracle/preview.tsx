import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TextInput,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ArrowLeft, Save, Sparkles, Info, RefreshCw, MessageCircle, Send, X, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import colors from '@/constants/colors';
import { useOracles } from '@/contexts/OracleContext';
import { useAuth } from '@/hooks/useAuth';
import DynamicOracleRenderer from '@/components/DynamicOracleRenderer';
import { refineOracleCode } from '@/services/grokApi';

interface OracleConfig {
  name: string;
  description: string;
  code?: string;
  oracleType?: string;
  features?: string[];
  accentColor: string;
  icon: string;
  initialData?: Record<string, unknown>;
}

interface RefineMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isGenerating?: boolean;
  stage?: string;
}

export default function PreviewOracleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ config?: string; name?: string }>();
  const { user } = useAuth();
  const { createOracle, updateOracle } = useOracles();
  
  const config = useMemo<OracleConfig | null>(() => {
    if (params.config) {
      try {
        return JSON.parse(params.config);
      } catch (e) {
        console.log('Error parsing config:', e);
        return null;
      }
    }
    return null;
  }, [params.config]);
  
  const [previewData, setPreviewData] = useState<Record<string, unknown>>(config?.initialData || {});
  const [previewLogs, setPreviewLogs] = useState<{ id: string; timestamp: number; date: string; type: string; value: number | string | Record<string, unknown>; metadata?: Record<string, unknown> }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showRefineChat, setShowRefineChat] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [refineMessages, setRefineMessages] = useState<RefineMessage[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<OracleConfig | null>(config);
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [renderKey, setRenderKey] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const chatScrollRef = useRef<ScrollView>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isRefining) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [isRefining, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const name = params.name || currentConfig?.name || config?.name || 'New Oracle';

  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowToast(false));
  }, [toastAnim]);

  const handleDataChange = useCallback((newData: Record<string, unknown>) => {
    setPreviewData(prev => ({ ...prev, ...newData }));
  }, []);

  const handleAddLog = useCallback((log: { type: string; value: number | string | Record<string, unknown>; metadata?: Record<string, unknown> }) => {
    const newLog = {
      id: 'log_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      date: new Date().toDateString(),
      ...log,
    };
    console.log('Preview: Adding log', newLog);
    setPreviewLogs(prev => [...prev, newLog]);
  }, []);

  const scrollChatToBottom = useCallback(() => {
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSendRefine = async () => {
    if (!refineInput.trim() || isRefining || !currentConfig) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const userMessage: RefineMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: refineInput.trim(),
    };
    
    const generatingId = `gen_${Date.now()}`;
    const generatingMessage: RefineMessage = {
      id: generatingId,
      role: 'assistant',
      content: '',
      isGenerating: true,
      stage: 'Understanding changes...',
    };
    
    setRefineMessages(prev => [...prev, userMessage, generatingMessage]);
    setRefineInput('');
    setIsRefining(true);
    scrollChatToBottom();

    try {
      console.log('[Preview Refine] Starting refinement with feedback:', userMessage.content);

      const basePrompt = currentConfig.description || '';
      const updatedPrompt =
        basePrompt.trim().length > 0
          ? basePrompt.trim() + '\n\nRefinement: ' + userMessage.content
          : userMessage.content;

      const result = await refineOracleCode(
        currentConfig.code || '',
        userMessage.content,
        conversationHistory
      );

      const updatedConfig: OracleConfig = {
        ...currentConfig,
        description: updatedPrompt,
        code: result.code,
      };

      setCurrentConfig(updatedConfig);
      setConversationHistory(result.conversationHistory as any);
      setRenderKey(prev => prev + 1);
      
      setRefineMessages(prev => prev.filter(m => m.id !== generatingId));
      
      const successMessage: RefineMessage = {
        id: `success_${Date.now()}`,
        role: 'assistant',
        content: `Done! I've updated the oracle. Check out the preview above.`,
      };
      setRefineMessages(prev => [...prev, successMessage]);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToastMessage('Oracle refined');
      
      console.log('[Preview Refine] Oracle updated successfully');
    } catch (error) {
      console.error('[Preview Refine] Error refining oracle:', error);
      
      setRefineMessages(prev => prev.filter(m => m.id !== generatingId));
      
      const errorMessage: RefineMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'I had trouble making those changes. Could you try rephrasing?',
      };
      setRefineMessages(prev => [...prev, errorMessage]);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsRefining(false);
      scrollChatToBottom();
    }
  };

  const handleSave = async () => {
    if (isSaving || !currentConfig) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsSaving(true);

    try {
      console.log('Saving new oracle to collection...');
      const oracle = await createOracle(
        currentConfig.description, 
        currentConfig.name, 
        currentConfig.code || ''
      );
      
      if (oracle && conversationHistory.length > 0) {
        await updateOracle(oracle.id, {
          conversationHistory,
          color: currentConfig.accentColor,
        });
      }
      
      if (oracle) {
        console.log('Oracle saved successfully:', oracle.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToastMessage('Saved to My Oracles');
      }
      
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 800);
    } catch (error) {
      console.log('Error saving oracle:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToastMessage('Failed to save oracle');
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentConfig && !config) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Info size={48} color={colors.textMuted} />
          <Text style={styles.errorText}>Invalid oracle configuration</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const activeConfig = currentConfig || config!;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitle: () => (
            <Text style={styles.headerTitle}>{name}</Text>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
              <ArrowLeft size={22} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.previewSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>LIVE PREVIEW</Text>
              <View style={styles.previewBadge}>
                <CheckCircle size={12} color={colors.success} />
                <Text style={styles.previewBadgeText}>Working</Text>
              </View>
            </View>
            <View style={styles.previewContainer}>
              <DynamicOracleRenderer
                key={`preview-${renderKey}`}
                code={activeConfig.code || ''}
                userId={user?.id || 'guest'}
                oracleId="preview"
                data={previewData}
                logs={previewLogs}
                onDataChange={handleDataChange}
                onAddLog={handleAddLog}
                config={activeConfig}
              />
            </View>
          </View>

          {showRefineChat ? (
            <View style={styles.refineChatContainer}>
              <View style={styles.refineChatHeader}>
                <MessageCircle size={16} color={colors.accent} />
                <Text style={styles.refineChatTitle}>Refine Oracle</Text>
                <TouchableOpacity 
                  style={styles.closeChatButton}
                  onPress={() => {
                    setShowRefineChat(false);
                    setRefineMessages([]);
                  }}
                >
                  <X size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                ref={chatScrollRef}
                style={styles.refineMessagesContainer}
                contentContainerStyle={styles.refineMessagesContent}
              >
                {refineMessages.length === 0 && (
                  <View style={styles.refineEmptyState}>
                    <Text style={styles.refineEmptyText}>
                      What would you like to change?
                    </Text>
                  </View>
                )}
                
                {refineMessages.map((message) => (
                  <View 
                    key={message.id}
                    style={[
                      styles.refineMessage,
                      message.role === 'user' ? styles.refineUserMessage : styles.refineAssistantMessage,
                    ]}
                  >
                    {message.isGenerating ? (
                      <View style={styles.generatingRow}>
                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                          <Sparkles size={16} color={colors.accent} />
                        </Animated.View>
                        <Text style={styles.generatingText}>{message.stage}</Text>
                      </View>
                    ) : (
                      <Text style={[
                        styles.refineMessageText,
                        message.role === 'user' && styles.refineUserMessageText,
                      ]}>
                        {message.content}
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
              
              <View style={styles.refineInputContainer}>
                <TextInput
                  style={styles.refineInput}
                  placeholder="e.g., Add a search bar..."
                  placeholderTextColor={colors.textMuted}
                  value={refineInput}
                  onChangeText={setRefineInput}
                  multiline
                  editable={!isRefining}
                />
                <TouchableOpacity
                  style={[
                    styles.refineSendButton,
                    (!refineInput.trim() || isRefining) && styles.refineSendButtonDisabled,
                  ]}
                  onPress={handleSendRefine}
                  disabled={!refineInput.trim() || isRefining}
                >
                  {isRefining ? (
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                      <Sparkles size={18} color={colors.background} />
                    </Animated.View>
                  ) : (
                    <Send size={18} color={colors.background} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.refineButton}
              onPress={() => setShowRefineChat(true)}
            >
              <RefreshCw size={18} color={colors.accent} />
              <Text style={styles.refineButtonText}>Refine Before Saving</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Save size={18} color={colors.background} />
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save to My Oracles'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {showToast && (
        <Animated.View 
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [{
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              }],
            },
          ]}
        >
          <Sparkles size={16} color={colors.background} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  headerBack: {
    padding: 4,
    marginRight: 8,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  previewSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  previewBadgeText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '500' as const,
  },
  previewContainer: {
    minHeight: 400,
    borderRadius: 12,
    overflow: 'hidden',
  },
  refineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
  },
  refineButtonText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500' as const,
  },
  refineChatContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  refineChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  refineChatTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  closeChatButton: {
    padding: 4,
  },
  refineMessagesContainer: {
    maxHeight: 180,
  },
  refineMessagesContent: {
    padding: 14,
    gap: 12,
  },
  refineEmptyState: {
    padding: 16,
    alignItems: 'center',
  },
  refineEmptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  refineMessage: {
    maxWidth: '85%',
    borderRadius: 12,
    padding: 12,
  },
  refineUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
  },
  refineAssistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  refineMessageText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  refineUserMessageText: {
    color: colors.background,
  },
  generatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  generatingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  refineInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  refineInput: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    maxHeight: 80,
  },
  refineSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refineSendButtonDisabled: {
    backgroundColor: colors.accent + '40',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    backgroundColor: colors.background,
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
  saveButtonText: {
    fontSize: 15,
    color: colors.background,
    fontWeight: '600' as const,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: colors.accent,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  toastText: {
    fontSize: 14,
    color: colors.background,
    fontWeight: '600' as const,
  },
});
