import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import ProgressBar from '../components/ProgressBar';

interface OnboardingData {
  gender: string;
  age: string;
  relationship: string;
}

const GENDER_OPTIONS = [
  { id: 'male', label: 'Male', emoji: '👨', color: '#3b82f6' },
  { id: 'female', label: 'Female', emoji: '👩', color: '#ec4899' },
  { id: 'other', label: 'Other', emoji: '🧑', color: '#8b5cf6' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say', emoji: '🤷', color: '#6b7280' },
];

const AGE_OPTIONS = Array.from({ length: 82 }, (_, i) => (i + 18).toString()); // 18-99
const RELATIONSHIP_OPTIONS = [
  'Single',
  'In a relationship',
  'Engaged',
  'Married',
  'Divorced',
  'Widowed',
  'Prefer not to say',
];

export default function OnboardingStep1() {
  const [formData, setFormData] = useState<OnboardingData>({
    gender: '',
    age: '',
    relationship: '',
  });

  const [showAgeDropdown, setShowAgeDropdown] = useState(false);
  const [showRelationshipDropdown, setShowRelationshipDropdown] = useState(false);

  const handleGenderSelect = (genderId: string) => {
    setFormData(prev => ({ ...prev, gender: genderId }));
  };

  const handleAgeSelect = (age: string) => {
    setFormData(prev => ({ ...prev, age }));
    setShowAgeDropdown(false);
  };

  const handleRelationshipSelect = (relationship: string) => {
    setFormData(prev => ({ ...prev, relationship }));
    setShowRelationshipDropdown(false);
  };

  const canProceed = formData.gender && formData.age && formData.relationship;

  const handleContinue = () => {
    if (!canProceed) {
      Alert.alert('Missing Information', 'Please fill in all fields to continue.');
      return;
    }
    router.push('/onboarding-step2');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProgressBar currentStep={1} totalSteps={2} />
        
        <Text style={styles.title}>Let's get to know you</Text>
        <Text style={styles.subtitle}>
          This helps us personalize your experience
        </Text>

        {/* Gender Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gender</Text>
          <Text style={styles.sectionSubtitle}>Choose how you identify</Text>
          
          <View style={styles.genderContainer}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.genderCard,
                  formData.gender === option.id && styles.genderCardSelected,
                  { borderColor: option.color }
                ]}
                onPress={() => handleGenderSelect(option.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.genderIconContainer,
                  { backgroundColor: option.color + '20' }
                ]}>
                  <Text style={styles.genderEmoji}>{option.emoji}</Text>
                </View>
                <Text style={[
                  styles.genderLabel,
                  formData.gender === option.id && styles.genderLabelSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Age Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Age</Text>
          <Text style={styles.sectionSubtitle}>How old are you?</Text>
          
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowAgeDropdown(!showAgeDropdown)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.dropdownButtonText,
              !formData.age && styles.dropdownButtonPlaceholder
            ]}>
              {formData.age ? `${formData.age} years` : 'Select your age'}
            </Text>
            <Text style={styles.dropdownArrow}>
              {showAgeDropdown ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {showAgeDropdown && (
            <View style={styles.dropdownContainer}>
              <ScrollView 
                style={styles.dropdownScrollView}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {AGE_OPTIONS.map((age) => (
                  <TouchableOpacity
                    key={age}
                    style={[
                      styles.dropdownItem,
                      formData.age === age && styles.dropdownItemSelected
                    ]}
                    onPress={() => handleAgeSelect(age)}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      formData.age === age && styles.dropdownItemTextSelected
                    ]}>
                      {age} years
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Relationship Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relationship Status</Text>
          <Text style={styles.sectionSubtitle}>What's your current status?</Text>
          
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowRelationshipDropdown(!showRelationshipDropdown)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.dropdownButtonText,
              !formData.relationship && styles.dropdownButtonPlaceholder
            ]}>
              {formData.relationship || 'Select your relationship status'}
            </Text>
            <Text style={styles.dropdownArrow}>
              {showRelationshipDropdown ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {showRelationshipDropdown && (
            <View style={styles.dropdownContainer}>
              {RELATIONSHIP_OPTIONS.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.dropdownItem,
                    formData.relationship === status && styles.dropdownItemSelected
                  ]}
                  onPress={() => handleRelationshipSelect(status)}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    formData.relationship === status && styles.dropdownItemTextSelected
                  ]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            !canProceed && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!canProceed}
        >
          <Text style={[
            styles.continueButtonText,
            !canProceed && styles.continueButtonTextDisabled
          ]}>
            Continue
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  // Gender Selection Styles
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genderCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  genderCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  genderIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  genderEmoji: {
    fontSize: 28,
  },
  genderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  genderLabelSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  // Dropdown Styles
  dropdownButton: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  dropdownButtonPlaceholder: {
    color: Colors.textMuted,
  },
  dropdownArrow: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 12,
  },
  dropdownContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    maxHeight: 200,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.primary + '20',
  },
  dropdownItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  dropdownItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  // Continue Button
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.6,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButtonTextDisabled: {
    color: Colors.textSecondary,
  },
});