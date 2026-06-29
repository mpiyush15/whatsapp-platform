import express from 'express';
import {
  createEnquiry,
  getEnquiries,
  getEnquiry,
  updateEnquiry,
  deleteEnquiry,
  addPaymentLog,
  exportEnquiries,
} from '../../controllers/education/enquiryController.js';
import { requireJWT } from '../../middlewares/jwtAuth.js';

const router = express.Router({ mergeParams: true });

router.route('/')
  .get(requireJWT, getEnquiries)
  .post(requireJWT, createEnquiry);

router.get('/bulk/export', requireJWT, exportEnquiries);

router.route('/:id')
  .get(requireJWT, getEnquiry)
  .put(requireJWT, updateEnquiry)
  .patch(requireJWT, updateEnquiry)
  .delete(requireJWT, deleteEnquiry);

router.route('/:id/payment-logs')
    .post(requireJWT, addPaymentLog);

export default router;
