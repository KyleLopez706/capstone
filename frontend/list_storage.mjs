import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hwdtkuwtbuhxzaqnjwoy.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_KEY' // Service Role Key
const supabase = createClient(supabaseUrl, supabaseKey)

async function listFiles(path = '') {
  const { data, error } = await supabase.storage.from('showroom-assets').list(path);
  if (error) {
    console.log("Error:", error.message);
    return;
  }
  for (const item of data) {
    console.log(path + '/' + item.name);
    // If it's a folder (no id usually, or we can just try to recurse)
    if (!item.id) {
       await listFiles((path ? path + '/' : '') + item.name);
    }
  }
}
console.log("Listing bucket showroom-assets:");
listFiles();
