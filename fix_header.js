const fs = require('fs');
const path = './frontend/components/ProjectHeader.tsx';
let content = fs.readFileSync(path, 'utf8');

// Change backgrounds
content = content.replace(/bg-white border-b border-gray-200/g, 'bg-[#115B4C] border-b border-[#115B4C]/20');

// Change text-gray-900 to text-white
content = content.replace(/text-gray-900/g, 'text-white');

// Change text-gray-500 to text-white/70 (except in placeholder-gray-500)
content = content.replace(/text-gray-500(?![\w-])/g, 'text-white/70');

// Change text-gray-400 to text-white/50
content = content.replace(/text-gray-400(?![\w-])/g, 'text-white/50');

// Fix specific hover backgrounds on icon buttons
content = content.replace(/hover:bg-gray-100/g, 'hover:bg-white/10');
content = content.replace(/bg-gray-100 text-gray-900/g, 'bg-white/10 text-white'); // for inputs

// Fix the Dropdown text which we accidentally might change if it had gray-900, but it has text-gray-700
// Change text-gray-700 to text-white/90 for header text, but NOT for dropdown
// Settings page tab title
content = content.replace(/text-gray-700">\{tabTitle\}/g, 'text-white/90">{tabTitle}');
// Contacts page text
content = content.replace(/text-gray-700 flex-wrap/g, 'text-white/90 flex-wrap');

// Fix Sync buttons
content = content.replace(/bg-white border border-gray-300 text-gray-700 hover:bg-gray-50/g, 'bg-white/10 border border-white/20 text-white hover:bg-white/20');

// Fix live chat search input
content = content.replace(/bg-gray-100 text-gray-900 placeholder-gray-500/g, 'bg-white/10 text-white placeholder-white/50');

// Fix the chevron and user avatar in dropdown trigger
content = content.replace(/text-gray-600/g, 'text-white/90');
content = content.replace(/bg-gray-300/g, 'bg-white/20');

// Fix contacts header tier/usage text
content = content.replace(/text-gray-300/g, 'text-white/30'); // dividers
content = content.replace(/bg-gray-200/g, 'bg-white/20'); // progress bar background

// Dropdown is inside: <div className="absolute right-0 mt-2 w-48 bg-white ...
// Ensure we didn't break its text. Dropdown items have `text-gray-700 hover:bg-gray-50` which we didn't globally replace.

fs.writeFileSync(path, content);
console.log('Fixed ProjectHeader.tsx');
