import express from 'express'
import { requireJWT } from '../middlewares/jwtAuth.js'
import CreditPack from '../models/CreditPack.js'
import CreditPackSettings from '../models/CreditPackSettings.js'
import logger from '../utils/logger.js'

const router = express.Router()

router.use(requireJWT)

const superadminOnly = (req, res, next) => {
  const isInternal = req.account?.type === 'internal' || req.account?.isInternal === true;
  const isAdminRole = ['superadmin', 'admin'].includes(String(req.user?.role || '').toLowerCase());
  if (!isInternal && !isAdminRole) {
    return res.status(403).json({ success: false, error: 'Superadmin access required' });
  }
  next();
}

/**
 * GET /dashboard/superadmin/credit-packs/settings
 * Fetch global credit pack settings
 */
router.get('/settings', superadminOnly, async (req, res) => {
  try {
    let settings = await CreditPackSettings.findOne()
    if (!settings) {
      settings = await CreditPackSettings.create({
        minimumCreditPurchase: 100,
        minimumCreditAmount: 50,
        maximumCreditAmount: 100000,
        lowCreditWarningThreshold: 200,
        renewalReminderDays: [15, 7, 3, 1],
        creditConversionRate: 1,
        creditRates: {
          marketing: 1,
          utility: 1,
          authentication: 1,
          service: 0,
        },
        updatedBy: req.user?.id || 'system',
      })
    }
    res.json({ success: true, data: settings })
  } catch (error) {
    logger.error('Error fetching credit pack settings:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /dashboard/superadmin/credit-packs/settings
 * Update global credit pack settings
 */
router.put('/settings', superadminOnly, async (req, res) => {
  try {
    const {
      minimumCreditPurchase,
      minimumCreditAmount,
      maximumCreditAmount,
      taxPercentage,
      creditConversionRate,
      creditRates,
      enableCustomAmount,
      enableBulkDiscount,
      bulkDiscountThreshold,
      bulkDiscountPercent,
      lowCreditWarningThreshold,
      renewalReminderDays,
    } = req.body

    let settings = await CreditPackSettings.findOne()
    if (!settings) {
      settings = new CreditPackSettings()
    }

    if (minimumCreditPurchase !== undefined) settings.minimumCreditPurchase = minimumCreditPurchase
    if (minimumCreditAmount !== undefined) settings.minimumCreditAmount = minimumCreditAmount
    if (maximumCreditAmount !== undefined) settings.maximumCreditAmount = maximumCreditAmount
    if (taxPercentage !== undefined) settings.taxPercentage = taxPercentage
    if (creditConversionRate !== undefined) settings.creditConversionRate = creditConversionRate
    if (creditRates !== undefined) {
      settings.creditRates = {
        marketing: Number(creditRates.marketing ?? settings.creditRates?.marketing ?? 1),
        utility: Number(creditRates.utility ?? settings.creditRates?.utility ?? 1),
        authentication: Number(creditRates.authentication ?? settings.creditRates?.authentication ?? 1),
        service: Number(creditRates.service ?? settings.creditRates?.service ?? 0),
      }
    }
    if (enableCustomAmount !== undefined) settings.enableCustomAmount = enableCustomAmount
    if (enableBulkDiscount !== undefined) settings.enableBulkDiscount = enableBulkDiscount
    if (bulkDiscountThreshold !== undefined) settings.bulkDiscountThreshold = bulkDiscountThreshold
    if (bulkDiscountPercent !== undefined) settings.bulkDiscountPercent = bulkDiscountPercent
    if (lowCreditWarningThreshold !== undefined) settings.lowCreditWarningThreshold = lowCreditWarningThreshold
    if (renewalReminderDays !== undefined) settings.renewalReminderDays = renewalReminderDays

    settings.updatedBy = req.user?.id || 'system'
    await settings.save()

    res.json({ success: true, message: 'Settings updated', data: settings })
  } catch (error) {
    logger.error('Error updating credit pack settings:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /dashboard/superadmin/credit-packs
 * List all credit packs
 */
router.get('/', superadminOnly, async (req, res) => {
  try {
    const packs = await CreditPack.find().sort({ displayOrder: 1, createdAt: -1 })
    res.json({ success: true, data: packs })
  } catch (error) {
    logger.error('Error fetching credit packs:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /dashboard/superadmin/credit-packs
 * Create a new credit pack
 */
router.post('/', superadminOnly, async (req, res) => {
  try {
    const { name, description, credits, price, bonusCredits, displayOrder, isPopular } = req.body

    if (!name || Number(credits) <= 0 || price === undefined || Number(price) < 0) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    const packId = `pack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const newPack = await CreditPack.create({
      packId,
      name,
      description,
      credits: Number(credits),
      price: Number(price),
      bonusCredits: Number(bonusCredits || 0),
      displayOrder: Number(displayOrder || 0),
      isPopular: Boolean(isPopular),
      isActive: true,
      createdBy: req.user?.id || 'system',
    })

    logger.info(`Credit pack created: ${packId}`)
    res.status(201).json({ success: true, message: 'Pack created', data: newPack })
  } catch (error) {
    logger.error('Error creating credit pack:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /dashboard/superadmin/credit-packs/:packId
 * Update a credit pack
 */
router.put('/:packId', superadminOnly, async (req, res) => {
  try {
    const { packId } = req.params
    const { name, description, credits, price, bonusCredits, displayOrder, isPopular, isActive } = req.body

    const pack = await CreditPack.findOne({ packId })
    if (!pack) {
      return res.status(404).json({ success: false, error: 'Pack not found' })
    }

    if (name !== undefined) pack.name = name
    if (description !== undefined) pack.description = description
    if (credits !== undefined) pack.credits = Number(credits)
    if (price !== undefined) pack.price = Number(price)
    if (bonusCredits !== undefined) pack.bonusCredits = Number(bonusCredits)
    if (displayOrder !== undefined) pack.displayOrder = Number(displayOrder)
    if (isPopular !== undefined) pack.isPopular = Boolean(isPopular)
    if (isActive !== undefined) pack.isActive = Boolean(isActive)

    await pack.save()

    logger.info(`Credit pack updated: ${packId}`)
    res.json({ success: true, message: 'Pack updated', data: pack })
  } catch (error) {
    logger.error('Error updating credit pack:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /dashboard/superadmin/credit-packs/:packId
 * Delete a credit pack (soft delete via isActive=false)
 */
router.delete('/:packId', superadminOnly, async (req, res) => {
  try {
    const { packId } = req.params

    const pack = await CreditPack.findOne({ packId })
    if (!pack) {
      return res.status(404).json({ success: false, error: 'Pack not found' })
    }

    pack.isActive = false
    await pack.save()

    logger.info(`Credit pack deactivated: ${packId}`)
    res.json({ success: true, message: 'Pack deleted' })
  } catch (error) {
    logger.error('Error deleting credit pack:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
