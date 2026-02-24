const fs = require('fs');
const path = require('path');

// Files to update
const files = [
  'store/useDailyLogsStore.ts',
  'store/useStatsStore.ts',
];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace all standalone "await supabase" with "const supabase = createClient(); await supabase"
  // But only if there isn't already a "const supabase" in that function

  // Split by function boundaries
  const functions = content.split(/(?=\s+\w+: async \()/g);

  const updatedFunctions = functions.map(func => {
    // Check if this function block uses supabase but doesn't create a client
    if (func.includes('await supabase') && !func.includes('const supabase = createClient()')) {
      // Find the first try block and add the client creation there
      func = func.replace(/(\s+try\s*{)\s*\n/, '$1\n      const supabase = createClient()\n');
    }
    return func;
  });

  content = updatedFunctions.join('');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated: ${file}`);
});

console.log('All files updated successfully!');
