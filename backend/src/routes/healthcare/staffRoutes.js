import express from 'express';
import staffController from '../../controllers/healthcareStaffController.js';
import { checkPlanLimit } from '../../middlewares/checkPlanLimit.js';

const router = express.Router();

router.get('/nurses', staffController.listNurses);
router.post('/nurses', checkPlanLimit('healthcareUsers'), staffController.createNurse);

router.get('/members', staffController.listStaffMembers);
router.post('/members', checkPlanLimit('healthcareUsers'), staffController.createStaffMember);
router.post('/members/sync-doctors', staffController.syncDoctors);
router.patch('/members/:staffId', staffController.updateStaffMember);

export default router;
