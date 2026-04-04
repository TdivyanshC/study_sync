import { Request, Response } from 'express';
import { spaceService } from '../services/space.service';

export class SpaceController {
  async createSpace(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { name, description } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const space = await spaceService.createSpace({
        name,
        description,
        created_by: userId,
      });

      res.status(201).json(space);
    } catch (error) {
      console.error('Create space error:', error);
      res.status(500).json({ error: 'Failed to create space' });
    }
  }

  async getUserSpaces(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const spaces = await spaceService.getUserSpaces(userId);
      res.json(spaces);
    } catch (error) {
      console.error('Get user spaces error:', error);
      res.status(500).json({ error: 'Failed to get spaces' });
    }
  }

  async getSpace(req: Request, res: Response): Promise<void> {
    try {
      const { space_id } = req.params;

      const space = await spaceService.getSpace(space_id);
      if (!space) {
        res.status(404).json({ error: 'Space not found' });
        return;
      }

      res.json(space);
    } catch (error) {
      console.error('Get space error:', error);
      res.status(500).json({ error: 'Failed to get space' });
    }
  }

  async joinSpace(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { space_id } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const member = await spaceService.joinSpace(space_id, userId);
      res.json(member);
    } catch (error: any) {
      console.error('Join space error:', error);
      res.status(400).json({ error: error.message || 'Failed to join space' });
    }
  }

  async joinByInviteCode(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { invite_code } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!invite_code) {
        res.status(400).json({ error: 'Invite code is required' });
        return;
      }

      const member = await spaceService.joinByInviteCode(invite_code, userId);
      res.json(member);
    } catch (error: any) {
      console.error('Join by invite code error:', error);
      res.status(400).json({ error: error.message || 'Failed to join space' });
    }
  }

  async regenerateInviteCode(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { space_id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const newCode = await spaceService.regenerateInviteCode(space_id, userId);
      res.json({ invite_code: newCode });
    } catch (error: any) {
      console.error('Regenerate invite code error:', error);
      res.status(400).json({ error: error.message || 'Failed to regenerate invite code' });
    }
  }

  async leaveSpace(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { space_id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await spaceService.leaveSpace(space_id, userId);
      res.json({ message: 'Left space successfully' });
    } catch (error: any) {
      console.error('Leave space error:', error);
      res.status(400).json({ error: error.message || 'Failed to leave space' });
    }
  }

  async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { space_id } = req.params;
      const { user_id } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await spaceService.removeMember(space_id, user_id, userId);
      res.json({ message: 'Member removed successfully' });
    } catch (error: any) {
      console.error('Remove member error:', error);
      res.status(400).json({ error: error.message || 'Failed to remove member' });
    }
  }

  async getSpaceMembers(req: Request, res: Response): Promise<void> {
    try {
      const { space_id } = req.params;

      const members = await spaceService.getSpaceMembers(space_id);
      res.json(members);
    } catch (error) {
      console.error('Get space members error:', error);
      res.status(500).json({ error: 'Failed to get members' });
    }
  }

  async getSpaceActivity(req: Request, res: Response): Promise<void> {
    try {
      const { space_id } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;

      const activity = await spaceService.getSpaceActivity(space_id, limit);
      res.json(activity);
    } catch (error) {
      console.error('Get space activity error:', error);
      res.status(500).json({ error: 'Failed to get activity' });
    }
  }

  async getSpaceStats(req: Request, res: Response): Promise<void> {
    try {
      const { space_id } = req.params;

      const stats = await spaceService.getSpaceStats(space_id);
      res.json(stats);
    } catch (error) {
      console.error('Get space stats error:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  }

  async deleteSpace(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { space_id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await spaceService.deleteSpace(space_id, userId);
      res.json({ message: 'Space deleted successfully' });
    } catch (error: any) {
      console.error('Delete space error:', error);
      res.status(400).json({ error: error.message || 'Failed to delete space' });
    }
  }
}

export const spaceController = new SpaceController();
