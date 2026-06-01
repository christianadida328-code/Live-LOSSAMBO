import React, { useEffect, useState } from 'react'
import NavBar from '../../shared/NavBar'
import { api } from '../../api/client'

type VisitorRequest = {
  id: number
  type: 'event' | 'production' | 'shop'
  title: string
  name: string
  whatsapp: string
  quantity?: number
  message?: string
  status: string
  created_at: string | null
  whatsapp_url: string
}

const typeLabel = {
  event: 'Événement',
  production: 'Production',
  shop: 'Boutique',
}

export default function AdminRequests() {
  const [requests, setRequests] = useState<VisitorRequest[]>([])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const refresh = async () => {
    try {
      const r = await api<{ requests: VisitorRequest[] }>('/api/admin/requests', { method: 'GET' })
      setRequests(r.requests)
    } catch (e: any) {
      setErr(e?.message || 'Erreur')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markDone = async (request: VisitorRequest) => {
    setMsg('')
    setErr('')
    try {
      await api(`/api/admin/requests/${request.type}/${request.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'done' }),
      })
      setMsg('Demande marquée comme traitée.')
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Erreur')
    }
  }

  return (
    <div>
      <NavBar />
      <div className="container section">
        <div className="sectionHeader">
          <div>
            <p className="sectionTitle">Admin - Demandes visiteurs</p>
            <p className="sectionHint">Inscriptions événements, demandes production et commandes boutique</p>
          </div>
        </div>

        {msg ? <div className="toast" style={{ marginBottom: 12 }}>{msg}</div> : null}
        {err ? <div className="err" style={{ marginBottom: 12 }}>{err}</div> : null}

        <div className="heroCard" style={{ maxWidth: 1000 }}>
          {requests.length === 0 ? <div className="sectionHint">Aucune demande pour le moment</div> : null}
          {requests.map((r) => (
            <div key={`${r.type}-${r.id}`} className="cardItem" style={{ marginBottom: 10 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{typeLabel[r.type]} - {r.title}</strong>
                  <span className="sectionHint">{r.status === 'done' ? 'traitée' : 'nouvelle'}</span>
                </div>
                <div className="sectionHint">{r.name} • {r.whatsapp}</div>
                {r.type === 'shop' ? <div className="sectionHint">Quantité : {r.quantity || 1}</div> : null}
                {r.created_at ? <div className="sectionHint">{new Date(r.created_at).toLocaleString()}</div> : null}
                {r.message ? <div className="sectionHint" style={{ marginTop: 6 }}>{r.message}</div> : null}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                {r.whatsapp_url ? (
                  <a className="btn btnPrimary" href={r.whatsapp_url} target="_blank" rel="noreferrer">Répondre WhatsApp</a>
                ) : null}
                {r.status !== 'done' ? <button className="btn" onClick={() => markDone(r)}>Marquer traité</button> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
