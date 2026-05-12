import Clinic from '../models/Clinic.js';
import Project from '../models/Project.js';
import { BusinessCategory } from '../constants/enums.js';
import { sendSuccess, sendNotFound, sendValidationError, sendForbidden } from '../utils/responseHandler.js';
import { handleControllerError, NotFoundError, ValidationError } from '../utils/errorHandler.js';
import { uploadToS3 } from '../services/s3Service.js';

// Get clinic settings for a project
export const getClinic = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { accountId } = req.user;

    // Verify project belongs to account
    const project = await Project.findOne({ projectId, accountId });
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const clinic = await Clinic.findOne({ projectId });
    if (!clinic) {
      return sendSuccess(res, null, 'Clinic not configured yet');
    }

    sendSuccess(res, clinic);
  } catch (error) {
    handleControllerError(res, error, 'getClinic');
  }
};

// Create or update clinic settings
export const upsertClinic = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { accountId } = req.user;
    const clinicData = req.body;

    // Verify project belongs to account
    const project = await Project.findOne({ projectId, accountId });
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Validate required fields
    if (!clinicData.name || !clinicData.name.trim()) {
      throw new ValidationError('Clinic name is required');
    }

    // Find existing or create new
    let clinic = await Clinic.findOne({ projectId });

    if (clinic) {
      // Update existing
      Object.assign(clinic, clinicData);
      clinic.updatedBy = accountId;
      await clinic.save();
    } else {
      // Create new
      clinic = new Clinic({
        ...clinicData,
        accountId,
        projectId,
        createdBy: accountId,
        updatedBy: accountId,
      });
      await clinic.save();
    }

    sendSuccess(res, clinic, clinic ? 'Clinic updated successfully' : 'Clinic created successfully');
  } catch (error) {
    handleControllerError(res, error, 'upsertClinic');
  }
};

// Update clinic logo
export const updateClinicLogo = async (req, res) => {
  try {
    console.log('🔄 updateClinicLogo called with params:', req.params);
    console.log('🔄 req.file:', req.file ? { size: req.file.size, mimetype: req.file.mimetype, originalname: req.file.originalname } : 'no file');
    console.log('🔄 req.body:', req.body);

    const { projectId } = req.params;
    const { accountId } = req.user;
    const { logoUrl } = req.body;

    // Verify project belongs to account
    const project = await Project.findOne({ projectId, accountId });
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const clinic = await Clinic.findOne({ projectId });
    if (!clinic) {
      throw new NotFoundError('Clinic not configured yet');
    }

    if (req.file) {
      console.log('📤 Uploading file to S3...');
      // Upload to S3 instead of local storage (1 year expiration for clinic logos)
      const { s3Url } = await uploadToS3(
        req.file.buffer,
        accountId,
        'image',
        req.file.mimetype,
        req.file.originalname,
        7 * 24 * 3600 // 1 week max for SigV4
      );
      console.log('✅ S3 upload successful, URL:', s3Url);
      clinic.logoUrl = s3Url;
    } else {
      console.log('📝 Using provided logoUrl:', logoUrl);
      clinic.logoUrl = logoUrl;
    }

    clinic.updatedBy = accountId;
    await clinic.save();

    console.log('✅ Clinic logo updated successfully');
    sendSuccess(res, clinic, 'Clinic logo updated successfully');
  } catch (error) {
    console.error('❌ Error in updateClinicLogo:', error);
    handleControllerError(res, error, 'updateClinicLogo');
  }
};

// Update prescription design settings
export const updatePrescriptionDesign = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { accountId } = req.user;
    const { enablePrescriptionDesign, prescriptionBlankPdfUrl } = req.body;

    // Verify project belongs to account
    const project = await Project.findOne({ projectId, accountId });
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const clinic = await Clinic.findOne({ projectId });
    if (!clinic) {
      throw new NotFoundError('Clinic not configured yet');
    }

    if (req.file) {
      // Upload blank PDF to S3
      const { s3Url } = await uploadToS3(
        req.file.buffer,
        accountId,
        'pdf',
        req.file.mimetype,
        req.file.originalname,
        7 * 24 * 3600 // 1 week max
      );
      clinic.prescriptionBlankPdfUrl = s3Url;
    } else if (prescriptionBlankPdfUrl !== undefined) {
      clinic.prescriptionBlankPdfUrl = prescriptionBlankPdfUrl;
    }

    if (enablePrescriptionDesign !== undefined) {
      if (typeof enablePrescriptionDesign === 'string') {
        clinic.enablePrescriptionDesign = enablePrescriptionDesign === 'true';
      } else {
        clinic.enablePrescriptionDesign = Boolean(enablePrescriptionDesign);
      }
    }

    clinic.updatedBy = accountId;
    await clinic.save();

    sendSuccess(res, clinic, 'Prescription design updated successfully');
  } catch (error) {
    handleControllerError(res, error, 'updatePrescriptionDesign');
  }
};

// Add task category
export const addTaskCategory = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { accountId } = req.user;
    const { category } = req.body;

    if (!category || !category.trim()) {
      throw new ValidationError('Category name is required');
    }

    // Verify project belongs to account
    const project = await Project.findOne({ projectId, accountId });
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const clinic = await Clinic.findOne({ projectId });
    if (!clinic) {
      throw new NotFoundError('Clinic not configured yet');
    }

    if (!clinic.taskCategories.includes(category.trim())) {
      clinic.taskCategories.push(category.trim());
      clinic.updatedBy = accountId;
      await clinic.save();
    }

    sendSuccess(res, clinic, 'Task category added successfully');
  } catch (error) {
    handleControllerError(res, error, 'addTaskCategory');
  }
};

// Remove task category
export const removeTaskCategory = async (req, res) => {
  try {
    const { projectId, category } = req.params;
    const { accountId } = req.user;

    // Verify project belongs to account
    const project = await Project.findOne({ projectId, accountId });
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const clinic = await Clinic.findOne({ projectId });
    if (!clinic) {
      throw new NotFoundError('Clinic not configured yet');
    }

    clinic.taskCategories = clinic.taskCategories.filter(cat => cat !== category);
    clinic.updatedBy = accountId;
    await clinic.save();

    sendSuccess(res, clinic, 'Task category removed successfully');
  } catch (error) {
    handleControllerError(res, error, 'removeTaskCategory');
  }
};