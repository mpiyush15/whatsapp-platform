/**
 * Enums Routes
 * Public endpoints to fetch enum definitions
 * No authentication required - enums are public data
 */

import express from 'express';
import { getAllEnums, getEnumByName, validateEnumValue, listEnumNames } from '../controllers/enumsController.js';

const router = express.Router();

// GET all enums
router.get('/all', getAllEnums);

// GET list of enum names
router.get('/list', listEnumNames);

// VALIDATE enum value
router.get('/validate', validateEnumValue);

// GET specific enum by name
router.get('/:enumName', getEnumByName);

export default router;
