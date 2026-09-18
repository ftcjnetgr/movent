type TaskDurationRow = {
  transactionId: string
  taskType: string
  fleetOwnership: string | null
  status: string
  assignedAccepted: number | null
  acceptedDriving: number | null
  drivingCompleted: number | null
  assignedDriving: number | null
  totalCompleted: number | null
  canceledFromPrevious: number | null
  canceledCycle: number | null
}

type TicketDurationRow = {
  transactionId: string
  status: string
  createdAccepted: number | null
  acceptedInProgress: number | null
  inProgressCompleted: number | null
  totalCompleted: number | null
  canceledFromCreated: number | null
  canceledCycle: number | null
}

function formatMinutes(value: number | null) {
  if (value === null) return '-'
  if (value < 60) return `${Math.round(value)} m`
  const hours = Math.floor(value / 60)
  const minutes = Math.round(value % 60)
  return `${hours}j ${minutes}m`
}

function Bar({ value, max }: { value: number | null; max: number }) {
  if (value === null) return <span className="muted">-</span>
  const width = max > 0 ? Math.max(3, Math.min(100, (value / max) * 100)) : 3
  return (
    <div style={{display:'grid',gridTemplateColumns:'minmax(80px,1fr) auto',gap:8,alignItems:'center'}}>
      <div style={{height:8,borderRadius:999,background:'#eef1f4',overflow:'hidden'}}>
        <div style={{height:'100%',width:`${width}%`,background:'currentColor',opacity:0.65}} />
      </div>
      <span>{formatMinutes(value)}</span>
    </div>
  )
}

function maxValue(values: Array<number | null>) {
  return Math.max(0, ...values.filter((value): value is number => value !== null))
}

export function TaskDurationVisualization({ rows }: { rows: TaskDurationRow[] }) {
  const max = maxValue(rows.flatMap((row) => [
    row.assignedAccepted,
    row.acceptedDriving,
    row.drivingCompleted,
    row.assignedDriving,
    row.totalCompleted,
    row.canceledFromPrevious,
    row.canceledCycle,
  ]))

  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <h2>Durasi & Cycle Time per Transaksi</h2>
          <p>Visualisasi durasi proses berdasarkan penanda waktu setiap transaksi.</p>
        </div>
      </div>
      <div className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Jenis</th>
                <th>Status</th>
                <th>Assigned → Accepted</th>
                <th>Accepted → Driving</th>
                <th>Driving → Completed</th>
                <th>Assigned → Driving</th>
                <th>Cycle Completed</th>
                <th>From Previous → Canceled</th>
                <th>Cycle Canceled</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.transactionId}>
                  <td><strong>{row.transactionId}</strong></td>
                  <td>{row.taskType}{row.fleetOwnership === 'Non-TGR' ? ' · Non-TGR' : ''}</td>
                  <td>{row.status}</td>
                  <td><Bar value={row.assignedAccepted} max={max} /></td>
                  <td><Bar value={row.acceptedDriving} max={max} /></td>
                  <td><Bar value={row.drivingCompleted} max={max} /></td>
                  <td><Bar value={row.assignedDriving} max={max} /></td>
                  <td><Bar value={row.totalCompleted} max={max} /></td>
                  <td><Bar value={row.canceledFromPrevious} max={max} /></td>
                  <td><Bar value={row.canceledCycle} max={max} /></td>
                </tr>
              ))}
              {!rows.length ? <tr><td colSpan={10}><div className="empty-state">Belum ada data durasi transaksi.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export function TicketDurationVisualization({ rows }: { rows: TicketDurationRow[] }) {
  const max = maxValue(rows.flatMap((row) => [
    row.createdAccepted,
    row.acceptedInProgress,
    row.inProgressCompleted,
    row.totalCompleted,
    row.canceledFromCreated,
    row.canceledCycle,
  ]))

  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <h2>Durasi & Cycle Time Ticketing per Transaksi</h2>
          <p>Visualisasi durasi proses maintenance berdasarkan penanda waktu.</p>
        </div>
      </div>
      <div className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Status</th>
                <th>Created → Accepted</th>
                <th>Accepted → In Progress</th>
                <th>In Progress → Completed</th>
                <th>Cycle Completed</th>
                <th>Created → Canceled</th>
                <th>Cycle Canceled</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.transactionId}>
                  <td><strong>{row.transactionId}</strong></td>
                  <td>{row.status}</td>
                  <td><Bar value={row.createdAccepted} max={max} /></td>
                  <td><Bar value={row.acceptedInProgress} max={max} /></td>
                  <td><Bar value={row.inProgressCompleted} max={max} /></td>
                  <td><Bar value={row.totalCompleted} max={max} /></td>
                  <td><Bar value={row.canceledFromCreated} max={max} /></td>
                  <td><Bar value={row.canceledCycle} max={max} /></td>
                </tr>
              ))}
              {!rows.length ? <tr><td colSpan={8}><div className="empty-state">Belum ada data durasi ticketing.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
