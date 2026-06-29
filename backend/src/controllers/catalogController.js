import { sendSuccess } from '../utils/responseHandler.js';
import { handleControllerError, NotFoundError } from '../utils/errorHandler.js';
import PlanCatalog from '../models/PlanCatalog.js';

export const createCatalogField = async (req, res) => {
  try {
    const { key, label, type, productLine, category, unit } = req.body;
    
    const field = new PlanCatalog({
      key: String(key).toLowerCase().replace(/[^a-z0-9_]/g, ''),
      label,
      type,
      productLine: productLine || 'whatsapp',
      category: category || 'General',
      unit: unit || null,
      isSystem: false
    });

    await field.save();
    return sendSuccess(res, { data: field }, 'Catalog field created', 201);
  } catch (error) {
    return handleControllerError(res, error, 'createCatalogField');
  }
};

export const deleteCatalogField = async (req, res) => {
  try {
    const { key } = req.params;
    const field = await PlanCatalog.findOne({ key });
    
    if (!field) throw new NotFoundError('Catalog field not found');
    if (field.isSystem) throw new Error('Cannot delete system fields');

    await PlanCatalog.deleteOne({ key });
    return sendSuccess(res, null, 'Catalog field deleted');
  } catch (error) {
    return handleControllerError(res, error, 'deleteCatalogField');
  }
};
export const updateCatalogField = async (req, res) => {
  try {
    const { key } = req.params;
    const { label, type, category, unit } = req.body;
    
    const field = await PlanCatalog.findOne({ key });
    if (!field) throw new NotFoundError('Catalog field not found');
    if (field.isSystem) throw new Error('Cannot edit system fields');

    if (label) field.label = label;
    if (type) field.type = type;
    if (category) field.category = category;
    if (unit !== undefined) field.unit = unit;

    await field.save();
    return sendSuccess(res, { data: field }, 'Catalog field updated');
  } catch (error) {
    return handleControllerError(res, error, 'updateCatalogField');
  }
};
