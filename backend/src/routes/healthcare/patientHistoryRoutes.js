import express from 'express';
import patientHistoryController from '../../controllers/healthcarePatientHistoryController.js';

const router = express.Router();

router.get('/patients/:patientId/history', patientHistoryController.getPatientHistory);

export default router;
