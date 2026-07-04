import mongoose from 'mongoose';
const schema = new mongoose.Schema({ name: String, category: String });
const Model = mongoose.model('Test', schema);
const doc = new Model({ name: 'test', category: 'cat' });
const { name, category } = doc;
console.log({ name, category });
