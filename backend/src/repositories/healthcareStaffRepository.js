import Nurse from '../models/Nurse.js';
import HealthcareStaff from '../models/HealthcareStaff.js';
import { generatePrefixedId } from '../utils/idGenerator.js';
import { isMongoDuplicateKey } from '../utils/mongoErrors.js';

const buildScopeFilter = ({ accountId, projectId }) => (
  projectId ? { accountId, projectId } : { accountId }
);

async function listNurses(scope, { q = '', status = '', limit = 100 }) {
  const search = String(q || '').trim();
  const filter = {
    ...buildScopeFilter(scope),
    ...(status ? { status } : {}),
    ...(search ? {
      $or: [
        { nurseId: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    } : {}),
  };

  return Nurse.find(filter)
    .sort({ fullName: 1 })
    .limit(Math.max(Math.min(Number(limit) || 100, 300), 20));
}

async function createNurse(scope, payload) {
  return Nurse.create({
    ...payload,
    accountId: scope.accountId,
    projectId: scope.projectId,
  });
}

async function listStaffMembers(scope, { q = '', role = '', status = '', limit = 100 } = {}) {
  const search = String(q || '').trim();
  const filter = {
    ...buildScopeFilter(scope),
    ...(status ? { status } : {}),
    ...(role ? { role } : {}),
    ...(search ? {
      $or: [
        { staffId: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    } : {}),
  };

  return HealthcareStaff.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.max(Math.min(Number(limit) || 100, 300), 20));
}

async function createHealthcareStaff(scope, payload) {
  return HealthcareStaff.create({
    ...payload,
    accountId: scope.accountId,
    projectId: scope.projectId,
  });
}

/**
 * Idempotent save: one staff row per (accountId, projectId, email).
 * Avoids duplicate-key races that break create-only flows.
 */
async function upsertHealthcareStaffByProjectEmail(scope, payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const filter = { ...buildScopeFilter(scope), email };
  const set = {
    fullName: payload.fullName,
    phone: payload.phone ?? null,
    role: payload.role,
    allowedRoutes: payload.allowedRoutes,
    linkedDoctorId: payload.linkedDoctorId ?? null,
    linkedNurseId: payload.linkedNurseId ?? null,
    userId: payload.userId ?? null,
    status: payload.status || 'active',
    updatedBy: payload.updatedBy ?? null,
  };
  const setOnInsert = {
    email,
    accountId: scope.accountId,
    projectId: scope.projectId,
    staffId: generatePrefixedId('hstaff'),
    createdBy: payload.createdBy ?? null,
  };
  const updateBody = { $set: set, $setOnInsert: setOnInsert, $unset: { allowedModules: '' } };
  try {
    const raw = await HealthcareStaff.findOneAndUpdate(filter, updateBody, {
      new: true,
      upsert: true,
      runValidators: true,
      rawResult: true,
    });
    const staff = raw?.value || null;
    const updatedExisting = Boolean(raw?.lastErrorObject?.updatedExisting);
    return { staff, insertedFresh: !updatedExisting };
  } catch (err) {
    // Concurrent upserts on the same (accountId, projectId, email) can throw E11000; retry as update-only.
    if (!isMongoDuplicateKey(err)) throw err;
    const raw = await HealthcareStaff.findOneAndUpdate(
      filter,
      { $set: set, $unset: { allowedModules: '' } },
      { new: true, runValidators: true, rawResult: true }
    );
    const staff = raw?.value || null;
    return { staff, insertedFresh: false };
  }
}

async function findStaffMember(scope, staffId) {
  return HealthcareStaff.findOne({
    ...buildScopeFilter(scope),
    staffId: String(staffId || '').trim(),
  });
}

async function findStaffMemberByEmail(scope, email) {
  return HealthcareStaff.findOne({
    ...buildScopeFilter(scope),
    email: String(email || '').trim().toLowerCase(),
  });
}

async function updateHealthcareStaff(scope, staffId, updates, { unsetAllowedModules = false } = {}) {
  const mongoUpdate = { $set: updates };
  if (unsetAllowedModules) {
    mongoUpdate.$unset = { allowedModules: '' };
  }
  return HealthcareStaff.findOneAndUpdate(
    { ...buildScopeFilter(scope), staffId: String(staffId || '').trim() },
    mongoUpdate,
    { new: true, runValidators: true }
  );
}

async function upsertHealthcareStaffByDoctor(scope, doctor) {
  const email = String(doctor?.email || '').trim().toLowerCase();
  if (!email) return null;

  return HealthcareStaff.findOneAndUpdate(
    {
      accountId: scope.accountId,
      projectId: scope.projectId,
      email,
    },
    {
      $set: {
        fullName: doctor.fullName,
        role: 'doctor',
        linkedDoctorId: doctor.doctorId,
        status: doctor.status === 'inactive' ? 'inactive' : 'active',
      },
      $setOnInsert: {
        email,
        phone: doctor.phoneNumber || null,
        allowedRoutes: ['staff', 'healthcare', 'healthcare/patients', 'healthcare/appointments', 'healthcare/doctors', 'healthcare/prescriptions'],
      },
    },
    { new: true, upsert: true }
  );
}

export default {
  listNurses,
  createNurse,
  listStaffMembers,
  createHealthcareStaff,
  upsertHealthcareStaffByProjectEmail,
  findStaffMember,
  findStaffMemberByEmail,
  updateHealthcareStaff,
  upsertHealthcareStaffByDoctor,
};
