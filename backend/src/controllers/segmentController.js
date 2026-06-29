import Segment from '../models/Segment.js';
import Contact from '../models/Contact.js';
import { handleControllerError, NotFoundError, ValidationError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

class SegmentController {
  /**
   * Get all segments for account
   */
  async getSegments(req, res, next) {
    try {
      const { accountId } = req.user;
      const { pinned } = req.query;

      let query = { accountId };
      if (pinned === 'true') {
        query.isPinned = true;
      }

      const segments = await Segment.find(query)
        .sort({ isPinned: -1, createdAt: -1 })
        .lean();

      res.json({
        success: true,
        segments,
        count: segments.length
      });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  /**
   * Get segment details
   */
  async getSegment(req, res, next) {
    try {
      const { accountId } = req.user;
      const { id } = req.params;

      const segment = await Segment.findOne({
        _id: id,
        accountId
      }).lean();

      if (!segment) {
        throw new NotFoundError('Segment not found');
      }

      // Get contact count for this segment
      const contactCount = await this._getSegmentContactCount(accountId, segment.filters);

      res.json({
        success: true,
        segment: {
          ...segment,
          stats: {
            ...segment.stats,
            contactCount
          }
        }
      });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  /**
   * Get contacts matching segment filters
   */
  async getSegmentContacts(req, res, next) {
    try {
      const { accountId } = req.user;
      const { id } = req.params;
      const { limit = 100, skip = 0 } = req.query;

      const segment = await Segment.findOne({
        _id: id,
        accountId
      }).lean();

      if (!segment) {
        throw new NotFoundError('Segment not found');
      }

      // Build filter query
      const filterQuery = this._buildContactFilterQuery(accountId, segment.filters);

      const contacts = await Contact.find(filterQuery)
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean();

      const total = await Contact.countDocuments(filterQuery);

      res.json({
        success: true,
        contacts,
        pagination: {
          total,
          skip: parseInt(skip),
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  /**
   * Create new segment
   */
  async createSegment(req, res, next) {
    try {
      const { accountId, _id: userId } = req.user;
      const { name, description, filters } = req.body;

      // Check if segment name already exists
      const existing = await Segment.findOne({
        accountId,
        name
      });

      if (existing) {
        throw new ValidationError('Segment with this name already exists');
      }

      // Calculate contact count
      const contactCount = await this._getSegmentContactCount(accountId, filters);

      const segment = new Segment({
        accountId,
        name,
        description,
        filters,
        createdBy: userId,
        stats: {
          contactCount,
          lastCalculatedAt: new Date()
        }
      });

      await segment.save();

      logger.info(`Segment created: ${segment._id} for account ${accountId}`);

      res.status(201).json({
        success: true,
        segment: segment.toObject(),
        message: `Segment "${name}" created with ${contactCount} contacts`
      });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  /**
   * Update segment
   */
  async updateSegment(req, res, next) {
    try {
      const { accountId } = req.user;
      const { id } = req.params;
      const { name, description, filters } = req.body;

      const segment = await Segment.findOne({
        _id: id,
        accountId
      });

      if (!segment) {
        throw new NotFoundError('Segment not found');
      }

      // Check if new name already exists
      if (name && name !== segment.name) {
        const existing = await Segment.findOne({
          accountId,
          name
        });
        if (existing) {
          throw new ValidationError('Segment with this name already exists');
        }
        segment.name = name;
      }

      if (description !== undefined) {
        segment.description = description;
      }

      if (filters) {
        segment.filters = filters;
        // Recalculate contact count
        const contactCount = await this._getSegmentContactCount(accountId, filters);
        segment.stats = {
          contactCount,
          lastCalculatedAt: new Date()
        };
      }

      await segment.save();

      logger.info(`Segment updated: ${id} for account ${accountId}`);

      res.json({
        success: true,
        segment: segment.toObject(),
        message: 'Segment updated successfully'
      });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  /**
   * Delete segment
   */
  async deleteSegment(req, res, next) {
    try {
      const { accountId } = req.user;
      const { id } = req.params;

      const segment = await Segment.findOneAndDelete({
        _id: id,
        accountId
      });

      if (!segment) {
        throw new NotFoundError('Segment not found');
      }

      logger.info(`Segment deleted: ${id} for account ${accountId}`);

      res.json({
        success: true,
        message: `Segment "${segment.name}" deleted`
      });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  /**
   * Toggle pin segment
   */
  async togglePinSegment(req, res, next) {
    try {
      const { accountId } = req.user;
      const { id } = req.params;

      const segment = await Segment.findOne({
        _id: id,
        accountId
      });

      if (!segment) {
        throw new NotFoundError('Segment not found');
      }

      segment.isPinned = !segment.isPinned;
      await segment.save();

      res.json({
        success: true,
        segment: segment.toObject(),
        message: segment.isPinned ? 'Segment pinned' : 'Segment unpinned'
      });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  /**
   * Build MongoDB filter query from segment filters
   */
  _buildContactFilterQuery(accountId, filters) {
    const query = { accountId };

    if (filters.type && filters.type.length > 0) {
      query.type = { $in: filters.type };
    }

    if (filters.city && filters.city.length > 0) {
      query.city = { $in: filters.city };
    }

    if (filters.businessName && filters.businessName.length > 0) {
      query.businessName = { $in: filters.businessName };
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters.isOptedIn !== null && filters.isOptedIn !== undefined) {
      query.isOptedIn = filters.isOptedIn;
    }

    if (filters.minMessages) {
      query.messageCount = { $gte: filters.minMessages };
    }

    if (filters.lastMessageDays) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - filters.lastMessageDays);
      query.lastMessageAt = { $gte: daysAgo };
    }

    if (filters.createdAfter) {
      query.createdAt = { ...query.createdAt, $gte: new Date(filters.createdAfter) };
    }

    if (filters.createdBefore) {
      query.createdAt = { ...query.createdAt, $lte: new Date(filters.createdBefore) };
    }

    if (filters.searchText) {
      query.$or = [
        { name: { $regex: filters.searchText, $options: 'i' } },
        { phone: { $regex: filters.searchText, $options: 'i' } },
        { email: { $regex: filters.searchText, $options: 'i' } }
      ];
    }

    return query;
  }

  /**
   * Get segment contact count
   */
  async _getSegmentContactCount(accountId, filters) {
    const query = this._buildContactFilterQuery(accountId, filters);
    return await Contact.countDocuments(query);
  }
}

export default new SegmentController();
