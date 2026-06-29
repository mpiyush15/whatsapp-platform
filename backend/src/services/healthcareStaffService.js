import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import Doctor from '../models/Doctor.js';
import Nurse from '../models/Nurse.js';
import User from '../models/User.js';
import staffRepository from '../repositories/healthcareStaffRepository.js';
import { emailService } from './emailService.js';
import { NotFoundError, ValidationError } from '../utils/errorHandler.js';
import { normalizeAllowedRoutes } from '../constants/healthcareStaffRoutes.js';
import { isMongoDuplicateKey } from '../utils/mongoErrors.js';

function normalizeNursePayload(payload = {}, actor = null) {
  const data = { ...payload };

  if (!data.fullName || !String(data.fullName).trim()) {
    throw new ValidationError('fullName is required');
  }

  return {
    fullName: String(data.fullName).trim(),
    department: data.department ? String(data.department).trim() : null,
    licenseNumber: data.licenseNumber ? String(data.licenseNumber).trim() : null,
    phoneNumber: data.phoneNumber ? String(data.phoneNumber).trim() : null,
    email: data.email ? String(data.email).trim().toLowerCase() : null,
    shift: data.shift || 'rotational',
    notes: data.notes ? String(data.notes).trim() : '',
    status: data.status || 'active',
    createdBy: actor,
    updatedBy: actor,
  };
}

async function listNurses(scope, query = {}) {
  const nurses = await staffRepository.listNurses(scope, query);
  return { nurses };
}

async function createNurse(scope, payload = {}, actor = null) {
  const nurse = await staffRepository.createNurse(scope, normalizeNursePayload(payload, actor));
  return { nurse };
}

const STAFF_ROLES = ['doctor', 'head_doctor', 'nurse', 'receptionist', 'billing', 'admin'];

function generateTempPassword() {
  return crypto.randomBytes(12).toString('base64url').slice(0, 14);
}

async function createStaffMember(scope, payload = {}, actor = null) {
  if (!scope?.projectId) {
    throw new ValidationError('projectId is required');
  }

  const role = String(payload.role || '').trim().toLowerCase();
  if (!STAFF_ROLES.includes(role)) {
    throw new ValidationError(`role must be one of: ${STAFF_ROLES.join(', ')}`);
  }

  const fullName = String(payload.fullName || '').trim();
  if (!fullName) {
    throw new ValidationError('fullName is required');
  }

  const email = String(payload.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('A valid email is required');
  }

  const phone = payload.phone ? String(payload.phone).trim() : null;
  const allowedRoutes = normalizeAllowedRoutes(role, payload.allowedRoutes);

  const existingStaff = await staffRepository.findStaffMemberByEmail(scope, email);
  if (existingStaff) {
    // TEMP TESTING MODE: do not block on duplicate staff email in same project.
    // Make create idempotent and update key fields instead.
    const updatedExisting = await staffRepository.updateHealthcareStaff(
      scope,
      existingStaff.staffId,
      {
        fullName,
        phone,
        role,
        allowedRoutes,
        status: 'active',
        updatedBy: actor,
      },
      { unsetAllowedModules: true }
    );
    return {
      staff: updatedExisting || existingStaff,
      doctor: null,
      nurse: null,
      userId: existingStaff.userId || null,
      emailSent: false,
      emailSkipped: true,
      existing: true,
    };
  }

  let existingUser = await User.findOne({ email });
  if (existingUser && String(existingUser.accountId || '') !== String(scope.accountId || '')) {
    // TEMP TESTING MODE: always relink to current account context.
    existingUser.accountId = scope.accountId;
    existingUser.role = existingUser.role || 'user';
    existingUser.status = existingUser.status || 'active';
    await existingUser.save();
  }

  const shouldCreateUser = !existingUser;
  const plainPassword = shouldCreateUser ? generateTempPassword() : null;
  const passwordHash = shouldCreateUser ? await bcrypt.hash(plainPassword, 10) : null;

  let user = null;
  let createdUser = false;
  let doctor = null;
  let createdDoctor = false;
  let nurse = null;
  let createdNurse = false;
  let staff = null;
  let staffInsertedFresh = false;

  try {
    if (shouldCreateUser) {
      try {
        user = await User.create({
          email,
          name: fullName,
          phone: phone || undefined,
          password: passwordHash,
          accountId: scope.accountId,
          role: 'user',
          status: 'active',
        });
        createdUser = true;
      } catch (createUserErr) {
        // Race + Mongoose/driver: duplicate key may omit numeric `code` on the top-level error.
        if (!isMongoDuplicateKey(createUserErr)) throw createUserErr;
        const fallbackUser = await User.findOne({ email });
        if (!fallbackUser) throw createUserErr;
        if (String(fallbackUser.accountId || '') !== String(scope.accountId || '')) {
          fallbackUser.accountId = scope.accountId;
          fallbackUser.role = fallbackUser.role || 'user';
          fallbackUser.status = fallbackUser.status || 'active';
          await fallbackUser.save();
        }
        user = fallbackUser;
        createdUser = false;
      }
    } else {
      user = existingUser;
    }

    let linkedDoctorId = null;
    let linkedNurseId = null;

    if (role === 'doctor' || role === 'head_doctor') {
      const existingDoc = await Doctor.findOne({
        accountId: scope.accountId,
        projectId: scope.projectId,
        email,
      });
      const doctorFields = {
        fullName,
        email,
        phoneNumber: phone || null,
        specialization: payload.specialization ? String(payload.specialization).trim() : null,
        department: payload.department ? String(payload.department).trim() : null,
        status: 'active',
        updatedBy: actor,
      };
      if (existingDoc) {
        doctor = await Doctor.findOneAndUpdate(
          { doctorId: existingDoc.doctorId },
          { $set: doctorFields },
          { new: true, runValidators: true }
        );
        createdDoctor = false;
      } else {
        doctor = await Doctor.create({
          ...doctorFields,
          accountId: scope.accountId,
          projectId: scope.projectId,
          createdBy: actor,
        });
        createdDoctor = true;
      }
      linkedDoctorId = doctor.doctorId;
    }

    if (role === 'nurse') {
      const nursePayload = normalizeNursePayload({
        fullName,
        email,
        phoneNumber: phone || undefined,
        department: payload.nurseDepartment || payload.department,
        licenseNumber: payload.licenseNumber,
        shift: payload.shift,
        notes: payload.notes,
        status: 'active',
      }, actor);
      const existingNurse = await Nurse.findOne({
        accountId: scope.accountId,
        projectId: scope.projectId,
        email,
      });
      if (existingNurse) {
        nurse = await Nurse.findOneAndUpdate(
          { nurseId: existingNurse.nurseId },
          {
            $set: {
              fullName: nursePayload.fullName,
              department: nursePayload.department,
              licenseNumber: nursePayload.licenseNumber,
              phoneNumber: nursePayload.phoneNumber,
              email: nursePayload.email,
              shift: nursePayload.shift,
              notes: nursePayload.notes,
              status: nursePayload.status,
              updatedBy: actor,
            },
          },
          { new: true, runValidators: true }
        );
        createdNurse = false;
      } else {
        nurse = await staffRepository.createNurse(scope, nursePayload);
        createdNurse = true;
      }
      linkedNurseId = nurse.nurseId;
    }

    const upsertStaff = await staffRepository.upsertHealthcareStaffByProjectEmail(scope, {
      fullName,
      email,
      phone,
      role,
      allowedRoutes,
      linkedDoctorId,
      linkedNurseId,
      userId: user._id,
      createdBy: actor,
      updatedBy: actor,
      status: 'active',
    });
    staff = upsertStaff.staff;
    staffInsertedFresh = Boolean(upsertStaff.insertedFresh);

    const emailResult = createdUser
      ? await emailService.sendHealthcareStaffWelcomeEmail({
          to: email,
          name: fullName,
          role,
          temporaryPassword: plainPassword,
        })
      : { success: false, skipped: true };

    return {
      staff,
      doctor,
      nurse,
      userId: user._id,
      emailSent: Boolean(createdUser && emailResult?.success && !emailResult?.skipped),
      emailSkipped: Boolean(!createdUser || emailResult?.skipped),
      existing: !staffInsertedFresh,
    };
  } catch (err) {
    if (staffInsertedFresh && staff) await staff.deleteOne().catch(() => {});
    if (createdNurse && nurse) await nurse.deleteOne().catch(() => {});
    if (createdDoctor && doctor) await doctor.deleteOne().catch(() => {});
    if (createdUser && user) await user.deleteOne().catch(() => {});
    throw err;
  }
}

