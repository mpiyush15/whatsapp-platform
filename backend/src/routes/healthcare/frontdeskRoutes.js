import express from 'express';
import frontdeskController from '../../controllers/healthcareFrontdeskController.js';

const router = express.Router();

router.get('/queue', frontdeskController.getQueue);
router.patch('/appointments/:appointmentId/status', frontdeskController.updateAppointmentStatus);
router.post('/appointments/:appointmentId/send-reminder', frontdeskController.sendReminder);

export default router;
