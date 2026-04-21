import { Schema, model, models, Document, Types } from 'mongoose';

// Define the User interface
export interface IUser {
  _id: Types.ObjectId; // MongoDB document ID (auto-generated)
  email: string;
  gmailName?: string;
  username: string;
  publicUserId: string;
  avatarUrl?: string;
  displayName?: string;
  gender?: string;
  age?: number;
  relationshipStatus?: string;
  preferredSessions: string[]; // Array of session type IDs
  xp: number;
  level: number;
  onboardingCompleted: boolean;
  onboardingCompletedAt?: Date;
  currentActivity?: string; // Current activity type (e.g., 'study_session', 'gym')
  activityStartedAt?: Date; // When current activity started
  totalHoursToday: number; // Total hours studied today
  createdAt: Date;
  updatedAt: Date;
}

// Define the User schema
const UserSchema = new Schema<IUser>(
  {
    email: { 
      type: String, 
      required: true, 
      unique: true 
    },
    gmailName: { type: String },
    username: { 
      type: String, 
      required: true, 
      unique: true 
    },
    publicUserId: { 
      type: String, 
      required: true, 
      unique: true 
    },
    avatarUrl: { type: String },
    displayName: { type: String },
    gender: { type: String },
    age: { type: Number },
    relationshipStatus: { type: String },
    preferredSessions: { 
      type: [String], 
      default: [] 
    },
    onboardingCompleted: {
      type: Boolean,
      default: false
    },
    onboardingCompletedAt: { type: Date },
    xp: {
      type: Number,
      default: 0
    },
    level: {
      type: Number,
      default: 1
    },
    currentActivity: { type: String },
    activityStartedAt: { type: Date },
    totalHoursToday: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true, // Creates createdAt and updatedAt automatically
  }
);

// Indexes for fast lookups
UserSchema.index({ onboardingCompleted: 1 }, { partialFilterExpression: { onboardingCompleted: false } });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ publicUserId: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 'text', displayName: 'text' }); // Text index for search
UserSchema.index({ currentActivity: 1, activityStartedAt: 1 }); // For activity queries
UserSchema.index({ totalHoursToday: -1 }); // For leaderboard/ranking

// Create or get the User model
const User = models.User || model('User', UserSchema);

export default User;