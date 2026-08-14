import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hwdtkuwtbuhxzaqnjwoy.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log("Checking cabinet_materials...");
  let res = await supabase.from('cabinet_materials').select('*');
  if (res.data) console.log("cabinet_materials:", res.data);
  else console.log("Error cabinet_materials:", res.error.message);

  console.log("Checking materials...");
  res = await supabase.from('materials').select('*');
  if (res.data) console.log("materials:", res.data.length, "items");
  if (res.data && res.data.length > 0) console.log("First material keys:", Object.keys(res.data[0]));
}
check();
