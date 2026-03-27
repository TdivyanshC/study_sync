import Space from '../models/Space';
import SpaceMember from '../models/SpaceMember';
import SessionEvent from '../models/SessionEvent';
import { Types } from 'mongoose';
import { statsService } from './stats.service';

export interface Space {
  id: string;
  created_by: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface SpaceMember {
  id: string;
  space_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface CreateSpaceInput {
  name: string;
  description?: string;
  created_by: string;
}

export class SpaceService {
  /**
   * Create a new space with creator as owner
   */
  async createSpace(input: CreateSpaceInput): Promise<Space> {
    // Create space
    const space = await Space.create({
      _id: new Types.ObjectId().toHexString(), // Generate UUID-like ID
      name: input.name,
      description: input.description,
      createdBy: input.created_by,
    });

    // Add creator as owner member
    await SpaceMember.create({
      _id: new Types.ObjectId().toHexString(), // Generate UUID-like ID
      spaceId: space._id,
      userId: input.created_by,
      role: 'owner',
    });

    return {
      id: space._id,
      created_by: space.createdBy,
      name: space.name,
      description: space.description,
      created_at: space.createdAt.toISOString(),
    };
  }

  /**
   * Get space by ID
   */
  async getSpace(spaceId: string): Promise<Space | null> {
    const space = await Space.findById(spaceId);

    if (!space) {
      return null;
    }

    return {
      id: space._id,
      created_by: space.createdBy,
      name: space.name,
      description: space.description,
      created_at: space.createdAt.toISOString(),
    };
  }

  /**
   * Get all spaces for a user
   */
  async getUserSpaces(userId: string): Promise<Space[]> {
    const spaceMembers = await SpaceMember.find({ userId: userId }).populate('spaceId');

    return spaceMembers
      .map(member => member.spaceId)
      .filter((space): space is ImportType<typeof Space> => space !== null)
      .map(space => ({
        id: space._id,
        created_by: space.createdBy,
        name: space.name,
        description: space.description,
        created_at: space.createdAt.toISOString(),
      }));
  }

  /**
   * Check if user is a member of space
   */
  async isMember(spaceId: string, userId: string): Promise<boolean> {
    const member = await SpaceMember.findOne({ spaceId, userId: userId });
    return !!member;
  }

  /**
   * Get user's role in space
   */
  async getMemberRole(spaceId: string, userId: string): Promise<string | null> {
    const member = await SpaceMember.findOne({ spaceId, userId: userId });
    return member ? member.role : null;
  }

  /**
   * Add user to space
   */
  async joinSpace(spaceId: string, userId: string): Promise<SpaceMember> {
    // Check if already a member
    const isMember = await this.isMember(spaceId, userId);
    if (isMember) {
      throw new Error('Already a member of this space');
    }

    const spaceMember = await SpaceMember.create({
      _id: new Types.ObjectId().toHexString(), // Generate UUID-like ID
      spaceId: spaceId,
      userId: userId,
      role: 'member',
    });

    return {
      id: spaceMember._id,
      space_id: spaceMember.spaceId,
      user_id: spaceMember.userId,
      role: spaceMember.role,
      joined_at: spaceMember.joinedAt.toISOString(),
    };
  }

  /**
   * Get space members
   */
  async getSpaceMembers(spaceId: string): Promise<any[]> {
    const spaceMembers = await SpaceMember.find({ spaceId: spaceId }).populate('userId', 'id username email avatarUrl');

    return spaceMembers.map(member => ({
      id: member._id,
      space_id: member.spaceId,
      user_id: member.userId._id,
      role: member.role,
      joined_at: member.joinedAt.toISOString(),
      user: {
        id: member.userId._id,
        username: member.userId.username,
        email: member.userId.email,
        avatar_url: member.userId.avatarUrl,
      }
    }));
  }

  /**
   * Get space activity (session events)
   */
  async getSpaceActivity(spaceId: string, limit: number = 20): Promise<any[]> {
    const sessions = await SessionEvent.find({ spaceId: spaceId, endedAt: { $ne: null } })
      .sort({ endedAt: -1 })
      .limit(limit)
      .populate('userId', 'id username avatarUrl');

    return sessions.map(session => ({
      id: session._id,
      user_id: session.userId,
      session_type_id: session.sessionTypeId,
      space_id: session.spaceId,
      started_at: session.startedAt.toISOString(),
      ended_at: session.endedAt?.toISOString(),
      duration_seconds: session.durationSeconds,
      efficiency: session.efficiency,
      notes: session.notes,
      created_at: session.createdAt.toISOString(),
      user: {
        id: session.userId._id,
        username: session.userId.username,
        avatar_url: session.userId.avatarUrl,
      }
    }));
  }

  /**
   * Get space statistics
   */
  async getSpaceStats(spaceId: string): Promise<{
    member_count: number;
    total_session_seconds: number;
    active_today: number;
  }> {
    // Get member count
    const memberCount = await SpaceMember.countDocuments({ spaceId: spaceId });

    // Get total session time for space
    const sessions = await SessionEvent.find({ spaceId: spaceId, durationSeconds: { $exists: true, $ne: null } });
    const totalSeconds = sessions.reduce((sum, session) => sum + (session.durationSeconds || 0), 0);

    // Get active members today
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const todaySessions = await SessionEvent.find({
      spaceId: spaceId,
      startedAt: { $gte: today },
      endedAt: { $ne: null }
    }).distinct('userId');

    const activeToday = todaySessions.length;

    return {
      member_count: memberCount,
      total_session_seconds: totalSeconds,
      active_today: activeToday,
    };
  }

  /**
   * Delete space (only owner)
   */
  async deleteSpace(spaceId: string, userId: string): Promise<void> {
    const role = await this.getMemberRole(spaceId, userId);
    if (role !== 'owner') {
      throw new Error('Only the owner can delete this space');
    }

    // Delete space members first (due to foreign key constraints)
    await SpaceMember.deleteMany({ spaceId: spaceId });

    // Delete the space
    const result = await Space.findByIdAndDelete(spaceId);
    if (!result) {
      throw new Error('Space not found');
    }
  }
}

export const spaceService = new SpaceService();

// Helper type for conditional mapping
type ImportType<T> = T extends (...args: any[]) => infer R ? R : T;
