import express from 'express';
import staffController from '../../controllers/healthcareStaffController.js';

const router = express.Router();

router.get('/nurses', staffController.listNurses);
router.post('/nurses', staffController.createNurse);

router.get('/members', staffController.listStaffMembers);
router.post('/members', staffController.createStaffMember);
router.post('/members/sync-doctors', staffController.syncDoctors);
router.patch('/members/:staffId', staffController.updateStaffMember);

export default router;
