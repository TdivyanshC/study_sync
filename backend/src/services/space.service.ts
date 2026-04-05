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
  invite_code?: string;
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
   * Generate unique invite code
   */
  private generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Create a new space with creator as owner
   */
  async createSpace(input: CreateSpaceInput): Promise<Space> {
    if (!input.name?.trim()) {
      throw new Error('Space name is required');
    }
    if (input.name.length > 100) {
      throw new Error('Space name must be 100 characters or less');
    }

    let inviteCode = this.generateInviteCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await Space.findOne({ inviteCode });
      if (!existing) break;
      inviteCode = this.generateInviteCode();
      attempts++;
    }

    const space = await Space.create({
      name: input.name,
      description: input.description,
      createdBy: input.created_by,
      inviteCode,
    });

    await SpaceMember.create({
      spaceId: space._id,
      userId: input.created_by,
      role: 'owner',
    });

    return {
      id: space._id,
      created_by: space.createdBy,
      name: space.name,
      description: space.description,
      invite_code: space.inviteCode,
      created_at: space.createdAt.toISOString(),
    };
  }

  async getSpace(spaceId: string): Promise<Space | null> {
    const space = await Space.findById(spaceId);
    if (!space) return null;
    return {
      id: space._id,
      created_by: space.createdBy,
      name: space.name,
      description: space.description,
      invite_code: space.inviteCode,
      created_at: space.createdAt.toISOString(),
    };
  }

  async getSpaceByInviteCode(inviteCode: string): Promise<Space | null> {
    const space = await Space.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!space) return null;
    return {
      id: space._id,
      created_by: space.createdBy,
      name: space.name,
      description: space.description,
      invite_code: space.inviteCode,
      created_at: space.createdAt.toISOString(),
    };
  }

  async regenerateInviteCode(spaceId: string, userId: string): Promise<string> {
    const role = await this.getMemberRole(spaceId, userId);
    if (role !== 'owner') {
      throw new Error('Only the owner can regenerate invite code');
    }
    let newCode = this.generateInviteCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await Space.findOne({ inviteCode: newCode });
      if (!existing) break;
      newCode = this.generateInviteCode();
      attempts++;
    }
    await Space.findByIdAndUpdate(spaceId, { inviteCode: newCode });
    return newCode;
  }

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
        invite_code: space.inviteCode,
        created_at: space.createdAt.toISOString(),
      }));
  }

  async isMember(spaceId: string, userId: string): Promise<boolean> {
    const member = await SpaceMember.findOne({ spaceId, userId: userId });
    return !!member;
  }

  async getMemberRole(spaceId: string, userId: string): Promise<string | null> {
    const member = await SpaceMember.findOne({ spaceId, userId: userId });
    return member ? member.role : null;
  }

  async joinSpace(spaceId: string, userId: string): Promise<SpaceMember> {
    const isMember = await this.isMember(spaceId, userId);
    if (isMember) {
      throw new Error('Already a member of this space');
    }
    const spaceMember = await SpaceMember.create({
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

  async joinByInviteCode(inviteCode: string, userId: string): Promise<SpaceMember> {
    const space = await Space.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!space) {
      throw new Error('Invalid invite code');
    }
    return this.joinSpace(space._id, userId);
  }

  async getSpaceMembers(spaceId: string): Promise<any[]> {
    const spaceMembers = await SpaceMember.find({ spaceId: spaceId }).populate('userId', 'id username email avatarUrl');
    return spaceMembers.map(member => ({
      id: member._id,
      space_id: member.spaceId,
      user_id: member.userId?._id,
      role: member.role,
      joined_at: member.joinedAt.toISOString(),
      user: {
        id: member.userId?._id,
        username: member.userId?.username || 'Unknown',
        email: member.userId?.email || 'Unknown',
        avatar_url: member.userId?.avatarUrl || '',
      }
    }));
  }

  async getSpaceActivity(spaceId: string, limit: number = 20): Promise<any[]> {
    const sessions = await SessionEvent.find({ spaceId: spaceId, endedAt: { $ne: null } })
      .sort({ endedAt: -1 })
      .limit(limit)
      .populate('userId', 'id username avatarUrl');
    return sessions.map(session => ({
      id: session._id,
      user_id: session.userId?._id,
      session_type_id: session.sessionTypeId,
      space_id: session.spaceId,
      started_at: session.startedAt.toISOString(),
      ended_at: session.endedAt?.toISOString(),
      duration_seconds: session.durationSeconds,
      efficiency: session.efficiency,
      notes: session.notes,
      created_at: session.createdAt.toISOString(),
      user: {
        id: session.userId?._id,
        username: session.userId?.username || 'Unknown',
        avatar_url: session.userId?.avatarUrl || '',
      }
    }));
  }

  async getSpaceStats(spaceId: string): Promise<{
    member_count: number;
    total_session_seconds: number;
    active_today: number;
    member_stats: { user_id: string; username: string; total_seconds: number; today_seconds: number }[];
  }> {
    const memberCount = await SpaceMember.countDocuments({ spaceId: spaceId });

    const sessions = await SessionEvent.find({ spaceId: spaceId, durationSeconds: { $exists: true, $ne: null } });
    const totalSeconds = sessions.reduce((sum, session) => sum + (session.durationSeconds || 0), 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const todaySessions = await SessionEvent.find({
      spaceId: spaceId,
      startedAt: { $gte: today },
      endedAt: { $ne: null }
    }).distinct('userId');

    const activeToday = todaySessions.length;

    const members = await SpaceMember.find({ spaceId }).populate('userId', 'id username');
    
    const memberStats = await Promise.all(members.map(async (member) => {
      const userId = member.userId._id.toString();
      const totalUserSessions = await SessionEvent.find({ 
        spaceId, 
        userId: userId, 
        durationSeconds: { $exists: true, $ne: null } 
      });
      const totalUserSeconds = totalUserSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
      
      const todayUserSessions = await SessionEvent.find({
        spaceId,
        userId: userId,
        startedAt: { $gte: today },
        endedAt: { $ne: null }
      });
      const todayUserSeconds = todayUserSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
      
      return {
        user_id: userId,
        username: (member.userId as any).username,
        total_seconds: totalUserSeconds,
        today_seconds: todayUserSeconds,
      };
    }));

    return {
      member_count: memberCount,
      total_session_seconds: totalSeconds,
      active_today: activeToday,
      member_stats: memberStats,
    };
  }

  async deleteSpace(spaceId: string, userId: string): Promise<void> {
    const role = await this.getMemberRole(spaceId, userId);
    if (role !== 'owner') {
      throw new Error('Only the owner can delete this space');
    }
    await SpaceMember.deleteMany({ spaceId: spaceId });
    const result = await Space.findByIdAndDelete(spaceId);
    if (!result) {
      throw new Error('Space not found');
    }
  }

  async leaveSpace(spaceId: string, userId: string): Promise<void> {
    const role = await this.getMemberRole(spaceId, userId);
    if (role === 'owner') {
      throw new Error('Owner cannot leave space. Transfer ownership or delete space instead.');
    }
    await SpaceMember.findOneAndDelete({ spaceId, userId });
  }

  async removeMember(spaceId: string, targetUserId: string, requesterId: string): Promise<void> {
    const role = await this.getMemberRole(spaceId, requesterId);
    if (role !== 'owner') {
      throw new Error('Only the owner can remove members');
    }
    await SpaceMember.findOneAndDelete({ spaceId, userId: targetUserId });
  }
}

export const spaceService = new SpaceService();

type ImportType<T> = T extends (...args: any[]) => infer R ? R : T;
