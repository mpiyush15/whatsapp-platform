const fs = require('fs');
const content = fs.readFileSync('/Users/mpiyush/Downloads/replysys-old/whatsapp-platform/backend/src/controllers/campaignController.js', 'utf8');

const newFunc = `
export const uploadCampaignAttachment = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    const { uploadToS3 } = await import('../services/s3Service.js');
    const { s3Url, s3Key } = await uploadToS3(
      req.file.buffer,
      accountId,
      'campaign',
      req.file.mimetype,
      req.file.originalname
    );
    return res.status(200).json({ url: s3Url, key: s3Key });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
`;

const lines = content.split('\n');
const insertIndex = lines.findIndex(line => line.includes('export const createCampaign = async'));
lines.splice(insertIndex, 0, newFunc);
fs.writeFileSync('/Users/mpiyush/Downloads/replysys-old/whatsapp-platform/backend/src/controllers/campaignController.js', lines.join('\n'));
