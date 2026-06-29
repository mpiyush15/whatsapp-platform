const FIELD_LABELS = {
  name: 'student name',
  email: 'email',
  course: 'course',
  batch: 'batch',
  notes: 'question',
};

const DEFAULT_FIELDS = ['name', 'course', 'batch'];

const normalizeFields = (fields = DEFAULT_FIELDS) => {
  const selected = Array.isArray(fields) ? fields : DEFAULT_FIELDS;
  const clean = selected
    .map((field) => String(field || '').trim())
    .filter((field) => Object.prototype.hasOwnProperty.call(FIELD_LABELS, field));
  return clean.length > 0 ? [...new Set(clean)] : DEFAULT_FIELDS;
};

const questionStep = (id, text, saveAs) => ({
  id,
  type: 'question',
  text,
  saveAs,
  waitForResponse: true,
});

export function buildEducationPresetWorkflow({ fields = DEFAULT_FIELDS, preset = 'education_enquiry' } = {}) {
  const selectedFields = normalizeFields(fields);
  const workflow = [{
    id: 'welcome',
    type: 'text',
    text: preset === 'batch_enquiry'
      ? 'Hi! I can help you find the right active batch. Please share a few details.'
      : 'Hi! I can help you with course and admission enquiry. Please share a few details.',
  }];

  if (selectedFields.includes('course')) {
    workflow.push({
      id: 'select_course',
      type: 'list',
      text: 'Which course are you interested in?',
      dynamicList: 'education_courses',
      saveAs: 'course',
      waitForResponse: true,
    });
  }

  if (selectedFields.includes('batch')) {
    workflow.push({
      id: 'select_batch',
      type: 'list',
      text: 'Which active/upcoming batch do you prefer?',
      dynamicList: 'education_batches',
      saveAs: 'batch',
      waitForResponse: true,
    });
  }

  if (selectedFields.includes('name')) {
    workflow.push(questionStep('student_name', 'Please share the student name.', 'name'));
  }

  if (selectedFields.includes('email')) {
    workflow.push(questionStep('student_email', 'Please share email address.', 'email'));
  }

  if (selectedFields.includes('notes')) {
    workflow.push(questionStep('student_notes', 'Any specific question or requirement?', 'notes'));
  }

  workflow.push({
    id: 'save_enquiry',
    type: 'vertical_action',
    text: '',
    vertical: 'education',
    action: 'upsert_enquiry',
    actionConfig: {},
  });

  workflow.push({
    id: 'done',
    type: 'text',
    text: 'Thanks! Your enquiry is saved. Our counsellor will contact you soon.',
  });

  return workflow;
}

export function buildEducationPresetRule({ projectId, preset = 'education_enquiry', fields, isActive = true }) {
  const selectedFields = normalizeFields(fields);
  const isBatchPreset = preset === 'batch_enquiry';

  return {
    projectId,
    name: isBatchPreset ? 'Education Batch Enquiry' : 'Education Course Enquiry',
    description: `Preset education flow collecting ${selectedFields.map((field) => FIELD_LABELS[field]).join(', ')} with live active course/batch lists.`,
    keywords: isBatchPreset
      ? ['hi', 'hello', 'hey', 'enquiry', 'batch', 'batch enquiry', 'new batch', 'timing']
      : ['hi', 'hello', 'hey', 'enquiry', 'course', 'course enquiry', 'admission', 'fees'],
    matchType: 'contains',
    replyType: 'workflow',
    replyContent: {
      workflow: buildEducationPresetWorkflow({ fields: selectedFields, preset }),
    },
    timeoutMinutes: 5,
    isActive: Boolean(isActive),
  };
}

export async function ensureEducationPresetRules({ KeywordRule, accountId, projectId }) {
  if (!KeywordRule || !accountId || !projectId) return [];

  const definitions = getEducationPresetDefinitions();
  const ensured = [];

  for (const definition of definitions) {
    const baseRule = buildEducationPresetRule({
      projectId,
      preset: definition.key,
      fields: definition.defaultFields,
      isActive: true,
    });

    let rule = await KeywordRule.findOne({
      accountId,
      projectId,
      name: baseRule.name,
    });

    if (!rule) {
      rule = await KeywordRule.create({
        accountId,
        description: '',
        triggerCount: 0,
        successRate: 0,
        ...baseRule,
      });
    } else {
      await KeywordRule.updateOne(
        { _id: rule._id },
        {
          $addToSet: { keywords: { $each: baseRule.keywords } },
          $set: { updatedAt: new Date() },
        }
      );
      rule = await KeywordRule.findById(rule._id);
    }

    ensured.push(rule);
  }

  return ensured;
}

export function getEducationPresetDefinitions() {
  return [
    {
      key: 'education_enquiry',
      name: 'Course Enquiry',
      description: 'Collect student details and selected active course/batch.',
      defaultFields: DEFAULT_FIELDS,
      availableFields: Object.entries(FIELD_LABELS).map(([key, label]) => ({ key, label })),
    },
    {
      key: 'batch_enquiry',
      name: 'Batch Enquiry',
      description: 'Help students choose from active/upcoming batches.',
      defaultFields: ['course', 'batch', 'name', 'notes'],
      availableFields: Object.entries(FIELD_LABELS).map(([key, label]) => ({ key, label })),
    },
  ];
}
