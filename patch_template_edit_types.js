const fs = require('fs');
let content = fs.readFileSync('frontend/components/TemplateEditForm.tsx', 'utf8');

content = content.replace(
  '  value: string // url or phone number',
  '  value: string // url or phone number\n  isDynamicUrl?: boolean\n  isDynamicDocument?: boolean\n  sampleValue?: string\n  mediaUrl?: string'
);

content = content.replace(
  '  templateType: "default" | "catalogue" | "calling_permissions_request"',
  '  templateType: "default" | "catalogue" | "calling_permissions_request"\n  projectId?: string'
);

content = content.replace(
  'export default function TemplateEditForm({ formData, setFormData, category, templateType }: Props) {',
  'import { authService } from "@/lib/auth"\nconst API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"\n\nexport default function TemplateEditForm({ formData, setFormData, category, templateType, projectId }: Props) {'
);

fs.writeFileSync('frontend/components/TemplateEditForm.tsx', content);
