import express from 'express';
import {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
} from '../../controllers/education/courseController.js';
import { requireJWT } from '../../middlewares/jwtAuth.js';

const router = express.Router({ mergeParams: true });

router.route('/')
  .get(requireJWT, getCourses)
  .post(requireJWT, createCourse);

router.route('/:id')
  .get(requireJWT, getCourse)
  .put(requireJWT, updateCourse)
  .delete(requireJWT, deleteCourse);

export default router;
