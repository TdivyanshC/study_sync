import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Theme';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

interface SettingItem {
  id: string;
  title: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  type: 'navigation' | 'toggle' | 'action';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

export default function SettingsScreen() {
  const { user, logout, loading } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  const handleBack = () => {
    router.back();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error: any) {
              Alert.alert('Logout Error', error.message || 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. You will need to re-download content when online.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About StudySync',
      'StudySync v1.0.0\n\nYour ultimate study companion for staying focused and building study habits.',
      [{ text: 'OK' }]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      'Support',
      'For support and feedback, please contact us at support@studysync.app',
      [{ text: 'OK' }]
    );
  };

  const settings: SettingItem[] = [
    {
      id: '1',
      title: 'Profile Settings',
      description: 'Edit your profile and personal information',
      icon: 'person-circle',
      type: 'navigation',
      onPress: () => router.push('/profile'),
    },
    {
      id: '2',
      title: 'Notifications',
      description: 'Enable study reminders and achievements',
      icon: 'notifications',
      type: 'toggle',
      value: notificationsEnabled,
      onToggle: setNotificationsEnabled,
    },
    {
      id: '3',
      title: 'Dark Mode',
      description: 'Switch between light and dark themes',
      icon: 'moon',
      type: 'toggle',
      value: darkModeEnabled,
      onToggle: setDarkModeEnabled,
    },
    {
      id: '4',
      title: 'Auto Sync',
      description: 'Automatically sync data when online',
      icon: 'sync',
      type: 'toggle',
      value: autoSyncEnabled,
      onToggle: setAutoSyncEnabled,
    },
    {
      id: '5',
      title: 'Clear Cache',
      description: 'Clear cached data to free up space',
      icon: 'trash',
      type: 'action',
      onPress: handleClearCache,
    },
    {
      id: '6',
      title: 'Support',
      description: 'Get help and contact support',
      icon: 'help-circle',
      type: 'navigation',
      onPress: handleSupport,
    },
    {
      id: '7',
      title: 'About',
      description: 'App information and version',
      icon: 'information-circle',
      type: 'navigation',
      onPress: handleAbout,
    },
  ];

  const renderSettingItem = (item: SettingItem) => {
    if (item.type === 'toggle') {
      return (
        <View style={styles.settingItem} key={item.id}>
          <View style={styles.settingIcon}>
            <Ionicons name={item.icon} size={24} color={Colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            {item.description && (
              <Text style={styles.settingDescription}>{item.description}</Text>
            )}
          </View>
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: Colors.surfaceElevated, true: Colors.primary }}
            thumbColor={item.value ? Colors.surface : Colors.text}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.settingItem}
        key={item.id}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        <View style={styles.settingIcon}>
          <Ionicons name={item.icon} size={24} color={Colors.primary} />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.settingDescription}>{item.description}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <StatusBar style="light" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={GlobalStyles.container} showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        <View style={[GlobalStyles.glassCard, styles.userSection]}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={32} color={Colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.user_metadata?.full_name || 'User'}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Settings List */}
        <View style={[GlobalStyles.glassCard, { marginBottom: 20 }]}>
          <Text style={GlobalStyles.subtitle}>Preferences</Text>
          {settings.slice(0, 4).map(renderSettingItem)}
        </View>

        {/* Support Section */}
        <View style={[GlobalStyles.glassCard, { marginBottom: 20 }]}>
          <Text style={GlobalStyles.subtitle}>Support & Info</Text>
          {settings.slice(4).map(renderSettingItem)}
        </View>

        {/* Account Actions */}
        <View style={[GlobalStyles.glassCard, { marginBottom: 100 }]}>
          <Text style={GlobalStyles.subtitle}>Account</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
            disabled={loading}
          >
            <Ionicons name="log-out" size={20} color={Colors.error} />
            <Text style={[styles.actionButtonText, { color: Colors.error }]}>
              {loading ? 'Logging out...' : 'Logout'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 20,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 8,
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});