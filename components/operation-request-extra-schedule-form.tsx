'use client'

import { useActionState } from 'react'
import { createExtraScheduleAction, confirmExtraScheduleAction } from '@/app/operation/request-extra-schedule/actions'

type State={error?:string;success?:string;preview?:{transactionId:string;startPoint:string;destination:string;std:string;sta:string}}

export default function OperationRequestExtraScheduleForm({locations}:{locations:string[]}){
 const [state,formAction,pending]=useActionState(createExtraScheduleAction,{} as State)
 const [confirmState,confirmAction,confirmPending]=useActionState(confirmExtraScheduleAction,{} as State)
 return <div>
  <form action={formAction} className="data-form">
   <label>Titik Mulai<select name="startPoint" defaultValue="" required><option value="">Pilih Titik Mulai</option>{locations.map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Destinasi<select name="destination" defaultValue="" required><option value="">Pilih destinasi</option>{locations.map(x=><option key={x}>{x}</option>)}</select></label>
   <div className="form-row"><label>STD<input name="std" type="time" required/></label><label>STA<input name="sta" type="time" required/></label></div>
   {state.error?<p className="form-error" role="alert">{state.error}</p>:null}
   <button type="submit" disabled={pending}>{pending?'Menyiapkan preview...':'Submit Request'}</button>
  </form>
  {state.preview?<div className="metric-card" style={{marginTop:16}}>
   <h3>{state.preview.transactionId}</h3>
   <div className="task-summary-grid"><div><span>Rute</span><strong>{state.preview.startPoint} → {state.preview.destination}</strong></div><div><span>STD</span><strong>{state.preview.std.slice(11,16)}</strong></div><div><span>STA</span><strong>{state.preview.sta.slice(11,16)}</strong></div></div>
   <p className="muted">Periksa data sebelum request dikonfirmasi.</p>
   <form action={confirmAction} className="compact-form">
    <input type="hidden" name="transactionId" value={state.preview.transactionId}/><input type="hidden" name="startPoint" value={state.preview.startPoint}/><input type="hidden" name="destination" value={state.preview.destination}/><input type="hidden" name="std" value={state.preview.std.slice(11,16)}/><input type="hidden" name="sta" value={state.preview.sta.slice(11,16)}/>
    <div className="form-actions"><button type="submit" disabled={confirmPending}>{confirmPending?"Mengonfirmasi...":"Konfirmasi Request"}</button><button type="button" className="secondary-button" onClick={()=>window.location.reload()}>Edit Request</button></div>
   </form>
  </div>:null}
 </div>
}
