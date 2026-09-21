'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

type State = {
  error?: string
  success?: string
  transactionId?: string
  preview?: {
    transactionId: string
    flow: 'tgr' | 'distribusi'
    startPoint: string
    destination: string
    externalExecutor: string
    externalFleet: string
    sjNumber: string
    sjQty: number
    sjWeight: number
    product: string
    sjNote: string | null
    scheduleId?: string
    executorNik?: string
    platNumber?: string
    std?: string
    sta?: string
  }
}

function todayTimestamp(time: string) {
  const [hour, minute] = time.split(':').map(Number)
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return `${date}T${time}:00+07:00`
}

async function activeExecutorAndFleet(admin: ReturnType<typeof createAdminClient>, executorNik: string, platNumber: string) {
  const [{ data: executor }, { data: fleet }] = await Promise.all([
    admin.from('executors').select('executor_nik, full_name, status').eq('executor_nik', executorNik).eq('status', 'Active').maybeSingle(),
    admin.from('fleets').select('plat_number, fleet_type, status').eq('plat_number', platNumber).eq('status', 'Active').maybeSingle(),
  ])
  return { executor, fleet }
}

async function nextTransaction(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin.rpc('movent_next_transaction_id')
  if (error || !data) return null
  return data as string
}

export async function createDispatcherTaskAction(_state: State, formData: FormData): Promise<State> {
  const profile = await getCurrentProfile()
  if (!['Dispatcher', 'Super User'].includes(profile.role)) return { error: 'Kamu belum punya akses ke bagian ini.' }

  const taskType = String(formData.get('taskType') ?? '')
  const ownership = String(formData.get('fleetOwnership') ?? '')
  if (profile.role === 'Dispatcher' && taskType === 'Supply' && ownership === 'Non-TGR') {
    return { error: 'Tugas Supply Non-TGR dibuat oleh Operation.' }
  }
  const admin = createAdminClient()

  if (taskType === 'Distribusi Mobil') {
    const startPoint = String(formData.get('startPoint') ?? '').trim()
    const destination = String(formData.get('destination') ?? '').trim()
    const std = String(formData.get('std') ?? '').trim()
    const sta = String(formData.get('sta') ?? '').trim()
    const executorNik = String(formData.get('executorNik') ?? '').trim()
    const platNumber = String(formData.get('platNumber') ?? '').trim()
    if (!startPoint || !destination || !std || !sta || !executorNik || !platNumber) return { error: 'Start Point, Destinasi, STD, STA, Executor, dan Armada perlu diisi dulu, ya.' }

    const [startLocation, destinationLocation] = await Promise.all([
      admin.from('locations').select('location, grouping, status').eq('location', startPoint).eq('status', 'Active').maybeSingle(),
      admin.from('locations').select('location, grouping, status').eq('location', destination).eq('status', 'Active').maybeSingle(),
    ])
    if (!startLocation.data || !destinationLocation.data) return { error: 'Start Point dan Destinasi harus berasal dari Database Lokasi yang Active.' }
    const timestamps = [todayTimestamp(std), todayTimestamp(sta)]
    if (!timestamps[0] || !timestamps[1]) return { error: 'STD atau STA belum benar.' }
    const { executor, fleet } = await activeExecutorAndFleet(admin, executorNik, platNumber)
    if (!executor || !fleet) return { error: 'Executor atau Armada belum tersedia.' }
    const transactionId = await nextTransaction(admin)
    if (!transactionId) return { error: 'ID transaksi belum berhasil dibuat. Coba lagi, ya.' }
    return { success: 'Preview tugas sudah siap. Periksa sebelum konfirmasi.', preview: { transactionId, flow: 'distribusi', startPoint, destination, externalExecutor: executor.full_name, externalFleet: fleet.plat_number, sjNumber: '', sjQty: 0, sjWeight: 0, product: '', sjNote: null, executorNik: executor.executor_nik, platNumber: fleet.plat_number, std, sta } }
  }

  if (taskType === 'Supply' && ownership === 'Non-TGR') {
    return { error: 'Tugas Supply Non-TGR dibuat oleh Operation.' }
  }

  return { error: 'Jenis tugasnya belum lengkap. Coba cek lagi, ya.' }
}


