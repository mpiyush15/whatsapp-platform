const fs = require('fs');
let content = fs.readFileSync('frontend/components/TemplateEditForm.tsx', 'utf8');

// 1. Add mediaList state and fetch
if (!content.includes('const [mediaList, setMediaList]')) {
  content = content.replace(
    '  const [showButtonDropdown, setShowButtonDropdown] = useState(false)',
    '  const [showButtonDropdown, setShowButtonDropdown] = useState(false)\n  const [mediaList, setMediaList] = useState<any[]>([])\n\n  useEffect(() => {\n    if (projectId) {\n      fetch(`${API_URL}/media-library/${projectId}`, {\n        headers: {\n          "Authorization": `Bearer ${authService.getToken()}`\n        }\n      })\n      .then(res => res.json())\n      .then(data => setMediaList(data.media || []))\n      .catch(console.error)\n    }\n  }, [projectId])'
  );
}

// 2. Rewrite URL button section
const oldUrlButtonSection = `              {btn.type !== "QUICK_REPLY" && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {btn.type === "URL" ? "Website URL" : "Phone number"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={btn.type === "URL" ? "text" : "tel"}
                      value={btn.value}
                      onChange={(e) => updateButton(btn.id, { value: e.target.value })}
                      placeholder={btn.type === "URL" ? "https://example.com" : "+1234567890"}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {btn.type === "URL" && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!btn.value.includes('{{1}}')) {
                            const newUrl = btn.value.trim() + (btn.value.endsWith('/') ? '' : '/') + '{{1}}';
                            updateButton(btn.id, { value: newUrl });
                          }
                        }}
                        className="whitespace-nowrap px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                      >
                        + Add Variable
                      </button>
                    )}
                  </div>
                  {btn.type === "URL" && (
                    <p className="text-[11px] text-gray-500 mt-1.5 flex items-start gap-1">
                      <span className="text-blue-500">💡</span> 
                      <span>IMPORTANT: To make this a Dynamic URL, you MUST type a real website address first (e.g. <code>https://yourwebsite.com/</code>) and then add <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded">{'{{1}}'}</code> at the very end.</span>
                    </p>
                  )}
                </div>
              )}`;

const newUrlButtonSection = `              {btn.type !== "QUICK_REPLY" && (
                <div>
                  {btn.type === "URL" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={btn.isDynamicUrl || false} onChange={e => updateButton(btn.id, { isDynamicUrl: e.target.checked, isDynamicDocument: false })} className="rounded border-gray-300 text-blue-600" />
                          Dynamic URL
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={btn.isDynamicDocument || false} onChange={e => updateButton(btn.id, { isDynamicDocument: e.target.checked, isDynamicUrl: false })} className="rounded border-gray-300 text-blue-600" />
                          Dynamic Document
                        </label>
                      </div>
                      
                      {(!btn.isDynamicUrl && !btn.isDynamicDocument) && (
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Website URL</label>
                          <input type="text" value={btn.value} onChange={e => updateButton(btn.id, { value: e.target.value })} placeholder="https://example.com" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                      )}

                      {btn.isDynamicUrl && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Base URL</label>
                            <input type="text" value={btn.value} onChange={e => updateButton(btn.id, { value: e.target.value })} placeholder="https://yourdomain.com/download/" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Sample Variable Value <span className="text-[10px] text-gray-400 font-normal">(For Meta review)</span></label>
                            <input type="text" value={btn.sampleValue || ''} onChange={e => updateButton(btn.id, { sampleValue: e.target.value })} placeholder="mechanics.pdf" className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </div>
                        </div>
                      )}

                      {btn.isDynamicDocument && (
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Select Document from Media Library</label>
                          <select 
                            value={btn.mediaUrl || ''} 
                            onChange={(e) => {
                              const mUrl = e.target.value;
                              const m = mediaList.find(x => x.mediaUrl === mUrl);
                              if (m) {
                                // Extract base URL and sample from full URL
                                const urlParts = m.mediaUrl.split('/');
                                const filename = urlParts.pop();
                                const base = urlParts.join('/') + '/';
                                updateButton(btn.id, { mediaUrl: mUrl, value: base, sampleValue: filename });
                              } else {
                                updateButton(btn.id, { mediaUrl: '' });
                              }
                            }}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">-- Choose from Library --</option>
                            {mediaList.filter(m => m.mediaType === 'document' || m.mediaType === 'pdf').map(m => (
                              <option key={m._id} value={m.mediaUrl}>{m.fileName}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Phone number</label>
                      <input
                        type="tel"
                        value={btn.value}
                        onChange={(e) => updateButton(btn.id, { value: e.target.value })}
                        placeholder="+1234567890"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}`;

if (content.includes('placeholder={btn.type === "URL" ? "https://example.com" : "+1234567890"}')) {
  content = content.replace(oldUrlButtonSection, newUrlButtonSection);
}

fs.writeFileSync('frontend/components/TemplateEditForm.tsx', content);
