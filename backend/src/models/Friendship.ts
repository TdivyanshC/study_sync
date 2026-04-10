import { Schema, model, models, Document } from 'mongoose';

// Define the Friendship interface
import { Types } from 'mongoose';

export interface IFriendship extends Document {
  _id: Types.ObjectId;
  requesterId: Types.ObjectId; // Reference to User
  receiverId: Types.ObjectId; // Reference to User
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

// Define the Friendship schema
import { Types } from 'mongoose';

const FriendshipSchema = new Schema<IFriendship>(
  {
    requesterId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiverId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  },
  {
    timestamps: true, // Creates createdAt and updatedAt automatically
  }
);

// Indexes for friendship queries
FriendshipSchema.index({ requesterId: 1 });
FriendshipSchema.index({ receiverId: 1 });
FriendshipSchema.index({ status: 1 });
FriendshipSchema.index({ requesterId: 1, receiverId: 1 }, { unique: true }); // Prevent duplicate friendships
FriendshipSchema.index({ requesterId: 1, receiverId: 1, status: 1 });
FriendshipSchema.index({ receiverId: 1, status: 1 }); // For pending requests query
FriendshipSchema.index({ createdAt: -1 }); // For recent friendships

// Create or get the Friendship model
const Friendship = models.Friendship || model<IFriendship>('Friendship', FriendshipSchema);

export default Friendship;