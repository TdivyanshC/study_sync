import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';

interface HeroImageProps {
  children?: React.ReactNode;
}

export default function HeroImage({ children }: HeroImageProps) {
  return (
    <View style={styles.heroContainer}>
      <LinearGradient
        colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.1)']}
        style={styles.heroBackground}
      >
        {/* Main Study Book */}
        <View style={styles.bookContainer}>
          <View style={styles.book}>
            <View style={styles.bookPages}>
              <View style={styles.bookLine} />
              <View style={styles.bookLine} />
              <View style={styles.bookLine} />
              <View style={styles.bookLine} />
              <View style={styles.bookLine} />
            </View>
            <View style={styles.bookmark} />
          </View>
        </View>

        {/* Timer Clock */}
        <View style={styles.clockContainer}>
          <View style={styles.clock}>
            <View style={styles.clockFace}>
              <View style={[styles.clockHand, styles.clockHandHour]} />
              <View style={[styles.clockHand, styles.clockHandMinute]} />
              <View style={styles.clockCenter} />
            </View>
          </View>
        </View>

        {/* XP Stars */}
        <View style={styles.starsContainer}>
          <Text style={styles.star}>⭐</Text>
          <Text style={[styles.star, styles.star2]}>✨</Text>
          <Text style={[styles.star, styles.star3]}>🌟</Text>
        </View>

        {/* Achievement Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🏆</Text>
          </View>
        </View>

        {/* Study Streak Flames */}
        <View style={styles.flamesContainer}>
          <Text style={styles.flame}>🔥</Text>
          <Text style={[styles.flame, styles.flame2]}>🔥</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
            <View style={styles.progressDot} />
          </View>
        </View>

        {/* Daily Goal Card */}
        <View style={styles.goalContainer}>
          <Text style={styles.goalText}>Daily Goal</Text>
          <Text style={styles.goalSubtext}>2/3 Complete</Text>
        </View>

        {/* XP Reward */}
        <View style={styles.xpContainer}>
          <Text style={styles.xpText}>+50 XP</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    height: 250,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 20,
  },
  heroBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Main Study Book
  bookContainer: {
    position: 'absolute',
    top: 80,
    left: 120,
  },
  book: {
    width: 80,
    height: 60,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bookPages: {
    backgroundColor: 'white',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    height: '100%',
    justifyContent: 'space-around',
  },
  bookLine: {
    height: 2,
    backgroundColor: Colors.primary,
    opacity: 0.6,
  },
  bookmark: {
    position: 'absolute',
    top: -8,
    right: 10,
    width: 8,
    height: 16,
    backgroundColor: Colors.streak,
    borderRadius: 2,
  },
  // Timer Clock
  clockContainer: {
    position: 'absolute',
    top: 40,
    right: 80,
  },
  clock: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.streak,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  clockFace: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  clockHand: {
    position: 'absolute',
    backgroundColor: Colors.primary,
    transformOrigin: 'bottom center',
  },
  clockHandHour: {
    width: 2,
    height: 12,
    top: 8,
    borderRadius: 1,
  },
  clockHandMinute: {
    width: 2,
    height: 15,
    top: 5,
    borderRadius: 1,
  },
  clockCenter: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  // XP Stars
  starsContainer: {
    position: 'absolute',
    top: 60,
    left: 40,
  },
  star: {
    fontSize: 20,
    marginBottom: 5,
  },
  star2: {
    fontSize: 16,
    marginLeft: 20,
  },
  star3: {
    fontSize: 14,
    marginLeft: -10,
  },
  // Achievement Badge
  badgeContainer: {
    position: 'absolute',
    top: 140,
    right: 50,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.streak,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  badgeText: {
    fontSize: 18,
  },
  // Study Streak Flames
  flamesContainer: {
    position: 'absolute',
    bottom: 40,
    left: 60,
  },
  flame: {
    fontSize: 18,
    marginBottom: 2,
  },
  flame2: {
    fontSize: 14,
    opacity: 0.7,
  },
  // Progress Bar
  progressContainer: {
    position: 'absolute',
    bottom: 20,
    left: 80,
  },
  progressTrack: {
    width: 150,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    position: 'relative',
  },
  progressFill: {
    width: 105,
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressDot: {
    position: 'absolute',
    right: -3,
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  // Daily Goal Card
  goalContainer: {
    position: 'absolute',
    bottom: 60,
    left: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    minWidth: 80,
    alignItems: 'center',
  },
  goalText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  goalSubtext: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  // XP Reward
  xpContainer: {
    position: 'absolute',
    bottom: 60,
    right: 40,
    backgroundColor: Colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  xpText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});