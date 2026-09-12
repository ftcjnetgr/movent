'use client';

import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';

const roles=['Dispatcher','Executor','Controller','Super User'];

export default function AuthGuard({children}:{children:React.ReactNode}){
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    let mounted=true;
    async function check(){
      const {data:{session}}=await supabase.auth.getSession();
      if(session){
        const {data:profile}=await supabase.from('profiles').select('id,role,status,is_locked').eq('id',session.user.id).maybeSingle();
        const valid=!!profile && profile.status==='Active' && profile.is_locked===false && roles.includes(profile.role);
        if(!valid) await supabase.auth.signOut();
      }
      if(mounted)setReady(true);
    }
    check();
    return()=>{mounted=false};
  },[]);

  if(!ready)return <div className="login">Memuat Movent…</div>;
  return <>{children}</>;
}
