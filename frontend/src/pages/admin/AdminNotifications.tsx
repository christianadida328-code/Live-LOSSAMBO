import React, { useEffect, useState } from 'react'
import NavBar from '../../shared/NavBar'
import { api } from '../../api/client'

type AdminNotification = {
  id: number
  title: string
  message: string
  created_at: string | null
  created_by: string | null
}

export default function AdminNotifications() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [items, setItems] = useState<AdminNotification[]>([])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const refresh = async () => {
    try {
      const r = await api<{ notifications: AdminNotification[] }>('/api/admin/notifications', { method: 'GET' })
      setItems(r.notifications)
    } catch (e: any) {
      setErr(e?.message || 'Erreur')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendNotification = async () => {
    setMsg('')
    setErr('')
    if (!title.trim() || !message.trim()) {
      setErr('Titre et message requis.')
      return
    }

    try {
      await api('/api/admin/notifications', {
        method: 'POST',
        body: JSON.stringify({ title, message }),
      })
      setMsg('Notification envoyée à tous les inscrits.')
      setTitle('')
      setMessage('')
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
            <p className="sectionTitle">Admin - Notifications</p>
            <p className="sectionHint">Envoyer un message à tous les comptes inscrits</p>
          </div>
        </div>

        {msg ? <div className="toast" style={{ marginBottom: 12 }}>{msg}</div> : null}
        {err ? <div className="err" style={{ marginBottom: 12 }}>{err}</div> : null}

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="heroCard" style={{ maxWidth: 620, flex: 1 }}>
            <p className="sectionTitle">Nouvelle notification</p>
            <div className="form" style={{ marginTop: 12, maxWidth: 'none' }}>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" />
              <textarea className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" rows={5} />
              <button className="btn btnPrimary" onClick={sendNotification}>Envoyer à tous</button>
            </div>
          </div>

          <div className="heroCard" style={{ maxWidth: 620, flex: 1 }}>
            <p className="sectionTitle">Notifications envoyées</p>
            <div style={{ marginTop: 12 }}>
              {items.length === 0 ? <div className="sectionHint">Aucune notification envoyée</div> : null}
              {items.map((item) => (
                <div className="cardItem" key={item.id} style={{ marginBottom: 10 }}>
                  <strong>{item.title}</strong>
                  {item.created_at ? <div className="sectionHint">{new Date(item.created_at).toLocaleString()}</div> : null}
                  <div className="sectionHint" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{item.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
