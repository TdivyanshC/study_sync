import { Schema, model, models, Document } from 'mongoose';

// Define the Space interface
export interface ISpace extends Document {
  _id: string; // UUID
  createdBy: string; // Reference to User
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: Date;
}

// Define the Space schema
const SpaceSchema = new Schema<ISpace>(
  {
    createdBy: { 
      type: String, 
      required: true 
    },
    name: { 
      type: String, 
      required: true 
    },
    description: { 
      type: String 
    },
    isPublic: { 
      type: Boolean, 
      default: false 
    }
  },
  {
    timestamps: true, // Creates createdAt and updatedAt automatically
  }
);

// Indexes for fast lookups
SpaceSchema.index({ createdBy: 1 });
SpaceSchema.index({ isPublic: 1 });

// Create or get the Space model
const Space = models.Space || model<ISpace>('Space', SpaceSchema);

export default Space;