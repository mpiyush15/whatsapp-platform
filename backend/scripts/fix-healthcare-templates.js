import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const newTemplates = [
  {
    name: "healthcare_patient_welcome",
    language: "en",
    category: "utility",
    content: "Hi {{1}}, welcome to {{2}}! We are thrilled to have you. If you need any assistance, reply to this message. - {{3}}",
    variables: ["1", "2", "3"],
    variableMappings: {},
    components: [
      {
        type: "BODY",
        text: "Hi {{1}}, welcome to {{2}}! We are thrilled to have you. If you need any assistance, reply to this message. - {{3}}",
        example: {
          body_text: [
            ["Jane Doe", "City Clinic", "Dr. Smith"]
          ]
        }
      }
    ],
    hasMedia: false,
    mediaUrl: "",
    headerText: "",
    footerText: "",
    status: "draft",
    usageCount: 0,
    isDeleted: false
  },
  {
    name: "healthcare_prescription_issued",
    language: "en",
    category: "utility",
    content: "Hi {{1}}, your prescription from Dr. {{2}} is ready. Download it here: {{3}}. - {{4}}",
    variables: ["1", "2", "3", "4"],
    variableMappings: {},
    components: [
      {
        type: "BODY",
        text: "Hi {{1}}, your prescription from Dr. {{2}} is ready. Download it here: {{3}}. - {{4}}",
        example: {
          body_text: [
            ["John Doe", "Smith", "https://example.com/prescription.pdf", "City Clinic"]
          ]
        }
      }
    ],
    hasMedia: false,
    mediaUrl: "",
    headerText: "",
    footerText: "",
    status: "draft",
    usageCount: 0,
    isDeleted: false
  },
  {
    name: "healthcare_followup_reminder",
    language: "en",
    category: "utility",
    content: "Hi {{1}}, it's time for your follow-up with Dr. {{2}}. Please book your slot here: {{3}}. - {{4}}",
    variables: ["1", "2", "3", "4"],
    variableMappings: {},
    components: [
      {
        type: "BODY",
        text: "Hi {{1}}, it's time for your follow-up with Dr. {{2}}. Please book your slot here: {{3}}. - {{4}}",
        example: {
          body_text: [
            ["John Doe", "Smith", "https://example.com/book", "City Clinic"]
          ]
        }
      }
    ],
    hasMedia: false,
    mediaUrl: "",
    headerText: "",
    footerText: "",
    status: "draft",
    usageCount: 0,
    isDeleted: false
  },
  {
    name: "healthcare_invoice_issued",
    language: "en",
    category: "utility",
    content: "Hi {{1}}, your invoice for {{2}} is ready. Amount due: {{3}}. Pay here: {{4}} - {{5}}",
    variables: ["1", "2", "3", "4", "5"],
    variableMappings: {},
    components: [
      {
        type: "BODY",
        text: "Hi {{1}}, your invoice for {{2}} is ready. Amount due: {{3}}. Pay here: {{4}} - {{5}}",
        example: {
          body_text: [
            ["John Doe", "Consultation", "$50", "https://example.com/pay", "City Clinic"]
          ]
        }
      }
    ],
    hasMedia: false,
    mediaUrl: "",
    headerText: "",
    footerText: "",
    status: "draft",
    usageCount: 0,
    isDeleted: false
  }
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const Template = (await import('../src/models/Template.js')).default;
    const Project = (await import('../src/models/Project.js')).default;

    const projects = await Project.find({ vertical: 'healthcare' }).lean();

    for (const project of projects) {
      const { projectId, accountId } = project;

      // Fix existing appointment reminder template
      const existing = await Template.findOne({ projectId, name: 'healthcare_appointment_reminder' });
      if (existing) {
        let updated = false;
        if (existing.components && existing.components.length > 0) {
          const bodyComponent = existing.components.find(c => c.type === 'BODY');
          if (bodyComponent && bodyComponent.example && bodyComponent.example.body_text) {
             const currentBodyText = bodyComponent.example.body_text;
             if (currentBodyText.length > 1 || currentBodyText[0][0] === "sample_value") {
                 bodyComponent.example.body_text = [
                   ["John Doe", "Dr. Smith", "2026-06-12", "10:00 AM", "City Clinic"]
                 ];
                 updated = true;
             }
          }
        }
        if (updated) {
          await existing.save();
          console.log(`Updated healthcare_appointment_reminder for project ${projectId}`);
        }
      } else {
         const newApptTemplate = {
            accountId,
            projectId,
            name: "healthcare_appointment_reminder",
            language: "en",
            category: "utility",
            content: "Hi {{1}}, reminder: your appointment with Dr. {{2}} is on {{3}} at {{4}}. - {{5}}",
            variables: ["1", "2", "3", "4", "5"],
            variableMappings: {},
            components: [
            {
                type: "BODY",
                text: "Hi {{1}}, reminder: your appointment with Dr. {{2}} is on {{3}} at {{4}}. - {{5}}",
                example: {
                body_text: [
                    ["John Doe", "Dr. Smith", "2026-06-12", "10:00 AM", "City Clinic"]
                ]
                }
            }
            ],
            hasMedia: false,
            mediaUrl: "",
            headerText: "",
            footerText: "",
            status: "draft",
            usageCount: 0,
            isDeleted: false
         };
         await Template.create(newApptTemplate);
         console.log(`Created healthcare_appointment_reminder for project ${projectId}`);
      }

      // Seed new templates
      for (const tpl of newTemplates) {
        const tplExists = await Template.findOne({ projectId, name: tpl.name });
        if (!tplExists) {
          await Template.create({ ...tpl, accountId, projectId });
          console.log(`Created ${tpl.name} for project ${projectId}`);
        }
      }
    }

    console.log('Script completed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
