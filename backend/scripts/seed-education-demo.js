import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Account from '../src/models/Account.js';
import Batch from '../src/models/Batch.js';
import Contact from '../src/models/Contact.js';
import Course from '../src/models/Course.js';
import Enquiry from '../src/models/Enquiry.js';
import Project from '../src/models/Project.js';

dotenv.config();

const ACCOUNT_EMAIL = process.argv[2] || 'pixelsadvertise@gmail.com';
const PROJECT_ID = process.argv[3] || 'proj_wa_1780249392038';

const coursesSeed = [
  { name: 'NEET Foundation XI', description: 'Two-year medical entrance foundation for Class XI students.', duration: '24 months', fees: 145000 },
  { name: 'JEE Advanced XII', description: 'Focused engineering entrance preparation with weekly testing.', duration: '12 months', fees: 135000 },
  { name: 'MHT-CET Crash Course', description: 'Fast-track board and CET revision with daily practice.', duration: '4 months', fees: 42000 },
  { name: 'CBSE Science Booster X', description: 'Physics, Chemistry, Biology, and Maths board support.', duration: '8 months', fees: 56000 },
];

const batchSeed = [
  { course: 'NEET Foundation XI', name: 'NEET XI Morning 2026', startDate: '2026-06-10', endDate: '2028-03-31', timing: '7:00 AM - 9:00 AM', maxStudents: 45 },
  { course: 'NEET Foundation XI', name: 'NEET XI Weekend 2026', startDate: '2026-06-15', endDate: '2028-03-31', timing: 'Sat-Sun 10:00 AM - 2:00 PM', maxStudents: 35 },
  { course: 'JEE Advanced XII', name: 'JEE XII Evening 2026', startDate: '2026-06-12', endDate: '2027-04-15', timing: '6:00 PM - 8:30 PM', maxStudents: 40 },
  { course: 'MHT-CET Crash Course', name: 'CET Crash Jan 2027', startDate: '2027-01-05', endDate: '2027-04-30', timing: '5:00 PM - 8:00 PM', maxStudents: 60 },
  { course: 'CBSE Science Booster X', name: 'Class X Science Regular', startDate: '2026-06-20', endDate: '2027-02-28', timing: '4:00 PM - 6:00 PM', maxStudents: 50 },
];

const enquirySeed = [
  ['Aarav Sharma', 'aarav.sharma@example.com', '919820100101', 'NEET Foundation XI', 'NEET XI Morning 2026', 145000, 'new', ['NEET', 'Hot', 'Andheri'], 'Parent asked for scholarship details and hostel tie-up.'],
  ['Meera Iyer', 'meera.iyer@example.com', '919820100102', 'JEE Advanced XII', 'JEE XII Evening 2026', 135000, 'contacted', ['JEE', 'Demo attended'], 'Attended demo class, wants faculty profile.'],
  ['Kabir Khan', 'kabir.khan@example.com', '919820100103', 'MHT-CET Crash Course', 'CET Crash Jan 2027', 42000, 'admitted', ['CET', 'Paid'], 'Admission confirmed after counselling call.'],
  ['Ananya Patel', 'ananya.patel@example.com', '919820100104', 'NEET Foundation XI', 'NEET XI Weekend 2026', 145000, 'contacted', ['NEET', 'Weekend'], 'Needs weekend-only batch due to school timing.'],
  ['Rohan Desai', 'rohan.desai@example.com', '919820100105', 'CBSE Science Booster X', 'Class X Science Regular', 56000, 'new', ['CBSE', 'Class X'], 'Asked for board test schedule.'],
  ['Sara Fernandes', 'sara.fernandes@example.com', '919820100106', 'JEE Advanced XII', 'JEE XII Evening 2026', 135000, 'dropped', ['JEE', 'Fee concern'], 'Dropped due to commute and fee concern.'],
  ['Devansh Mehta', 'devansh.mehta@example.com', '919820100107', 'MHT-CET Crash Course', 'CET Crash Jan 2027', 42000, 'contacted', ['CET', 'WhatsApp'], 'Came from WhatsApp campaign, requested installment plan.'],
  ['Priya Nair', 'priya.nair@example.com', '919820100108', 'NEET Foundation XI', 'NEET XI Morning 2026', 145000, 'admitted', ['NEET', 'Paid', 'Top priority'], 'Paid first installment, needs study material pickup.'],
];

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

const account = await Account.findOne({ email: ACCOUNT_EMAIL.toLowerCase() });
if (!account) throw new Error(`Account not found for ${ACCOUNT_EMAIL}`);

const project = await Project.findOneAndUpdate(
  { accountId: account.accountId, projectId: PROJECT_ID },
  { $set: { name: 'Vertex Science Academy', vertical: 'education', businessCategory: 'education', status: 'active' } },
  { new: true }
);
if (!project) throw new Error(`Project not found: ${PROJECT_ID}`);

const courses = new Map();
for (const item of coursesSeed) {
  const course = await Course.findOneAndUpdate(
    { accountId: account.accountId, projectId: PROJECT_ID, name: item.name },
    { $set: { ...item, accountId: account.accountId, projectId: PROJECT_ID, isActive: true } },
    { new: true, upsert: true, runValidators: true }
  );
  courses.set(course.name, course);
}

const batches = new Map();
for (const item of batchSeed) {
  const course = courses.get(item.course);
  const batch = await Batch.findOneAndUpdate(
    { accountId: account.accountId, projectId: PROJECT_ID, courseId: course._id, name: item.name },
    {
      $set: {
        accountId: account.accountId,
        projectId: PROJECT_ID,
        courseId: course._id,
        name: item.name,
        startDate: new Date(item.startDate),
        endDate: new Date(item.endDate),
        timing: item.timing,
        maxStudents: item.maxStudents,
        isActive: true,
      },
    },
    { new: true, upsert: true, runValidators: true }
  );
  batches.set(batch.name, batch);
}

for (const [name, email, phone, courseName, batchName, fees, status, tags, notes] of enquirySeed) {
  const course = courses.get(courseName);
  const batch = batches.get(batchName);
  const contact = await Contact.findOneAndUpdate(
    { accountId: account.accountId, whatsappNumber: phone },
    {
      $set: {
        accountId: account.accountId,
        projectId: PROJECT_ID,
        name,
        email,
        phone,
        whatsappNumber: phone,
        type: 'lead',
        source: 'Education Demo Seed',
        tags,
        notes,
        lastMessageAt: new Date(),
      },
      $setOnInsert: { firstContactAt: new Date(), isOptedIn: true, optInDate: new Date() },
    },
    { new: true, upsert: true }
  );

  await Enquiry.findOneAndUpdate(
    { accountId: account.accountId, projectId: PROJECT_ID, phone },
    {
      $set: {
        accountId: account.accountId,
        projectId: PROJECT_ID,
        contactId: contact._id,
        name,
        email,
        phone,
        courseId: course._id,
        batchId: batch._id,
        fees,
        status,
        tags,
        notes,
        paymentLogs: status === 'admitted'
          ? [{ amount: Math.round(fees * 0.35), date: new Date(), method: 'upi', notes: 'First installment' }]
          : [],
      },
    },
    { new: true, upsert: true, runValidators: true }
  );
}

console.log(JSON.stringify({
  accountId: account.accountId,
  projectId: PROJECT_ID,
  projectName: project.name,
  courses: courses.size,
  batches: batches.size,
  enquiries: enquirySeed.length,
}, null, 2));

await mongoose.disconnect();
