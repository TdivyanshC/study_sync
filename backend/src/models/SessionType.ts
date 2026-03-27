import { Schema, model, models, Document } from 'mongoose';

// Define the SessionType interface
export interface ISessionType extends Document {
  userId: string; // Reference to User
  name: string;
  icon: string;
  color: string;
  createdAt: Date;
}

// Define the SessionType schema
const SessionTypeSchema = new Schema<ISessionType>(
  {
    userId: { 
      type: String, 
      required: true 
    },
    name: { 
      type: String, 
      required: true 
    },
    icon: { 
      type: String, 
      required: true 
    },
    color: { 
      type: String, 
      required: true 
    }
  },
  {
    timestamps: true, // Creates createdAt and updatedAt automatically
  }
);

// Compound index for user_id and name (to prevent duplicates per user)
SessionTypeSchema.index({ userId: 1, name: 1 }, { unique: true });

// Create or get the SessionType model
const SessionType = models.SessionType || model<ISessionType>('SessionType', SessionTypeSchema);

export default SessionType;