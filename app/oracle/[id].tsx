import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Animated,
  Easing,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { 
  ArrowLeft, 
  Zap, 
  Target, 
  TrendingUp, 
  Clock, 
  BarChart3, 
  Activity, 
  Trash2, 
  RefreshCw,
  Code,
  Eye,
  Sparkles,
  MessageCircle,
  Send,
  X,
  CheckCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import colors from '@/constants/colors';
import { useOracles } from '@/contexts/OracleContext';
import { useAuth } from '@/hooks/useAuth';
import DynamicOracleRenderer from '@/components/DynamicOracleRenderer';
import { refineOracleCode } from '@/services/grokApi';
import firebaseService from '@/services/firebaseService';

const iconMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Zap,
  Target,
  TrendingUp,
  Clock,
  BarChart3,
  Activity,
};

interface RefineMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isGenerating?: boolean;
  stage?: string;
}

export default function OracleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { oracles, updateOracle, deleteOracle, updateOracleData, addLog } = useOracles();
  
  const oracle = oracles.find(o => o.id === id);
  
  const [showCode, setShowCode] = useState(false);
  const [showRefineChat, setShowRefineChat] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [refineMessages, setRefineMessages] = useState<RefineMessage[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;
  const chatScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
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
    if (oracle) {
      updateOracleData(oracle.id, newData);
    }
  }, [oracle, updateOracleData]);

  const handleAddLog = useCallback((log: { type: string; value: number | string | Record<string, unknown>; metadata?: Record<string, unknown> }) => {
    if (oracle) {
      console.log('Adding log to oracle:', oracle.id, log);
      addLog(oracle.id, log);
    }
  }, [oracle, addLog]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSendRefine = async () => {
    if (!refineInput.trim() || isRefining || !oracle) return;

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
    scrollToBottom();

    try {
      console.log('[Refine] Starting refinement with feedback:', userMessage.content);
      const existingHistory = oracle.conversationHistory || [];
      const result = await refineOracleCode(
        oracle.generatedCode,
        userMessage.content,
        existingHistory as any
      );

      const updatedPrompt =
        oracle.prompt.trim().length > 0
          ? oracle.prompt.trim() + '\n\nRefinement: ' + userMessage.content
          : userMessage.content;

      await updateOracle(oracle.id, {
        generatedCode: result.code,
        prompt: updatedPrompt,
        description: updatedPrompt.substring(0, 100),
        conversationHistory: result.conversationHistory as any,
      });

      // If this oracle is also persisted remotely, update the saved code.
      // (Safe to attempt; ignore failures.)
      try {
        await firebaseService.updateOracle(oracle.id, {
          code: result.code,
          generatedCode: result.code,
          prompt: updatedPrompt,
          description: updatedPrompt.substring(0, 100),
          conversationHistory: result.conversationHistory,
        });
      } catch (e) {
        console.log('[Refine] Firebase update skipped/failed:', e);
      }
      
      setRefineMessages(prev => prev.filter(m => m.id !== generatingId));
      
      const successMessage: RefineMessage = {
        id: `success_${Date.now()}`,
        role: 'assistant',
        content: `Done! I've updated your oracle with the requested changes. The preview has been refreshed.`,
      };
      setRefineMessages(prev => [...prev, successMessage]);
      
      setRenderKey(prev => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToastMessage('Oracle refined');
      
      console.log('[Refine] Oracle updated successfully');
    } catch (error) {
      console.error('[Refine] Error refining oracle:', error);
      
      setRefineMessages(prev => prev.filter(m => m.id !== generatingId));
      
      const errorMessage: RefineMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'I had trouble making those changes. Could you try rephrasing your request?',
      };
      setRefineMessages(prev => [...prev, errorMessage]);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsRefining(false);
      scrollToBottom();
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      setShowDeleteConfirm(true);
    } else {
      Alert.alert(
        'Delete Oracle',
        'Are you sure you want to delete this oracle? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: confirmDelete,
          },
        ]
      );
    }
  };

  const confirmDelete = async () => {
    if (!oracle) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await deleteOracle(oracle.id);
    router.back();
  };

  if (!oracle) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{ 
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            title: 'Oracle Not Found',
          }} 
        />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Oracle not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const IconComponent = iconMap[oracle.icon] || Zap;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerStyle: { 
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitle: () => (
            <Text style={styles.headerTitle}>{oracle.name}</Text>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
              <ArrowLeft size={22} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete} style={styles.headerDelete}>
              <Trash2 size={20} color={colors.error} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: oracle.color + '15' }]}>
              <IconComponent size={28} color={oracle.color} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.oracleName}>{oracle.name}</Text>
              <Text style={styles.oracleDate}>Updated {formatDate(oracle.updatedAt)}</Text>
            </View>
          </View>

          <View style={styles.oracleSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>LIVE ORACLE</Text>
              <TouchableOpacity 
                style={styles.toggleButton}
                onPress={() => setShowCode(!showCode)}
              >
                {showCode ? (
                  <Eye size={14} color={colors.accent} />
                ) : (
                  <Code size={14} color={colors.accent} />
                )}
                <Text style={styles.toggleText}>
                  {showCode ? 'Preview' : 'Code'}
                </Text>
              </TouchableOpacity>
            </View>

            {showCode ? (
              <ScrollView 
                style={styles.codeContainer} 
                horizontal={false}
                nestedScrollEnabled
              >
                <Text style={styles.codeText}>{oracle.generatedCode}</Text>
              </ScrollView>
            ) : (
              <View style={styles.rendererContainer}>
                <DynamicOracleRenderer
                  key={`oracle-${oracle.id}-${renderKey}`}
                  code={oracle.generatedCode}
                  userId={user?.id || 'guest'}
                  oracleId={oracle.id}
                  data={oracle.data}
                  logs={oracle.logs || []}
                  onDataChange={handleDataChange}
                  onAddLog={handleAddLog}
                  config={{
                    name: oracle.name,
                    description: oracle.description,
                    accentColor: oracle.color,
                  }}
                />
              </View>
            )}
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
                      Describe the changes you want to make to this oracle
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
                  placeholder="e.g., Add a search bar, change colors..."
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
              <Text style={styles.refineButtonText}>Edit / Refine Oracle</Text>
            </TouchableOpacity>
          )}

          <View style={styles.promptSection}>
            <Text style={styles.sectionLabel}>ORIGINAL PROMPT</Text>
            <View style={styles.promptCard}>
              <Text style={styles.promptText}>{oracle.prompt}</Text>
            </View>
          </View>

          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <CheckCircle size={16} color={colors.success} />
              <Text style={styles.statText}>
                {(oracle.logs || []).length} logs recorded
              </Text>
            </View>
          </View>
        </ScrollView>
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

      {showDeleteConfirm && (
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteTitle}>Delete Oracle?</Text>
            <Text style={styles.deleteMessage}>
              This action cannot be undone. All data will be lost.
            </Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  confirmDelete();
                }}
              >
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    letterSpacing: 0.5,
  },
  headerBack: {
    padding: 4,
    marginRight: 8,
  },
  headerDelete: {
    padding: 4,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  oracleName: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 2,
  },
  oracleDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  oracleSection: {
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
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  toggleText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '500' as const,
  },
  rendererContainer: {
    minHeight: 350,
    borderRadius: 12,
    overflow: 'hidden',
  },
  codeContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    maxHeight: 300,
  },
  codeText: {
    fontSize: 11,
    color: colors.accent,
    fontFamily: 'monospace',
    lineHeight: 18,
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
    marginBottom: 24,
  },
  refineButtonText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500' as const,
  },
  refineChatContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 24,
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
    maxHeight: 200,
  },
  refineMessagesContent: {
    padding: 14,
    gap: 12,
  },
  refineEmptyState: {
    padding: 20,
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
  promptSection: {
    marginBottom: 20,
  },
  promptCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  promptText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statsSection: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  notFoundText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  backButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '500' as const,
  },
  deleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 12,
  },
  deleteMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  deleteCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  deleteCancelText: {
    fontSize: 13,
    color: colors.text,
  },
  deleteConfirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
  },
  deleteConfirmText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600' as const,
  },
  toast: {
    position: 'absolute',
    bottom: 40,
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
