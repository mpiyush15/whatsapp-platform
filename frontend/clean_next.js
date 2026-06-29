const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '.next');
try {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('.next directory removed successfully');
  } else {
    console.log('.next directory does not exist');
  }
} catch (err) {
  console.error('Error removing .next:', err);
  process.exit(1);
}
