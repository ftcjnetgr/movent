import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rufvogaxmepezotkbgug.supabase.co', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_uK_JzVQFzuhdIyhtEA36Rw_ih7-GWTw');
