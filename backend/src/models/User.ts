import { Schema, model, models, Document } from 'mongoose';

// Define the User interface
export interface IUser extends Document<string, any, IUser> {
  _id: string; // MongoDB document ID (auto-generated)
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
  onboardingCompleted: boolean;
  onboardingCompletedAt?: Date;
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
    onboardingCompletedAt: { type: Date }
  },
  {
    timestamps: true, // Creates createdAt and updatedAt automatically
  }
);

// Indexes for fast lookups
UserSchema.index({ onboardingCompleted: 1 }, { partialFilterExpression: { onboardingCompleted: false } });

// Create or get the User model
const User = (models.User as ReturnType<typeof model<IUser>>) || model<IUser>('User', UserSchema);

export default User;