'use client';

import {useEffect,useMemo,useState} from 'react';
import {RefreshCw,Search,Users,Truck,Package,CalendarDays,ShieldCheck} from 'lucide-react';
import {supabase} from '../../lib/supabase';

type MasterKey='Executor'|'Fleet'|'Product'|'Schedule'|'User Login';

type Config={
  table:string;
  title:string;
  icon:any;
  key:string;
  columns:{key:string;label:string}[];
  search:string[];
};

const configs:Record<MasterKey,Config>={
  Executor:{table:'base_executors',title:'Executor',icon:Users,key:'executor_nik',columns:[{key:'executor_nik',label:'NIK'},{key:'full_name',label:'Nama'},{key:'status',label:'Status'}],search:['executor_nik','full_name','status']},
  Fleet:{table:'base_fleets',title:'Fleet',icon:Truck,key:'plat_number',columns:[{key:'plat_number',label:'Plat Number'},{key:'fleet_type',label:'Fleet Type'},{key:'status',label:'Status'}],search:['plat_number','fleet_type','status']},
  Product:{table:'base_products',title:'Product',icon:Package,key:'product',columns:[{key:'product',label:'Product'},{key:'status',label:'Status'}],search:['product','status']},
  Schedule:{table:'base_schedules',title:'Schedule',icon:CalendarDays,key:'schedule_id',columns:[{key:'schedule_id',label:'Schedule ID'},{key:'trip',label:'Trip'},{key:'schedule_hub_id',label:'Hub'},{key:'route',label:'Route'},{key:'category',label:'Category'},{key:'schedule_day_name',label:'Day'},{key:'std',label:'STD'},{key:'sta',label:'STA'},{key:'status',label:'Status'}],search:['schedule_id','trip','schedule_hub_id','route','category','schedule_day_name','status']},
  'User Login':{table:'base_userlogin',title:'User Login',icon:ShieldCheck,key:'username',columns:[{key:'username',label:'Username'},{key:'email',label:'Email'},{key:'nik',label:'NIK'},{key:'full_name',label:'Nama'},{key:'phone_number',label:'Phone'},{key:'role',label:'Role'},{key:'status',label:'Status'}],search:['username','email','nik','full_name','phone_number','role','status']}
};

function formatValue(key:string,value:any){if(value===null||value===undefined||value==='')return '—';if(key==='std'||key==='sta')return String(value).slice(0,5);return String(value)}

export default function MasterPage(){
  const [active,setActive]=useState<MasterKey>('Executor');
  const [rows,setRows]=useState<any[]>([]);
  const [q,setQ]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const cfg=configs[active];
  const Icon=cfg.icon;

  async function load(){
    setLoading(true);setError('');
    const select=cfg.columns.map(c=>c.key).join(',');
    const {data,error}=await supabase.from(cfg.table).select(select).order(cfg.key,{ascending:true}).limit(1000);
    if(error){setError(error.message);setRows([])}else setRows(data||[]);
    setLoading(false);
  }

  useEffect(()=>{setQ('');load()},[active]);

  const filtered=useMemo(()=>{
    const term=q.trim().toLowerCase();
    if(!term)return rows;
    return rows.filter(row=>cfg.search.some(key=>String(row[key]??'').toLowerCase().includes(term)));
  },[rows,q,cfg]);

  return <div>
    <div className="top">
      <div><div className="title">Master Data</div><div className="muted">Data referensi operasional dari tabel base_*.</div></div>
      <button className="btn secondary" onClick={load} disabled={loading}><RefreshCw size={15} style={{marginRight:7,verticalAlign:'middle'}}/>{loading?'Memuat…':'Refresh'}</button>
    </div>

    <div className="card">
      <div className="tabs" style={{marginBottom:14}}>
        {(Object.keys(configs) as MasterKey[]).map(key=>{const C=configs[key];const I=C.icon;return <button key={key} className={'tab '+(active===key?'on':'')} onClick={()=>setActive(key)}><I size={15} style={{verticalAlign:'middle',marginRight:6}}/>{key}</button>})}
      </div>
      <div className="toolbar">
        <div style={{display:'flex',alignItems:'center',gap:9,fontWeight:700}}><Icon size={18}/>{cfg.title}<span className="muted" style={{fontWeight:400}}>· {filtered.length}{q?' hasil':' data'}</span></div>
        <div style={{position:'relative',minWidth:260,flex:1,maxWidth:420}}><Search size={16} style={{position:'absolute',left:10,top:10,color:'#64748b'}}/><input className="search" style={{width:'100%',paddingLeft:34}} value={q} onChange={e=>setQ(e.target.value)} placeholder={'Cari '+cfg.title+'…'}/></div>
      </div>

      {error&&<div className="error" style={{marginBottom:12}}>{error}</div>}
      <div className="tablewrap">
        <table className="table"><thead><tr>{cfg.columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead>
          <tbody>{filtered.map((row,i)=><tr key={String(row[cfg.key])+'-'+i}>{cfg.columns.map(c=><td key={c.key}>{c.key==='status'?<span>{formatValue(c.key,row[c.key])}</span>:formatValue(c.key,row[c.key])}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {!loading&&!filtered.length&&<div className="muted" style={{padding:20,textAlign:'center'}}>{q?'Data tidak ditemukan.':'Belum ada data.'}</div>}
      {rows.length>=1000&&<div className="muted" style={{paddingTop:10}}>Menampilkan maksimal 1.000 baris.</div>}
    </div>

    <div className="muted" style={{fontSize:12,marginTop:10}}>Master Data menampilkan data referensi yang sudah di-import. Perubahan data dilakukan melalui Upload Data.</div>
  </div>
}
