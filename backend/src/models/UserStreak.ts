import { Schema, model, models, Document } from 'mongoose';

// Define the UserStreak interface
export interface IUserStreak extends Document {
  _id: string; // UUID
  userId: string; // Reference to User (unique)
  currentStreak: number;
  bestStreak: number;
  lastUpdated: Date;
  streakMultiplier: number;
  createdAt: Date;
  updatedAt: Date;
}

// Define the UserStreak schema
const UserStreakSchema = new Schema<IUserStreak>(
  {
    userId: { 
      type: String, 
      required: true, 
      unique: true 
    },
    currentStreak: { 
      type: Number, 
      default: 0 
    },
    bestStreak: { 
      type: Number, 
      default: 0 
    },
    lastUpdated: { 
      type: Date 
    },
    streakMultiplier: { 
      type: Number, 
      default: 1.00 
    }
  },
  {
    timestamps: true, // Creates createdAt and updatedAt automatically
  }
);

// Indexes for fast lookups
UserStreakSchema.index({ userId: 1 });
UserStreakSchema.index({ lastUpdated: 1 });

// Create or get the UserStreak model
const UserStreak = models.UserStreak || model<IUserStreak>('UserStreak', UserStreakSchema);

export default UserStreak;