import Contact from '../models/Contact.js';

/**
 * Contact Controller
 * Manages WhatsApp contacts
 */

/**
 * GET /api/contacts - Get contacts
 */
export const getContacts = async (req, res) => {
  try {
    const accountId = req.account.accountId; // Use String accountId for database queries (consistent with system)
    const { type, isOptedIn, limit = 100, skip = 0 } = req.query;
    
    const query = { accountId };
    if (type) query.type = type;
    if (isOptedIn !== undefined) query.isOptedIn = isOptedIn === 'true';
    
    const contacts = await Contact.find(query)
      .sort({ name: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();
    
    const total = await Contact.countDocuments(query);
    
    res.json({
      success: true,
      contacts,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > (parseInt(skip) + parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ Get contacts error:', error);
    res.status(500).json({
      success: false,
      code: 'CONTACT_FETCH_ERROR',
      message: error.message
    });
  }
};

/**
 * GET /api/contacts/by-phone/:whatsappNumber - Get contact by WhatsApp number
 */
export const getContactByPhone = async (req, res) => {
  try {
    const accountId = req.account.accountId;
    const { whatsappNumber } = req.params;
    
    if (!whatsappNumber) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp number is required'
      });
    }
    
    const contact = await Contact.findOne({
      accountId,
      whatsappNumber
    }).lean();
    
    if (!contact) {
      return res.json({
        success: true,
        contact: null,
        message: 'No contact found for this number'
      });
    }
    
    res.json({
      success: true,
      contact
    });
    
  } catch (error) {
    console.error('❌ Get contact by phone error:', error);
    res.status(500).json({
      success: false,
      code: 'CONTACT_FETCH_ERROR',
      message: error.message
    });
  }
};

/**
 * POST /api/contacts - Create contact
 */
export const createContact = async (req, res) => {
  try {
    const accountId = req.account.accountId; // Use String accountId for database queries (consistent with system)
    const { name, phone, whatsappNumber, email, type, tags, metadata } = req.body;
    
    if (!name || !whatsappNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, whatsappNumber'
      });
    }
    
    const contact = await Contact.create({
      accountId,
      name,
      phone: phone || `+${whatsappNumber}`,
      whatsappNumber,
      email,
      type: type || 'customer',
      isOptedIn: true,
      optInDate: new Date(),
      tags: tags || [],
      metadata: metadata || {}
    });
    
    res.json({
      success: true,
      message: 'Contact created successfully',
      contact
    });
    
  } catch (error) {
    console.error('❌ Create contact error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        code: 'DUPLICATE_CONTACT',
        message: 'Contact with this WhatsApp number already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      code: 'CONTACT_CREATE_ERROR',
      message: error.message
    });
  }
};

/**
 * PUT /api/contacts/:id - Update contact
 */
export const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.accountId;
    delete updates.createdAt;
    
    const contact = await Contact.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Contact updated successfully',
      contact
    });
    
  } catch (error) {
    console.error('❌ Update contact error:', error);
    res.status(500).json({
      success: false,
      code: 'CONTACT_UPDATE_ERROR',
      message: error.message
    });
  }
};

/**
 * DELETE /api/contacts/:id - Delete contact
 */
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    
    const contact = await Contact.findByIdAndDelete(id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Delete contact error:', error);
    res.status(500).json({
      success: false,
      code: 'CONTACT_DELETE_ERROR',
      message: error.message
    });
  }
};

/**
 * POST /api/contacts/import - Bulk import contacts
 */
export const importContacts = async (req, res) => {
  try {
    const accountId = req.account.accountId; // Use String accountId for DB queries (consistent with system)
    const { contacts } = req.body;
    
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'contacts array is required'
      });
    }
    
    const imported = [];
    const failed = [];
    
    for (const contactData of contacts) {
      try {
        const contact = await Contact.create({
          accountId,
          name: contactData.name,
          phone: contactData.phone || `+${contactData.whatsappNumber}`,
          whatsappNumber: contactData.whatsappNumber,
          email: contactData.email,
          type: contactData.type || 'customer',
          isOptedIn: true,
          optInDate: new Date(),
          tags: contactData.tags || [],
          metadata: contactData.metadata || {}
        });
        imported.push(contact);
      } catch (error) {
        failed.push({
          contact: contactData,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Imported ${imported.length} contacts, ${failed.length} failed`,
      imported: imported.length,
      failed: failed.length,
      failedContacts: failed
    });
    
  } catch (error) {
    console.error('❌ Import contacts error:', error);
    res.status(500).json({
      success: false,
      code: 'CONTACT_IMPORT_ERROR',
      message: error.message
    });
  }
};

export default {
  getContacts,
  getContactByPhone,
  createContact,
  updateContact,
  deleteContact,
  importContacts
};
