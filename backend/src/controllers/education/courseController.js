import Course from '../../models/Course.js';
import { handleControllerError } from '../../utils/errorHandler.js';

const accountIdFromReq = (req) => req.account?.accountId || req.user?.accountId;
const projectIdFromReq = (req) => req.query?.projectId || req.body?.projectId || req.params?.projectId;

export const createCourse = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    const { name, description, duration, fees, isActive } = req.body;

    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    const course = new Course({
      accountId,
      projectId,
      name,
      description,
      duration,
      fees,
      isActive: isActive !== false
    });

    await course.save();
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    handleControllerError(res, error, 'createCourse');
  }
};

export const getCourses = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    const courses = await Course.find({ accountId, projectId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    handleControllerError(res, error, 'getCourses');
  }
};

export const getCourse = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    const course = await Course.findOne({ _id: req.params.id, accountId, projectId });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.status(200).json({ success: true, data: course });
  } catch (error) {
    handleControllerError(res, error, 'getCourse');
  }
};

export const updateCourse = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    const { name, description, duration, fees, isActive } = req.body;

    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    const update = {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(duration !== undefined ? { duration } : {}),
      ...(fees !== undefined ? { fees } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    };

    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, accountId, projectId },
      update,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.status(200).json({ success: true, data: course });
  } catch (error) {
    handleControllerError(res, error, 'updateCourse');
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    const course = await Course.findOneAndDelete({ _id: req.params.id, accountId, projectId });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.status(200).json({ success: true, data: { message: 'Course deleted successfully' } });
  } catch (error) {
    handleControllerError(res, error, 'deleteCourse');
  }
};
