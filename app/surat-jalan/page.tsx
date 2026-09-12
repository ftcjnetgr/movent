'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Assignment = { id: string; assignment_no: string; schedule_id: string; plat_number: string; executor_nik: string; start_point: string; destination: string; status: string };
type SJ = { id: string; assignment_id: string; nomor_sj: string; qty: number | null; weight: number | null; catatan: string | null };
type Product = { product: string; status: string };
type SJProduct = { id: string; surat_jalan_id: string; product: string; qty: number | null; weight: number | null };

export default function SuratJalanPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sj, setSj] = useState<SJ[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sjProducts, setSjProducts] = useState<SJProduct[]>([]);
  const [assignmentId, setAssignmentId] = useState('');
  const [nomorSj, setNomorSj] = useState('');
  const [qty, setQty] = useState('');
  const [weight, setWeight] = useState('');
  const [catatan, setCatatan] = useState('');
  const [product, setProduct] = useState('');
  const [productQty, setProductQty] = useState('');
  const [productWeight, setProductWeight] = useState('');
  const [selectedSj, setSelectedSj] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError('');
    const [a, s, p] = await Promise.all([
      supabase.from('assignments').select('id,assignment_no,schedule_id,plat_number,executor_nik,start_point,destination,status').in('status', ['ASSIGNED','CONFIRMED','IN_PROGRESS','ARRIVED']).order('created_at', { ascending: false }),
      supabase.from('surat_jalan').select('id,assignment_id,nomor_sj,qty,weight,catatan').order('created_at', { ascending: false }),
      supabase.from('base_products').select('product,status').eq('status','Active').order('product')
    ]);
    if (a.error) setError(a.error.message);
    if (s.error) setError(s.error.message);
    if (p.error) setError(p.error.message);
    setAssignments(a.data || []); setSj(s.data || []); setProducts(p.data || []);
    const ids = (s.data || []).map((x: SJ) => x.id);
    if (ids.length) {
      const { data, error: pe } = await supabase.from('surat_jalan_products').select('id,surat_jalan_id,product,qty,weight').in('surat_jalan_id', ids).order('created_at');
      if (pe) setError(pe.message);
      setSjProducts(data || []);
    } else setSjProducts([]);
    setLoading(false);
  }

  async function createSj() {
    setBusy(true); setError(''); setMessage('');
    if (!assignmentId || !nomorSj.trim()) { setError('Assignment dan Nomor SJ wajib diisi.'); setBusy(false); return; }
    const { error: e } = await supabase.from('surat_jalan').insert({ assignment_id: assignmentId, nomor_sj: nomorSj.trim(), qty: qty ? Number(qty) : null, weight: weight ? Number(weight) : null, catatan: catatan.trim() || null });
    if (e) setError(e.message); else { setMessage('Surat Jalan berhasil dibuat.'); setAssignmentId(''); setNomorSj(''); setQty(''); setWeight(''); setCatatan(''); await load(); }
    setBusy(false);
  }

  async function addProduct() {
    setBusy(true); setError(''); setMessage('');
    if (!selectedSj || !product) { setError('Pilih Surat Jalan dan produk.'); setBusy(false); return; }
    const { error: e } = await supabase.from('surat_jalan_products').insert({ surat_jalan_id: selectedSj, product, qty: productQty ? Number(productQty) : null, weight: productWeight ? Number(productWeight) : null });
    if (e) setError(e.message); else { setMessage('Produk berhasil ditambahkan ke Surat Jalan.'); setProduct(''); setProductQty(''); setProductWeight(''); await load(); }
    setBusy(false);
  }

  async function removeProduct(id: string) {
    setBusy(true); setError('');
    const { error: e } = await supabase.from('surat_jalan_products').delete().eq('id', id);
    if (e) setError(e.message); else await load();
    setBusy(false);
  }

  const assignmentName = (id: string) => { const a = assignments.find(x => x.id === id); return a ? `${a.assignment_no} · ${a.schedule_id} · ${a.plat_number}` : id; };

  return <main style={{maxWidth:1100,margin:'0 auto',padding:'32px 24px',fontFamily:'system-ui,sans-serif'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
      <div><h1 style={{margin:0,fontSize:28}}>Surat Jalan</h1><div style={{color:'#64748b',marginTop:5}}>Kelola Surat Jalan dan detail produk berdasarkan assignment.</div></div>
      <a href="/" style={{textDecoration:'none'}}>← Movent</a>
    </div>
    {error && <div style={{background:'#fee2e2',padding:12,borderRadius:8,marginBottom:14,color:'#991b1b'}}>{error}</div>}
    {message && <div style={{background:'#dcfce7',padding:12,borderRadius:8,marginBottom:14,color:'#166534'}}>{message}</div>}

    <section style={{border:'1px solid #e2e8f0',borderRadius:12,padding:20,marginBottom:18}}>
      <h2 style={{fontSize:18,marginTop:0}}>Buat Surat Jalan</h2>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:12}}>
        <label>Assignment<select value={assignmentId} onChange={e=>setAssignmentId(e.target.value)} style={input}><option value="">Pilih assignment…</option>{assignments.map(a=><option key={a.id} value={a.id}>{a.assignment_no} · {a.schedule_id} · {a.plat_number}</option>)}</select></label>
        <label>Nomor SJ<input value={nomorSj} onChange={e=>setNomorSj(e.target.value)} style={input} placeholder="SJ-001"/></label>
        <label>Qty<input type="number" value={qty} onChange={e=>setQty(e.target.value)} style={input}/></label>
        <label>Weight<input type="number" value={weight} onChange={e=>setWeight(e.target.value)} style={input}/></label>
      </div>
      <label style={{display:'block',marginTop:12}}>Catatan<textarea value={catatan} onChange={e=>setCatatan(e.target.value)} style={{...input,minHeight:70}}/></label>
      <button onClick={createSj} disabled={busy} style={button}>{busy?'Menyimpan…':'Buat Surat Jalan'}</button>
    </section>

    <section style={{border:'1px solid #e2e8f0',borderRadius:12,padding:20,marginBottom:18}}>
      <h2 style={{fontSize:18,marginTop:0}}>Tambah Produk</h2>
      <div style={{display:'grid',gridTemplateColumns:'2fr 2fr 1fr 1fr',gap:12,alignItems:'end'}}>
        <label>Surat Jalan<select value={selectedSj} onChange={e=>setSelectedSj(e.target.value)} style={input}><option value="">Pilih SJ…</option>{sj.map(x=><option key={x.id} value={x.id}>{x.nomor_sj} · {assignmentName(x.assignment_id)}</option>)}</select></label>
        <label>Product<select value={product} onChange={e=>setProduct(e.target.value)} style={input}><option value="">Pilih product…</option>{products.map(p=><option key={p.product} value={p.product}>{p.product}</option>)}</select></label>
        <label>Qty<input type="number" value={productQty} onChange={e=>setProductQty(e.target.value)} style={input}/></label>
        <label>Weight<input type="number" value={productWeight} onChange={e=>setProductWeight(e.target.value)} style={input}/></label>
      </div>
      <button onClick={addProduct} disabled={busy} style={button}>{busy?'Menyimpan…':'Tambah Produk'}</button>
    </section>

    <section style={{border:'1px solid #e2e8f0',borderRadius:12,padding:20}}>
      <h2 style={{fontSize:18,marginTop:0}}>Daftar Surat Jalan</h2>
      {loading ? <div style={{color:'#64748b'}}>Memuat…</div> : <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Nomor SJ','Assignment','Qty','Weight','Catatan','Produk'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{sj.map(x=><tr key={x.id}><td style={td}><b>{x.nomor_sj}</b></td><td style={td}>{assignmentName(x.assignment_id)}</td><td style={td}>{x.qty ?? '-'}</td><td style={td}>{x.weight ?? '-'}</td><td style={td}>{x.catatan || '-'}</td><td style={td}>{sjProducts.filter(p=>p.surat_jalan_id===x.id).map(p=><div key={p.id} style={{marginBottom:4}}>{p.product} · {p.qty ?? '-'} · {p.weight ?? '-'} <button onClick={()=>removeProduct(p.id)} disabled={busy} style={{border:0,background:'transparent',cursor:'pointer'}}>×</button></div>)}{!sjProducts.some(p=>p.surat_jalan_id===x.id)&&<span style={{color:'#94a3b8'}}>Belum ada produk</span>}</td></tr>)}{!sj.length&&<tr><td colSpan={6} style={{padding:20,textAlign:'center',color:'#64748b'}}>Belum ada Surat Jalan.</td></tr>}</tbody></table></div>}
    </section>
    <footer style={{marginTop:28,textAlign:'center',color:'#64748b',fontSize:13}}>Part of FTC Go Project<br/><b>Developed by Fleet Traffic Control</b></footer>
  </main>;
}

const input: React.CSSProperties = { display:'block',width:'100%',boxSizing:'border-box',marginTop:6,padding:'9px 10px',border:'1px solid #cbd5e1',borderRadius:7,background:'white' };
const button: React.CSSProperties = { marginTop:14,padding:'9px 14px',border:0,borderRadius:7,cursor:'pointer' };
const th: React.CSSProperties = { textAlign:'left',padding:'10px 8px',borderBottom:'1px solid #e2e8f0',fontSize:13 };
const td: React.CSSProperties = { padding:'10px 8px',borderBottom:'1px solid #f1f5f9',fontSize:14,verticalAlign:'top' };