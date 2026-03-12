import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://qppngjgekvtqkkolesom.supabase.co';
export const supabaseAnonKey = 'sb_publishable_6g5e4zHnD1HFxGROgOl7_A_ZjOuPmFx';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
