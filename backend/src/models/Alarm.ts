import { Schema, model, models, Document } from 'mongoose';

export interface IAlarm extends Document {
  _id: string;
  userId: string;
  sessionTypeId?: string;
  spaceId?: string;
  title: string;
  description?: string;
  time: string; // HH:MM format
  repeatDays: string[]; // ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  isEnabled: boolean;
  alarmType: 'session_reminder' | 'space_reminder';
  createdAt: Date;
}

const AlarmSchema = new Schema<IAlarm>(
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
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    time: {
      type: String,
      required: true
    },
    repeatDays: {
      type: [String],
      default: []
    },
    isEnabled: {
      type: Boolean,
      default: true
    },
    alarmType: {
      type: String,
      enum: ['session_reminder', 'space_reminder'],
      default: 'session_reminder'
    }
  },
  {
    timestamps: true
  }
);

AlarmSchema.index({ userId: 1 });
AlarmSchema.index({ userId: 1, isEnabled: 1 });
AlarmSchema.index({ spaceId: 1 });

const Alarm = models.Alarm || model<IAlarm>('Alarm', AlarmSchema);

export default Alarm;