async function listStaffMembers(scope, query = {}) {
  const members = await staffRepository.listStaffMembers(scope, query);
  return { members };
}

async function updateStaffMember(scope, staffId, payload = {}, actor = null) {
  if (!scope?.projectId) {
    throw new ValidationError('projectId is required');
  }
  const id = String(staffId || '').trim();
  if (!id) {
    throw new ValidationError('staffId is required');
  }

  const existing = await staffRepository.findStaffMember(scope, id);
  if (!existing) {
    throw new NotFoundError('Staff member not found');
  }

  const updates = { updatedBy: actor };

  if (payload.fullName !== undefined) {
    const fullName = String(payload.fullName || '').trim();
    if (!fullName) {
      throw new ValidationError('fullName cannot be empty');
    }
    updates.fullName = fullName;
  }

  if (payload.phone !== undefined) {
    updates.phone = payload.phone ? String(payload.phone).trim() : null;
  }

  if (payload.status !== undefined) {
    const status = String(payload.status || '').trim();
    if (!['active', 'inactive'].includes(status)) {
      throw new ValidationError('status must be active or inactive');
    }
    updates.status = status;
  }

  let unsetAllowedModules = false;
  if (payload.allowedRoutes !== undefined) {
    updates.allowedRoutes = normalizeAllowedRoutes(existing.role, payload.allowedRoutes);
    unsetAllowedModules = true;
  }

  const staff = await staffRepository.updateHealthcareStaff(scope, id, updates, { unsetAllowedModules });
  if (!staff) {
    throw new NotFoundError('Staff member not found');
  }

  if (existing.userId) {
    const userPatch = {};
    if (updates.fullName) userPatch.name = updates.fullName;
    if (updates.phone !== undefined) userPatch.phone = updates.phone || undefined;
    if (Object.keys(userPatch).length) {
      await User.findByIdAndUpdate(existing.userId, { $set: userPatch }).catch(() => {});
    }
  }

  return { staff };
}

async function syncExistingDoctors(scope) {
  if (!scope?.projectId) {
    throw new ValidationError('projectId is required');
  }

  const doctors = await Doctor.find({
    accountId: scope.accountId,
    projectId: scope.projectId,
  }).select('doctorId fullName email phoneNumber status');

  let synced = 0;
  let skippedWithoutEmail = 0;

  for (const doctor of doctors) {
    const email = String(doctor.email || '').trim();
    if (!email) {
      skippedWithoutEmail += 1;
      continue;
    }
    await staffRepository.upsertHealthcareStaffByDoctor(scope, doctor);
    synced += 1;
  }

  return {
    synced,
    skippedWithoutEmail,
    totalDoctors: doctors.length,
  };
}

export default {
  listNurses,
  createNurse,
  listStaffMembers,
  createStaffMember,
  updateStaffMember,
  syncExistingDoctors,
};
