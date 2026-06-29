import express from 'express';
import {
  createBatch,
  getBatches,
  getBatch,
  updateBatch,
  deleteBatch,
} from '../../controllers/education/batchController.js';
import { requireJWT } from '../../middlewares/jwtAuth.js';

const router = express.Router({ mergeParams: true });

router.route('/')
  .get(requireJWT, getBatches)
  .post(requireJWT, createBatch);

router.route('/:id')
  .get(requireJWT, getBatch)
  .put(requireJWT, updateBatch)
  .delete(requireJWT, deleteBatch);

export default router;
