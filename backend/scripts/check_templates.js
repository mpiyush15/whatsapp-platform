import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://pixelsagency:Pm02072023@pixelsagency.664wxw1.mongodb.net/replysys-new";

async function checkTemplates() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB.");

  const db = mongoose.connection.db;
  
  // Find recent templates, maybe named "trial_test" or just the latest ones
  const templates = await db.collection('templates').find({}).sort({ createdAt: -1 }).limit(5).toArray();
  
  console.log(`Found ${templates.length} recent templates:`);
  templates.forEach(t => {
    console.log(`\n--- Template: ${t.name} ---`);
    console.log(`Status: ${t.status}`);
    console.log(`Project ID: ${t.projectId}`);
    console.log(`hasMedia: ${t.hasMedia}`);
    console.log(`mediaType: ${t.mediaType}`);
    console.log(`mediaUrl: ${t.mediaUrl}`);
    console.log(`mediaFileName: ${t.mediaFileName}`);
    console.log(`Components:`, JSON.stringify(t.components, null, 2));
  });

  await mongoose.disconnect();
}

checkTemplates().catch(console.error);
