const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/replysys_new')
  .then(async () => {
    const db = mongoose.connection.db;
    const template = await db.collection('templates').findOne({ metaTemplateId: "1360494519514565" });
    console.log(JSON.stringify(template?.components, null, 2));
    process.exit(0);
  });
