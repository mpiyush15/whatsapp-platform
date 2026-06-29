import Batch from '../../models/Batch.js';
import Course from '../../models/Course.js';
import { handleControllerError } from '../../utils/errorHandler.js';

const accountIdFromReq = (req) => req.account?.accountId || req.user?.accountId;
const projectIdFromReq = (req) => req.query?.projectId || req.body?.projectId || req.params?.projectId;

export const createBatch = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    const { courseId, name, startDate, endDate, timing, maxStudents, isActive } = req.body;

    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    const course = await Course.findOne({ _id: courseId, accountId, projectId });
    if (!course) {
      return res.status(400).json({ success: false, message: 'Course not found for this project' });
    }

    const batch = new Batch({
      accountId,
      projectId,
      courseId,
      name,
      startDate,
      endDate,
      timing,
      maxStudents,
      isActive: isActive !== false
    });

    await batch.save();
    await batch.populate('courseId');
    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    handleControllerError(res, error, 'createBatch');
  }
};

export const getBatches = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    const { courseId } = req.query; 

    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }
    
    const query = { accountId, projectId };
    if (courseId) {
      query.courseId = courseId;
    }

    const batches = await Batch.find(query).populate('courseId').sort({ startDate: -1, createdAt: -1 });
    res.status(200).json({ success: true, data: batches });
  } catch (error) {
    handleControllerError(res, error, 'getBatches');
  }
};

export const getBatch = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    const batch = await Batch.findOne({ _id: req.params.id, accountId, projectId }).populate('courseId');
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    res.status(200).json({ success: true, data: batch });
  } catch (error) {
    handleControllerError(res, error, 'getBatch');
  }
};

export const updateBatch = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    const { courseId, name, startDate, endDate, timing, maxStudents, isActive } = req.body;

    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    if (courseId) {
      const course = await Course.findOne({ _id: courseId, accountId, projectId });
      if (!course) {
        return res.status(400).json({ success: false, message: 'Course not found for this project' });
      }
    }

    const batch = await Batch.findOneAndUpdate(
      { _id: req.params.id, accountId, projectId },
      { courseId, name, startDate, endDate, timing, maxStudents, isActive },
      { new: true, runValidators: true }
    ).populate('courseId');

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    res.status(200).json({ success: true, data: batch });
  } catch (error) {
    handleControllerError(res, error, 'updateBatch');
  }
};

export const deleteBatch = async (req, res) => {
  try {
    const accountId = accountIdFromReq(req);
    const projectId = projectIdFromReq(req);
    if (!accountId || !projectId) {
      return res.status(400).json({ success: false, message: 'Project context is required' });
    }

    const batch = await Batch.findOneAndDelete({ _id: req.params.id, accountId, projectId });

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    res.status(200).json({ success: true, data: { message: 'Batch deleted successfully' } });
  } catch (error) {
    handleControllerError(res, error, 'deleteBatch');
  }
};
