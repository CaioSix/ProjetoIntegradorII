import { createClient } from '@supabase/supabase-js';

// Priorizando as novas credenciais fornecidas
const supabaseUrl = 'https://yddhqyhnalqugonyjxee.supabase.co';
const supabaseAnonKey = 'sb_publishable_45YkNjdoQyTHWFvUkebh3g_5DK001n_';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
