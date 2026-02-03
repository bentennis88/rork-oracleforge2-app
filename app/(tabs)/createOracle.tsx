import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, Keyboard, TouchableWithoutFeedback, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useOracles, Oracle } from '@/contexts/OraclesContext';
import { generateOracleCode, refinePrompt, testApiConnection } from '@/services/oracleCodeGenerator';
import { 
  analyzePromptForClarification, 
  buildEnhancedPrompt, 
  getQuickSuggestions,
  ClarificationQuestion,
  ClarificationResult,
  ClarificationAnswers 
} from '@/services/promptClarificationEngine';
import colors from '@/constants/colors';
import { Sparkles, Home, Edit3, Wand2, Lightbulb, X, Check, Save, RefreshCw, Eye, HelpCircle, ChevronRight, AlertCircle, CheckCircle, Zap } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import firebaseService from '@/services/firebaseService';
import DynamicOracleRenderer from '@/components/DynamicOracleRenderer';

type ViewState = 'input' | 'clarifying' | 'generating' | 'preview' | 'saved';

export default function CreateOracleScreen() {
  const router = useRouter();
  const { addOracle } = useOracles();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [viewState, setViewState] = useState<ViewState>('input');
  const [newOracleId, setNewOracleId] = useState<string | null>(null);
  
  // Clarification state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [clarificationResult, setClarificationResult] = useState<ClarificationResult | null>(null);
  const [clarificationAnswers, setClarificationAnswers] = useState<ClarificationAnswers>({});
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);
  const [showClarificationModal, setShowClarificationModal] = useState(false);
  
  // Refine modal state
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refinedPrompt, setRefinedPrompt] = useState('');
  
  // Generation state
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generatedOracle, setGeneratedOracle] = useState<Oracle | null>(null);
  const [previewError, setPreviewError] = useState(false);
  
  // Animation
  const progressAnim = useRef(new Animated.Value(0)).current;

  const generateId = () => {
    return 'oracle_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  };

  const animateProgress = (toValue: number, duration: number = 500) => {
    Animated.timing(progressAnim, {
      toValue,
      duration,
      useNativeDriver: false,
    }).start();
    setGenerationProgress(toValue);
  };

  const handleGeneratePrompt = async () => {
    const userIdea = description.trim() 
      ? `${title.trim()}. ${description.trim()}`
      : title.trim();
    
    if (!userIdea) {
      Alert.alert('Missing Input', 'Please enter a title or description first');
      return;
    }

    setIsAnalyzing(true);
    setQuickSuggestions([]);

    try {
      // First, analyze the prompt for ambiguity
      const analysis = await analyzePromptForClarification(userIdea);
      setClarificationResult(analysis);
      
      console.log('[CreateOracle] Clarification analysis:', {
        needsClarification: analysis.needsClarification,
        ambiguityScore: analysis.ambiguityScore,
        confidence: analysis.confidence,
        questionCount: analysis.questions.length,
      });

      if (analysis.needsClarification && analysis.questions.length > 0) {
        // Show clarification modal
        setClarificationAnswers({});
        setShowClarificationModal(true);
      } else if (analysis.enhancedPrompt) {
        // No clarification needed, use enhanced prompt directly
        setRefinedPrompt(analysis.enhancedPrompt);
        setShowRefineModal(true);
      } else {
        // Fallback to regular prompt refinement
        const refined = await refinePrompt(userIdea);
        setRefinedPrompt(refined);
        
        // If there are template suggestions, show that modal first
        if (suggestions.length > 0) {
          setShowTemplateSuggestionModal(true);
        } else {
          setShowRefineModal(true);
        }
      }
      
      // Show quick suggestions for improvement
      const quickSugs = getQuickSuggestions(userIdea);
      setQuickSuggestions(quickSugs);
      
    } catch (error: any) {
      console.error('[CreateOracle] Analysis/Refine failed:', error);
      // Fallback to direct refinement
      try {
        const refined = await refinePrompt(userIdea);
        setRefinedPrompt(refined);
        setShowRefineModal(true);
      } catch (fallbackError: any) {
        Alert.alert('Generation Failed', fallbackError.message || 'Failed to process your request. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle clarification answer changes
  const handleClarificationAnswer = (questionId: string, value: string | number | string[]) => {
    setClarificationAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Submit clarification answers and generate enhanced prompt
  const handleSubmitClarifications = async () => {
    if (!clarificationResult) return;
    
    const userIdea = description.trim() 
      ? `${title.trim()}. ${description.trim()}`
      : title.trim();
    
    // Check required questions are answered
    const unansweredRequired = clarificationResult.questions
      .filter(q => q.required && !clarificationAnswers[q.id]);
    
    if (unansweredRequired.length > 0) {
      Alert.alert('Missing Information', `Please answer: ${unansweredRequired[0].question}`);
      return;
    }
    
    setShowClarificationModal(false);
    setIsRefining(true);
    
    try {
      // Build enhanced prompt with answers
      const enhancedInput = buildEnhancedPrompt(userIdea, clarificationAnswers, clarificationResult.questions);
      
      // Now refine the enhanced prompt
      const refined = await refinePrompt(enhancedInput);
      setRefinedPrompt(refined);
      setShowRefineModal(true);
    } catch (error: any) {
      console.error('[CreateOracle] Enhanced refinement failed:', error);
      Alert.alert('Generation Failed', error.message || 'Failed to generate prompt. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  // Skip clarification and proceed with original input
  const handleSkipClarification = async () => {
    setShowClarificationModal(false);
    setIsRefining(true);
    
    const userIdea = description.trim() 
      ? `${title.trim()}. ${description.trim()}`
      : title.trim();
    
    try {
      const refined = await refinePrompt(userIdea);
      setRefinedPrompt(refined);
      setShowRefineModal(true);
    } catch (error: any) {
      Alert.alert('Generation Failed', error.message || 'Failed to generate prompt. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleAcceptRefinedPrompt = async () => {
    setShowRefineModal(false);
    await generateWithPrompt(refinedPrompt);
  };

  const generateWithPrompt = async (prompt: string) => {
    setViewState('generating');
    setPreviewError(false);
    animateProgress(0);
    
    try {
      // Stage 1: Preparing
      setGenerationStatus('Preparing your oracle...');
      animateProgress(10, 300);
      await new Promise(r => setTimeout(r, 300));
      
      // Stage 2: Sending to AI
      setGenerationStatus('Sending to AI...');
      animateProgress(25, 500);
      
      console.log('[CreateOracle] Sending prompt to AI:', prompt);
      
      // Stage 3: Generating (this is the actual API call)
      setGenerationStatus('AI is crafting your oracle...');
      animateProgress(40, 1000);
      
      // AI-only generation - no templates
      const generatedCode = await generateOracleCode(prompt);
      
      // Stage 4: Processing response
      setGenerationStatus('Processing response...');
      animateProgress(75, 500);
      await new Promise(r => setTimeout(r, 300));

      console.log('[CreateOracle] Received code, length:', generatedCode.length);

      const oracleId = generateId();
      const now = Date.now();
      const newOracle: Oracle = {
        id: oracleId,
        title: title.trim() || 'Untitled Oracle',
        description: prompt,
        generatedCode,
        createdAt: now,
        updatedAt: now,
      };

      // Stage 5: Finalizing
      setGenerationStatus('Finalizing...');
      animateProgress(100, 300);
      await new Promise(r => setTimeout(r, 300));
      
      setGeneratedOracle(newOracle);
      setNewOracleId(oracleId);
      setViewState('preview');

      console.log('[CreateOracle] Oracle generated successfully:', newOracle.id);
    } catch (error: any) {
      console.error('[CreateOracle] Generation failed:', error);
      setViewState('input');
      Alert.alert(
        'Generation Failed',
        error.message || 'Failed to generate oracle. Please try again.'
      );
    }
  };

  const handleSaveOracle = async () => {
    if (!generatedOracle) return;
    
    // Add to local context
    addOracle(generatedOracle);
    
    // Save to Firebase if user is authenticated
    if (user?.id) {
      try {
        await firebaseService.saveOracle(user.id, generatedOracle);
        console.log('[CreateOracle] Oracle saved to Firebase:', generatedOracle.id);
      } catch (e) {
        console.warn('[CreateOracle] Failed to save to Firebase (will work locally):', e);
      }
    }
    
    setViewState('saved');
  };

  const handleRefineOracle = () => {
    if (!generatedOracle) return;
    
    // Save first, then navigate to refine
    addOracle(generatedOracle);
    
    if (user?.id) {
      firebaseService.saveOracle(user.id, generatedOracle).catch(e => {
        console.warn('[CreateOracle] Failed to save to Firebase:', e);
      });
    }
    
    router.push(`/refineOracle?oracleId=${generatedOracle.id}`);
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setRefinedPrompt('');
    setViewState('input');
    setNewOracleId(null);
    setGeneratedOracle(null);
    setGenerationProgress(0);
    progressAnim.setValue(0);
    setClarificationResult(null);
    setClarificationAnswers({});
    setQuickSuggestions([]);
  };

  const handlePreviewError = (error: Error) => {
    console.error('[CreateOracle] Preview error:', error);
    setPreviewError(true);
  };

  // Render generating screen
  if (viewState === 'generating') {
    return (
      <View style={styles.generatingContainer}>
        <View style={styles.generatingContent}>
          <Animated.View style={styles.generatingIconContainer}>
            <Sparkles size={64} color={colors.accent} />
          </Animated.View>
          
          <Text style={styles.generatingTitle}>Creating Your Oracle</Text>
          <Text style={styles.generatingStatus}>{generationStatus}</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <Animated.View 
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{Math.round(generationProgress)}%</Text>
          </View>
          
          <Text style={styles.generatingHint}>
            This may take 10-30 seconds depending on complexity
          </Text>
        </View>
      </View>
    );
  }

  // Render preview screen
  if (viewState === 'preview' && generatedOracle) {
    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <View style={styles.previewTitleRow}>
            <Eye size={24} color={colors.accent} />
            <Text style={styles.previewTitle}>Preview Your Oracle</Text>
          </View>
          <Text style={styles.previewSubtitle}>
            Test it out before saving
          </Text>
        </View>
        
        <View style={styles.previewOracleContainer}>
          {previewError ? (
            <View style={styles.previewErrorContainer}>
              <Text style={styles.previewErrorText}>
                Preview encountered an error. You can still save or refine the oracle.
              </Text>
            </View>
          ) : (
            <DynamicOracleRenderer 
              code={generatedOracle.generatedCode}
              onError={handlePreviewError}
            />
          )}
        </View>
        
        <View style={styles.previewActions}>
          <TouchableOpacity
            style={[styles.button, styles.previewRefineButton]}
            onPress={handleRefineOracle}
            activeOpacity={0.85}
          >
            <RefreshCw size={18} color={colors.accent} />
            <Text style={styles.previewRefineButtonText}>Refine Further</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.previewSaveButton]}
            onPress={handleSaveOracle}
            activeOpacity={0.85}
          >
            <Save size={18} color={colors.onAccent} />
            <Text style={styles.buttonText}>Save Oracle</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render saved/success screen
  if (viewState === 'saved') {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.successContainer}>
            <View style={styles.successHeader}>
              <Sparkles size={48} color={colors.success} />
              <Text style={styles.successTitle}>Oracle Saved!</Text>
              <Text style={styles.successText}>Your custom mini-app is ready to use</Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.homeButton]}
                onPress={() => router.push('/(tabs)/index')}
                activeOpacity={0.85}
              >
                <Home size={18} color={colors.text} />
                <Text style={[styles.buttonText, styles.homeButtonText]}>Go Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.refineButton]}
                onPress={() => newOracleId && router.push(`/refineOracle?oracleId=${newOracleId}`)}
                activeOpacity={0.85}
              >
                <Edit3 size={18} color={colors.onAccent} />
                <Text style={styles.buttonText}>View/Edit Oracle</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.newButton]}
                onPress={handleReset}
                activeOpacity={0.85}
              >
                <Wand2 size={18} color={colors.onAccent} />
                <Text style={styles.buttonText}>Create Another</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Render input screen (default)
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Wand2 size={32} color={colors.accent} />
          <Text style={styles.title}>Create Oracle</Text>
          <Text style={styles.subtitle}>
            Describe what you want in natural language - AI will generate a custom mini-app
          </Text>
          {/* Debug button - remove in production */}
          <TouchableOpacity
            style={{ backgroundColor: '#666', padding: 8, borderRadius: 8, marginTop: 8 }}
            onPress={async () => {
              Alert.alert('Testing API', 'Testing connection to xAI API...');
              const result = await testApiConnection();
              Alert.alert(
                result.success ? 'API Test Passed' : 'API Test Failed',
                `${result.message}\n\n${JSON.stringify(result.details, null, 2)}`
              );
            }}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontSize: 12 }}>🔧 Test API Connection</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Title</Text>
          <Text style={styles.hint}>What do you want to track, calculate, or be reminded about?</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Track daily water intake"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Description (Optional)</Text>
          <Text style={styles.hint}>Add more details to help the AI understand your intent</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g., I want to drink 2 liters per day and see my progress"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.button, styles.generatePromptButton, (isRefining || isAnalyzing) && styles.buttonDisabled]}
            onPress={handleGeneratePrompt}
            disabled={isRefining || isAnalyzing}
            activeOpacity={0.85}
          >
            {isAnalyzing ? (
              <>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.generatePromptButtonText}>Analyzing Your Request...</Text>
              </>
            ) : isRefining ? (
              <>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.generatePromptButtonText}>Generating Prompt...</Text>
              </>
            ) : (
              <>
                <Sparkles size={18} color={colors.accent} />
                <Text style={styles.generatePromptButtonText}>Generate AI Prompt</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Quick suggestions */}
          {quickSuggestions.length > 0 && (
            <View style={styles.suggestionsCard}>
              <View style={styles.suggestionsHeader}>
                <Lightbulb size={16} color={colors.warning} />
                <Text style={styles.suggestionsTitle}>Suggestions to improve your prompt:</Text>
              </View>
              {quickSuggestions.map((suggestion, index) => (
                <Text key={index} style={styles.suggestionText}>• {suggestion}</Text>
              ))}
            </View>
          )}

          <View style={styles.examplesCard}>
            <Text style={styles.examplesTitle}>💡 Example ideas:</Text>
            <Text style={styles.exampleText}>• Track my daily water intake with quick add buttons and a chart</Text>
            <Text style={styles.exampleText}>• Hockey line manager for setting up player rosters</Text>
            <Text style={styles.exampleText}>• Grocery shopping list with categories and checkboxes</Text>
            <Text style={styles.exampleText}>• Workout tracker with exercise sets and rest timer</Text>
          </View>
        </View>
      </ScrollView>

      {/* AI Prompt Modal */}
      <Modal
        visible={showRefineModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRefineModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <Pressable 
              style={styles.modalBackdrop} 
              onPress={() => {
                Keyboard.dismiss();
                setShowRefineModal(false);
              }}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Sparkles size={24} color={colors.accent} />
                <Text style={styles.modalTitle}>AI-Generated Prompt</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowRefineModal(false);
                  }}
                >
                  <X size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalHint}>
                Review and edit the prompt, then generate your oracle!
              </Text>

              <TextInput
                style={styles.modalTextArea}
                value={refinedPrompt}
                onChangeText={setRefinedPrompt}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                placeholder="AI prompt will appear here..."
                placeholderTextColor={colors.inputPlaceholder}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.modalCancelButton]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowRefineModal(false);
                  }}
                  activeOpacity={0.85}
                >
                  <X size={18} color={colors.text} />
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.modalAcceptButton]}
                  onPress={() => {
                    Keyboard.dismiss();
                    handleAcceptRefinedPrompt();
                  }}
                  activeOpacity={0.85}
                >
                  <Wand2 size={18} color={colors.onAccent} />
                  <Text style={styles.buttonText}>Generate Oracle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Clarification Modal */}
      <Modal
        visible={showClarificationModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowClarificationModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <Pressable 
              style={styles.modalBackdrop} 
              onPress={() => {
                Keyboard.dismiss();
                setShowClarificationModal(false);
              }}
            />
            <View style={[styles.modalContent, styles.clarificationModalContent]}>
              <View style={styles.modalHeader}>
                <HelpCircle size={24} color={colors.accent} />
                <Text style={styles.modalTitle}>Quick Questions</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowClarificationModal(false);
                  }}
                >
                  <X size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {clarificationResult && (
                <>
                  <View style={styles.clarificationIntro}>
                    <AlertCircle size={16} color={colors.warning} />
                    <Text style={styles.clarificationIntroText}>
                      Help us understand your needs better for a more accurate result
                    </Text>
                  </View>

                  {clarificationResult.confidence < 0.7 && (
                    <View style={styles.confidenceBar}>
                      <Text style={styles.confidenceLabel}>Clarity Score</Text>
                      <View style={styles.confidenceTrack}>
                        <View 
                          style={[
                            styles.confidenceFill, 
                            { 
                              width: `${clarificationResult.confidence * 100}%`,
                              backgroundColor: clarificationResult.confidence > 0.5 ? colors.success : colors.warning,
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.confidenceValue}>{Math.round(clarificationResult.confidence * 100)}%</Text>
                    </View>
                  )}

                  <ScrollView style={styles.questionsContainer} showsVerticalScrollIndicator={false}>
                    {clarificationResult.questions.map((question, index) => (
                      <View key={question.id} style={styles.questionCard}>
                        <View style={styles.questionHeader}>
                          <Text style={styles.questionNumber}>{index + 1}</Text>
                          <Text style={styles.questionText}>
                            {question.question}
                            {question.required && <Text style={styles.requiredStar}> *</Text>}
                          </Text>
                        </View>

                        {question.inputType === 'select' && question.options && (
                          <View style={styles.optionsContainer}>
                            {question.options.map((option) => (
                              <TouchableOpacity
                                key={option}
                                style={[
                                  styles.optionButton,
                                  clarificationAnswers[question.id] === option && styles.optionButtonSelected,
                                ]}
                                onPress={() => handleClarificationAnswer(question.id, option)}
                                activeOpacity={0.7}
                              >
                                {clarificationAnswers[question.id] === option ? (
                                  <CheckCircle size={16} color={colors.accent} />
                                ) : (
                                  <View style={styles.optionCircle} />
                                )}
                                <Text 
                                  style={[
                                    styles.optionText,
                                    clarificationAnswers[question.id] === option && styles.optionTextSelected,
                                  ]}
                                >
                                  {option}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        {question.inputType === 'multiselect' && question.options && (
                          <View style={styles.optionsContainer}>
                            {question.options.map((option) => {
                              const selected = Array.isArray(clarificationAnswers[question.id]) 
                                && (clarificationAnswers[question.id] as string[]).includes(option);
                              return (
                                <TouchableOpacity
                                  key={option}
                                  style={[
                                    styles.optionButton,
                                    selected && styles.optionButtonSelected,
                                  ]}
                                  onPress={() => {
                                    const current = (clarificationAnswers[question.id] as string[]) || [];
                                    const newValue = selected
                                      ? current.filter(v => v !== option)
                                      : [...current, option];
                                    handleClarificationAnswer(question.id, newValue);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  {selected ? (
                                    <CheckCircle size={16} color={colors.accent} />
                                  ) : (
                                    <View style={styles.optionCircle} />
                                  )}
                                  <Text 
                                    style={[
                                      styles.optionText,
                                      selected && styles.optionTextSelected,
                                    ]}
                                  >
                                    {option}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}

                        {question.inputType === 'text' && (
                          <TextInput
                            style={styles.questionInput}
                            value={(clarificationAnswers[question.id] as string) || ''}
                            onChangeText={(text) => handleClarificationAnswer(question.id, text)}
                            placeholder={question.placeholder || 'Type your answer...'}
                            placeholderTextColor={colors.textMuted}
                          />
                        )}

                        {question.inputType === 'number' && (
                          <TextInput
                            style={styles.questionInput}
                            value={String(clarificationAnswers[question.id] || '')}
                            onChangeText={(text) => handleClarificationAnswer(question.id, Number(text) || 0)}
                            placeholder={question.placeholder || 'Enter a number...'}
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                          />
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.modalSkipButton]}
                  onPress={handleSkipClarification}
                  activeOpacity={0.85}
                >
                  <ChevronRight size={18} color={colors.textSecondary} />
                  <Text style={styles.modalSkipButtonText}>Skip & Proceed</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.modalAcceptButton]}
                  onPress={handleSubmitClarifications}
                  activeOpacity={0.85}
                >
                  <Check size={18} color={colors.onAccent} />
                  <Text style={styles.buttonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: 16,
    padding: 16,
    color: colors.inputText,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  examplesCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
    marginTop: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 6,
  },
  successContainer: {
    flex: 1,
    paddingTop: 60,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.success,
    marginTop: 20,
  },
  successText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
  },
  homeButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  homeButtonText: {
    color: colors.text,
  },
  refineButton: {
    backgroundColor: colors.accent,
  },
  newButton: {
    backgroundColor: colors.accentDark,
  },
  // Generate AI Prompt button styles
  generatePromptButton: {
    backgroundColor: colors.accent,
    marginTop: 16,
  },
  generatePromptButtonText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  modalTextArea: {
    backgroundColor: colors.inputBackground,
    borderRadius: 16,
    padding: 16,
    color: colors.inputText,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    minHeight: 150,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  modalCancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalAcceptButton: {
    flex: 2,
    backgroundColor: colors.accent,
  },
  // Template suggestion styles
  templateSuggestionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFB800',
  },
  templateSuggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateSuggestionName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  matchBadge: {
    backgroundColor: '#FFB800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  templateSuggestionDesc: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  useTemplateButton: {
    flex: 2,
    backgroundColor: '#FFB800',
  },
  // Generating screen styles
  generatingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  generatingContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  generatingIconContainer: {
    marginBottom: 32,
  },
  generatingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  generatingStatus: {
    fontSize: 16,
    color: colors.accent,
    marginBottom: 32,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressBackground: {
    width: '100%',
    height: 10,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  generatingHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Preview screen styles
  previewContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  previewHeader: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  previewSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 34,
  },
  previewOracleContainer: {
    flex: 1,
  },
  previewErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  previewErrorText: {
    fontSize: 14,
    color: colors.warning,
    textAlign: 'center',
    lineHeight: 20,
  },
  previewActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  previewRefineButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent,
    shadowOpacity: 0,
    elevation: 0,
  },
  previewRefineButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  previewSaveButton: {
    flex: 1,
    backgroundColor: colors.accent,
  },
  // Suggestions card styles
  suggestionsCard: {
    backgroundColor: colors.warning + '15',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    marginTop: 8,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
  },
  suggestionText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginLeft: 24,
  },
  // Clarification modal styles
  clarificationModalContent: {
    maxHeight: '85%',
  },
  clarificationIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warning + '15',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  clarificationIntroText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  confidenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  confidenceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    width: 80,
  },
  confidenceTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 36,
    textAlign: 'right',
  },
  questionsContainer: {
    maxHeight: 350,
    marginBottom: 16,
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  questionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    color: colors.onAccent,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 13,
    fontWeight: '700',
    overflow: 'hidden',
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 21,
  },
  requiredStar: {
    color: colors.error,
    fontWeight: '700',
  },
  optionsContainer: {
    gap: 8,
    marginLeft: 34,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  optionButtonSelected: {
    backgroundColor: colors.accent + '15',
    borderColor: colors.accent,
  },
  optionCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.accent,
    fontWeight: '500',
  },
  questionInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 12,
    color: colors.inputText,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginLeft: 34,
  },
  modalSkipButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  modalSkipButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
});
