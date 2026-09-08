const fs = require('fs');
let code = fs.readFileSync('src/hooks/useRealtimeSync.ts', 'utf8');
code = code.replace(/(\.on\(\s*'postgres_changes',\s*\)\s*)/, '');
fs.writeFileSync('src/hooks/useRealtimeSync.ts', code);