export async function confirmDispatcherTaskAction(_state: State, formData: FormData): Promise<State> {
  const profile = await getCurrentProfile()
  if (!['Dispatcher','Super User'].includes(profile.role)) return { error: 'Kamu belum punya akses ke bagian ini.' }
  const flow=String(formData.get('flow')??''), transactionId=String(formData.get('transactionId')??'').trim(), executorNik=String(formData.get('executorNik')??'').trim(), platNumber=String(formData.get('platNumber')??'').trim(), scheduleId=String(formData.get('scheduleId')??'').trim()
  const admin=createAdminClient(); const {executor,fleet}=await activeExecutorAndFleet(admin,executorNik,platNumber); if(!executor||!fleet)return{error:'Executor atau Armada belum tersedia.'}
  if(flow==='tgr'){
    const {data:schedule}=await admin.from('schedules').select('*').eq('schedule_id',scheduleId).eq('status','Active').maybeSingle(); if(!schedule)return{error:'Schedule tidak tersedia.'}
    const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); const std=`${date}T${schedule.std}+07:00`,sta=`${date}T${schedule.sta}+07:00`
    const {error}=await admin.from('tasks').insert({transaction_id:transactionId,source_type:'Schedule',task_type:'Supply',fleet_ownership:'TGR',status:'Assigned',created_by:profile.id,assigned_by:profile.id,executor_nik:executor.executor_nik,executor_snapshot:executor,fleet_snapshot:fleet,schedule_id:schedule.schedule_id,schedule_snapshot:schedule,start_point:schedule.start_point,start_point_snapshot:schedule,destination:schedule.destination,destination_snapshot:schedule,std,sta,assigned_at:new Date().toISOString()});if(error)return{error:'Tugas belum berhasil dikonfirmasi.'}
  } else if(flow==='distribusi'){
    const startPoint=String(formData.get('startPoint')??'').trim(),destination=String(formData.get('destination')??'').trim(),std=String(formData.get('std')??'').trim(),sta=String(formData.get('sta')??'').trim();const ts1=todayTimestamp(std),ts2=todayTimestamp(sta);if(!startPoint||!destination||!ts1||!ts2)return{error:'Data tugas belum lengkap.'};const[{data:s},{data:d}]=await Promise.all([admin.from('locations').select('location,grouping,status').eq('location',startPoint).eq('status','Active').maybeSingle(),admin.from('locations').select('location,grouping,status').eq('location',destination).eq('status','Active').maybeSingle()]);if(!s||!d)return{error:'Lokasi belum tersedia.'};const{error}=await admin.from('tasks').insert({transaction_id:transactionId,source_type:'Manual',task_type:'Distribusi Mobil',fleet_ownership:'Non-TGR',status:'Assigned',created_by:profile.id,assigned_by:profile.id,executor_nik:executor.executor_nik,executor_snapshot:executor,fleet_snapshot:fleet,start_point:startPoint,start_point_snapshot:s,destination,destination_snapshot:d,std:ts1,sta:ts2,assigned_at:new Date().toISOString()});if(error)return{error:'Tugas belum berhasil dikonfirmasi.'}
  } else return{error:'Preview tugas tidak valid.'}
  revalidateTaskPaths(); return{success:`Tugas ${transactionId} berhasil dikonfirmasi.`,transactionId}
}
export async function cancelDispatcherTaskAction(formData: FormData) {
  const profile = await getCurrentProfile()
  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()
  if (!transactionId || !note) return { error: 'Transaction ID dan alasan pembatalan perlu diisi dulu, ya.' }

  const admin = createAdminClient()
  const { data: task } = await admin.from('tasks').select('id, status, created_by, fleet_ownership').eq('transaction_id', transactionId).maybeSingle()
  if (!task) return { error: 'Tugas nggak ditemukan.' }
  if (task.fleet_ownership === 'Non-TGR') {
    if (profile.role !== 'Super User') return { error: 'Tugas Armada Non-TGR hanya dapat dibatalkan oleh Super User.' }
    if (!['Assigned', 'Driving'].includes(task.status)) return { error: 'Tugas sudah selesai atau tidak bisa dibatalkan.' }
  } else {
    if (task.status !== 'Assigned') return { error: 'Tugas sudah diterima atau memang sudah nggak bisa dibatalkan.' }
    if (profile.role !== 'Super User' && (profile.role !== 'Dispatcher' || task.created_by !== profile.id)) {
      return { error: 'Kamu belum punya akses ke bagian ini.' }
    }
  }

  const { error } = await admin.from('tasks').update({
    status: 'Canceled',
    canceled_at: new Date().toISOString(),
    canceled_from_status: task.status,
    cancellation_note: note,
  }).eq('id', task.id).eq('status', task.status)
  if (error) return { error: 'Tugas belum berhasil dibatalkan. Coba lagi, ya.' }
  revalidateTaskPaths()
  redirect('/dispatcher/riwayat-penugasan')
}

function revalidateTaskPaths() {
  revalidatePath('/dispatcher/beranda')
  revalidatePath('/dispatcher/riwayat-penugasan')
  revalidatePath('/dispatcher/armada-non-tgr')
  revalidatePath('/dispatcher/timetable')
  revalidatePath('/controller/beranda')
  revalidatePath('/controller/timetable')
  revalidatePath('/executor/tugas-saya')
}
