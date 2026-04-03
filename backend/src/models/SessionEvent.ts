import { Schema, model, models, Document } from 'mongoose';

// Define the SessionEvent interface
export interface ISessionEvent extends Document {
  _id: string; // UUID
  userId: string; // Reference to User
  sessionTypeId?: string; // Reference to SessionType
  spaceId?: string; // Reference to Space
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  efficiency?: number; // 0-100
  notes?: string;
  createdAt: Date;
}

// Define the SessionEvent schema
const SessionEventSchema = new Schema<ISessionEvent>(
  {
    userId: { 
      type: String, 
      required: true 
    },
    sessionTypeId: { 
      type: String 
    },
    spaceId: { 
      type: String 
    },
    startedAt: { 
      type: Date, 
      required: true 
    },
    endedAt: { 
      type: Date 
    },
    durationSeconds: { 
      type: Number 
    },
    efficiency: { 
      type: Number, 
      min: 0, 
      max: 100 
    },
    notes: { 
      type: String 
    }
  },
  {
    timestamps: true, // Creates createdAt and updatedAt automatically
  }
);

// Critical indexes for hot paths
SessionEventSchema.index({ userId: 1, startedAt: -1 });
SessionEventSchema.index({ spaceId: 1, startedAt: -1 });
SessionEventSchema.index({ userId: 1, endedAt: 1 }, { partialFilterExpression: { endedAt: { $exists: true } } });
SessionEventSchema.index({ sessionTypeId: 1 });
SessionEventSchema.index({ createdAt: -1 });

// Create or get the SessionEvent model
const SessionEvent = models.SessionEvent || model<ISessionEvent>('SessionEvent', SessionEventSchema);

export default SessionEvent;