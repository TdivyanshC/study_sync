import { Schema, model, models, Document } from 'mongoose';

// Define the SpaceMember interface
export interface ISpaceMember extends Document {
  _id: string; // UUID
  spaceId: string; // Reference to Space
  userId: string; // Reference to User
  role: 'owner' | 'member';
  joinedAt: Date;
}

// Define the SpaceMember schema
const SpaceMemberSchema = new Schema<ISpaceMember>(
  {
    spaceId: { 
      type: String, 
      required: true 
    },
    userId: { 
      type: String, 
      required: true 
    },
    role: { 
      type: String, 
      enum: ['owner', 'member'], 
      default: 'member' 
    },
    joinedAt: { 
      type: Date, 
      default: Date.now 
    }
  },
  {
    timestamps: true, // Creates createdAt and updatedAt automatically
  }
);

// Indexes for fast lookups
SpaceMemberSchema.index({ spaceId: 1 });
SpaceMemberSchema.index({ userId: 1 });
SpaceMemberSchema.index({ spaceId: 1, role: 1 });
SpaceMemberSchema.index({ spaceId: 1, userId: 1 }, { unique: true }); // Prevent duplicate memberships

// Create or get the SpaceMember model
const SpaceMember = models.SpaceMember || model<ISpaceMember>('SpaceMember', SpaceMemberSchema);

export default SpaceMember;