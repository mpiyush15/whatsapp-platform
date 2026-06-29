import KeywordRule from '../models/KeywordRule.js';
import { compileFlowGraph } from './chatbotFlowCompiler.js';

export const HEALTHCARE_APPOINTMENT_BOT_NAME = 'Clinic appointment booking';
export const HEALTHCARE_APPOINTMENT_BOT_KEYWORDS = ['hi', 'hello', 'hey', 'start', 'book', 'appointment'];

const node = (id, type, data, position) => ({ id, type, position, data: { label: data.label || id, ...data } });
const edge = (source, target, sourceHandle = 'next') => ({
  id: `e-${source}-${target}-${sourceHandle}`,
  source,
  target,
  sourceHandle,
});

/**
 * Visual flow graph for healthcare WhatsApp appointment booking preset.
 */
export function buildHealthcareAppointmentFlowGraph() {
  const nodes = [
    node('start', 'start', { label: 'Greeting triggers' }, { x: 0, y: 0 }),
    node('lookup', 'vertical_action', {
      label: 'Lookup patient',
      vertical: 'healthcare',
      action: 'lookup_patient',
      actionConfig: {},
    }, { x: 0, y: 90 }),
    node('cond_patient', 'condition', {
      label: 'Patient exists?',
      variable: 'patient_exists',
      branches: [
        { id: 'branch-yes', value: 'yes' },
        { id: 'branch-no', value: 'no' },
      ],
    }, { x: 0, y: 180 }),
    node('ask_name', 'question', {
      label: 'Ask name',
      text: 'Welcome! Please share your full name to register.',
      saveAs: 'patient_name',
    }, { x: -220, y: 300 }),
    node('register', 'vertical_action', {
      label: 'Register patient',
      vertical: 'healthcare',
      action: 'create_patient',
      actionConfig: { nameVar: '{{patient_name}}' },
    }, { x: -220, y: 400 }),
    node('welcome_back', 'message', {
      label: 'Welcome back',
      text: 'Welcome back, {{patientName}}! 👋',
    }, { x: 200, y: 300 }),
    node('welcome_new', 'message', {
      label: 'Welcome new',
      text: 'Thanks {{patientName}}! You are registered with our clinic.',
    }, { x: -220, y: 500 }),
    node('menu', 'buttons', {
      label: 'Main menu',
      text: 'How can we help you today?',
      saveAs: 'menu_choice',
      buttons: [
        { id: 'book_appointment', title: 'Book appointment' },
        { id: 'not_now', title: 'Not now' },
      ],
    }, { x: 0, y: 600 }),
    node('cond_menu', 'condition', {
      label: 'Book selected?',
      variable: 'menu_choice',
      branches: [{ id: 'branch-book', value: 'book_appointment' }],
    }, { x: 0, y: 700 }),
    node('pick_doctor', 'list', {
      label: 'Choose doctor',
      text: 'Please choose a doctor:',
      saveAs: 'doctor_id',
      dynamicList: 'healthcare_doctors',
      items: [],
    }, { x: 0, y: 820 }),
    node('pick_slot', 'list', {
      label: 'Choose slot',
      text: 'Pick an available time (busy slots go to queue):',
      saveAs: 'slot_choice',
      dynamicList: 'healthcare_slots',
      items: [],
    }, { x: 0, y: 940 }),
    node('book', 'vertical_action', {
      label: 'Book appointment',
      vertical: 'healthcare',
      action: 'book_appointment',
      actionConfig: {
        patientNameVar: '{{patientName}}',
        doctorId: '{{doctor_id}}',
        slotVar: '{{slot_choice}}',
        slotsVar: '_slot_picker_json',
      },
    }, { x: 0, y: 1060 }),
    node('end_ok', 'end', {
      label: 'Done',
      text: 'Thank you! Our team will see you at the clinic. Reply *hi* anytime to book again.',
    }, { x: 0, y: 1180 }),
    node('end_skip', 'end', {
      label: 'Goodbye',
      text: 'No problem. Reply *hi* when you want to book an appointment.',
    }, { x: 280, y: 820 }),
  ];

  const edges = [
    edge('start', 'lookup'),
    edge('lookup', 'cond_patient'),
    edge('cond_patient', 'welcome_back', 'branch:branch-yes'),
    edge('cond_patient', 'ask_name', 'branch:branch-no'),
    edge('ask_name', 'register'),
    edge('register', 'welcome_new'),
    edge('welcome_back', 'menu'),
    edge('welcome_new', 'menu'),
    edge('menu', 'cond_menu'),
    edge('cond_menu', 'pick_doctor', 'branch:branch-book'),
    edge('cond_menu', 'end_skip', 'next'),
    edge('pick_doctor', 'pick_slot'),
    edge('pick_slot', 'book'),
    edge('book', 'end_ok'),
  ];

  return {
    version: 1,
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 0.85 },
  };
}

export async function installHealthcareAppointmentBot({
  accountId,
  projectId,
  phoneNumberId = null,
  updatedBy = 'system',
}) {
  if (!accountId || !projectId) {
    throw new Error('accountId and projectId are required');
  }

  const flowGraph = buildHealthcareAppointmentFlowGraph();
  const workflow = compileFlowGraph(flowGraph);

  const payload = {
    accountId,
    projectId,
    phoneNumberId: phoneNumberId || null,
    name: HEALTHCARE_APPOINTMENT_BOT_NAME,
    description: 'Preset: patient lookup, doctor & slot picker, appointment booking via WhatsApp.',
    keywords: HEALTHCARE_APPOINTMENT_BOT_KEYWORDS,
    matchType: 'contains',
    replyType: 'workflow',
    timeoutMinutes: 15,
    isActive: true,
    replyContent: {
      flowGraph,
      workflow,
    },
  };

  const existing = await KeywordRule.findOne({
    accountId,
    projectId,
    name: HEALTHCARE_APPOINTMENT_BOT_NAME,
  });

  if (existing) {
    existing.keywords = payload.keywords;
    existing.matchType = payload.matchType;
    existing.replyType = payload.replyType;
    existing.timeoutMinutes = payload.timeoutMinutes;
    existing.isActive = payload.isActive;
    existing.replyContent = payload.replyContent;
    if (phoneNumberId) existing.phoneNumberId = phoneNumberId;
    await existing.save();
    return { rule: existing, created: false };
  }

  const rule = await KeywordRule.create(payload);
  return { rule, created: true };
}

export default {
  buildHealthcareAppointmentFlowGraph,
  installHealthcareAppointmentBot,
  HEALTHCARE_APPOINTMENT_BOT_NAME,
  HEALTHCARE_APPOINTMENT_BOT_KEYWORDS,
};
