import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type UserRow = {
  username: string;
  password: string;
  email: string;
  nik: string;
  full_name: string;
  phone_number: string;
  role: 'Dispatcher'|'Executor'|'Controller'|'Super User';
  status: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: cors});
  if (req.method !== 'POST') return new Response(JSON.stringify({error:'Method not allowed'}), {status:405,headers:{...cors,'Content-Type':'application/json'}});

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return new Response(JSON.stringify({error:'Unauthorized'}), {status:401,headers:{...cors,'Content-Type':'application/json'}});

  const userClient = createClient(url, anon, {global:{headers:{Authorization:authHeader}}});
  const {data:{user:caller},error:callerError} = await userClient.auth.getUser();
  if (callerError || !caller) return new Response(JSON.stringify({error:'Unauthorized'}), {status:401,headers:{...cors,'Content-Type':'application/json'}});

  const admin = createClient(url, service);
  const {data:profile,error:profileError} = await admin.from('profiles').select('role,status,is_locked').eq('id',caller.id).maybeSingle();
  if (profileError || !profile || profile.status !== 'Active' || profile.is_locked || profile.role !== 'Super User') {
    return new Response(JSON.stringify({error:'Forbidden: Super User only'}), {status:403,headers:{...cors,'Content-Type':'application/json'}});
  }

  let body:{users:UserRow[]};
  try { body = await req.json(); } catch { return new Response(JSON.stringify({error:'Invalid JSON'}), {status:400,headers:{...cors,'Content-Type':'application/json'}}); }
  if (!Array.isArray(body.users) || body.users.length === 0 || body.users.length > 5000) {
    return new Response(JSON.stringify({error:'users must contain 1-5000 rows'}), {status:400,headers:{...cors,'Content-Type':'application/json'}});
  }

  const {data:list,error:listError} = await admin.auth.admin.listUsers({page:1,perPage:1000});
  if (listError) return new Response(JSON.stringify({error:listError.message}), {status:500,headers:{...cors,'Content-Type':'application/json'}});
  const byEmail = new Map((list.users || []).filter(u=>u.email).map(u=>[u.email!.toLowerCase(),u]));
  const results=[];

  for (const row of body.users) {
    if (!row.email || !row.password || !row.username || !row.full_name || !row.role) {
      results.push({username:row.username||'',email:row.email||'',ok:false,error:'username, password, email, full_name, role wajib diisi'}); continue;
    }
    try {
      const existing = byEmail.get(row.email.toLowerCase());
      if (existing) {
        const {error} = await admin.auth.admin.updateUserById(existing.id,{password:row.password,email:row.email});
        if (error) throw error;
        results.push({username:row.username,email:row.email,ok:true,action:'updated',auth_user_id:existing.id});
      } else {
        const {data,error} = await admin.auth.admin.createUser({email:row.email,password:row.password,email_confirm:true});
        if (error || !data.user) throw error || new Error('Auth user tidak terbentuk');
        byEmail.set(row.email.toLowerCase(),data.user);
        results.push({username:row.username,email:row.email,ok:true,action:'created',auth_user_id:data.user.id});
      }
      // The auth.users trigger provisions/syncs profiles from base_userlogin by email.
      const authUser = byEmail.get(row.email.toLowerCase());
      if (authUser) {
        const {error:syncError} = await admin.from('profiles').upsert({id:authUser.id,username:row.username,nik:row.nik,full_name:row.full_name,phone_number:row.phone_number,role:row.role,status:row.status},{onConflict:'id'});
        if (syncError) throw syncError;
      }
    } catch (e) {
      results.push({username:row.username,email:row.email,ok:false,error:e instanceof Error?e.message:String(e)});
    }
  }

  return new Response(JSON.stringify({ok:results.every(x=>x.ok),results}), {status:200,headers:{...cors,'Content-Type':'application/json'}});
});
