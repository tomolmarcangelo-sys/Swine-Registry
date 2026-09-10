import { createClient } from '@supabase/supabase-js';
const client = createClient('https://example.supabase.co', 'public-anon-key');
console.log(typeof client.getChannels);
