import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import Template from './src/models/Template.js';
import PhoneNumber from './src/models/PhoneNumber.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const template = await Template.findOne({ status: 'draft', name: 'rs_login_otp_v1' });
  if (!template) {
    console.log("Template not found");
    process.exit(1);
  }

  const phone = await PhoneNumber.findOne({ isActive: true }).sort({ updatedAt: -1 }).select('+accessToken');

  let components = JSON.parse(JSON.stringify(template.components || []));
  const payload = {
    name: template.name + '_' + Date.now(),
    language: 'en_US',
    category: template.category.toUpperCase(),
    components: components
  };

  console.log("Sending payload:", JSON.stringify(payload, null, 2));

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v21.0/${phone.wabaId}/message_templates`,
      payload,
      { headers: { Authorization: `Bearer ${phone.accessToken}`, 'Content-Type': 'application/json' } }
    );
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Meta Error:");
    console.error(JSON.stringify(err.response?.data, null, 2));
  }
  process.exit(0);
}

run();
