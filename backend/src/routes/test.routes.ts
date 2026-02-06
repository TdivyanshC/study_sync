import { Router } from 'express';
import { testController } from '../controllers/test.controller';

const router = Router();

// Create a test user (FOR DEVELOPMENT ONLY)
router.post('/create-user', testController.createTestUser.bind(testController));

// Delete a test user (FOR DEVELOPMENT ONLY)
router.delete('/delete-user', testController.deleteTestUser.bind(testController));

export default router;
