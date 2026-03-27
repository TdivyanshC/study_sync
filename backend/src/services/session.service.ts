import SessionEvent from '../models/SessionEvent';
import { calculateDurationSeconds } from '../utils/time';
import { Types } from 'mongoose';

export interface SessionEvent {
  id: string;
  user_id: string;
  session_type_id?: string;
  space_id?: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  created_at: string;
}

export interface CreateSessionInput {
  user_id: string;
  session_type_id?: string;
  space_id?: string;
  started_at?: string;
}

export interface EndSessionInput {
  session_id: string;
  ended_at?: string;
}

export class SessionService {
  /**
   * Start a new session - insert with started_at timestamp
   */
  async startSession(input: CreateSessionInput): Promise<SessionEvent> {
    const session = await SessionEvent.create({
      _id: new Types.ObjectId().toHexString(), // Generate UUID-like ID
      userId: input.user_id,
      sessionTypeId: input.session_type_id,
      spaceId: input.space_id,
      startedAt: input.started_at ? new Date(input.started_at) : new Date(),
    });

    return {
      id: session._id,
      user_id: session.userId,
      session_type_id: session.sessionTypeId,
      space_id: session.spaceId,
      started_at: session.startedAt.toISOString(),
      ended_at: session.endedAt?.toISOString(),
      duration_seconds: session.durationSeconds,
      created_at: session.createdAt.toISOString(),
    };
  }

  /**
   * End a session - update with ended_at and calculate duration
   */
  async endSession(input: EndSessionInput): Promise<SessionEvent> {
    // Get the session first
    const existing = await SessionEvent.findById(input.session_id);

    if (!existing) {
      throw new Error('Session not found');
    }

    if (existing.endedAt) {
      throw new Error('Session already ended');
    }

    const endedAt = input.ended_at ? new Date(input.ended_at) : new Date();
    const durationSeconds = calculateDurationSeconds(existing.startedAt, endedAt);

    // Update the session
    const session = await SessionEvent.findByIdAndUpdate(
      input.session_id,
      {
        endedAt,
        durationSeconds,
      },
      { new: true }
    );

    if (!session) {
      throw new Error('Session not found');
    }

    return {
      id: session._id,
      user_id: session.userId,
      session_type_id: session.sessionTypeId,
      space_id: session.spaceId,
      started_at: session.startedAt.toISOString(),
      ended_at: session.endedAt?.toISOString(),
      duration_seconds: session.durationSeconds,
      created_at: session.createdAt.toISOString(),
    };
  }

  /**
   * Get active session for user (started but not ended)
   */
  async getActiveSession(userId: string): Promise<SessionEvent | null> {
    const session = await SessionEvent.findOne({
      userId: userId,
      endedAt: null,
    })
      .sort({ startedAt: -1 })
      .limit(1);

    if (!session) {
      return null;
    }

    return {
      id: session._id,
      user_id: session.userId,
      session_type_id: session.sessionTypeId,
      space_id: session.spaceId,
      started_at: session.startedAt.toISOString(),
      ended_at: session.endedAt?.toISOString(),
      duration_seconds: session.durationSeconds,
      created_at: session.createdAt.toISOString(),
    };
  }

  /**
   * Get user's sessions with pagination
   */
  async getUserSessions(
    userId: string,
    options: { limit?: number; offset?: number; spaceId?: string } = {}
  ): Promise<SessionEvent[]> {
    let query = SessionEvent.find({ userId: userId })
      .sort({ startedAt: -1 });

    if (options.spaceId) {
      query = query.where('spaceId', options.spaceId);
    }

    // Apply pagination
    if (options.offset !== undefined && options.limit !== undefined) {
      query = query.skip(options.offset).limit(options.limit);
    } else if (options.limit !== undefined) {
      query = query.limit(options.limit);
    }

    const sessions = await query.exec();

    return sessions.map(session => ({
      id: session._id,
      user_id: session.userId,
      session_type_id: session.sessionTypeId,
      space_id: session.spaceId,
      started_at: session.startedAt.toISOString(),
      ended_at: session.endedAt?.toISOString(),
      duration_seconds: session.durationSeconds,
      created_at: session.createdAt.toISOString(),
    }));
  }

  /**
   * Get total session time for user
   */
  async getTotalSessionTime(userId: string): Promise<number> {
    const sessions = await SessionEvent.find({
      userId: userId,
      durationSeconds: { $exists: true, $ne: null },
    }).exec();

    return sessions.reduce((sum, session) => sum + (session.durationSeconds || 0), 0);
  }
}

export const sessionService = new SessionService();
