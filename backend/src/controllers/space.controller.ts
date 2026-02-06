import { Request, Response } from 'express';
import { spaceService } from '../services/space.service';

export class SpaceController {
  /**
   * Create a new space
   */
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

  /**
   * Get user's spaces
   */
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

  /**
   * Get space by ID
   */
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

  /**
   * Join a space
   */
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

  /**
   * Get space members
   */
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

  /**
   * Get space activity
   */
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

  /**
   * Get space stats
   */
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

  /**
   * Delete space (owner only)
   */
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
