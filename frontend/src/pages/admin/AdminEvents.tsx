import React, { useEffect, useState } from 'react'
import NavBar from '../../shared/NavBar'
import { api, uploadAdminFile } from '../../api/client'

type AdminEvent = {
  id: number
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  cover_url: string
  venue: string
}

export default function AdminEvents() {
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [events, setEvents] = useState<AdminEvent[]>([])

  // Create Event
  const [title, setTitle] = useState('')
  const [venue, setVenue] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState('')

  // Update Event form
  const [eventEditId, setEventEditId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editVenue, setEditVenue] = useState('')
  const [editStartAt, setEditStartAt] = useState('')
  const [editEndAt, setEditEndAt] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCoverUrl, setEditCoverUrl] = useState('')

  const refresh = async () => {
    try {
      const e = await api<{ events: AdminEvent[] }>('/api/admin/events', { method: 'GET' })
      setEvents(e.events)
    } catch (e: any) {
      setErr(e?.message || 'Erreur')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const uploadCover = async (file: File | undefined, updateUrl: (url: string) => void) => {
    if (!file) return
    setMsg('')
    setErr('')
    try {
      const uploaded = await uploadAdminFile(file)
      updateUrl(uploaded.url)
      setMsg('Image téléchargée.')
    } catch (e: any) {
      setErr(e?.message || 'Erreur upload')
    }
  }

  const createEvent = async () => {
    setMsg('')
    setErr('')
    if (!title.trim() || !startAt) {
      setErr('Titre et date de début requis.')
      return
    }
    try {
      const r = await api<{ id: number }>('/api/admin/events', {
        method: 'POST',
        body: JSON.stringify({
          title,
          start_at: startAt,
          end_at: endAt || undefined,
          venue,
          description,
          cover_url: coverUrl,
        }),
      })
      setMsg(`Événement créé (id=${r.id}).`)
      setTitle('')
      setVenue('')
      setStartAt('')
      setEndAt('')
      setDescription('')
      setCoverUrl('')
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Erreur')
    }
  }

  const startEditEvent = (ev: AdminEvent) => {
    setEventEditId(ev.id)
    setEditTitle(ev.title || '')
    setEditVenue(ev.venue || '')
    setEditStartAt(ev.start_at || '')
    setEditEndAt(ev.end_at || '')
    setEditDescription(ev.description || '')
    setEditCoverUrl(ev.cover_url || '')
  }

  const applyUpdateEvent = async () => {
    if (!eventEditId) return
    setMsg('')
    setErr('')
    try {
      await api('/api/admin/events/' + eventEditId, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle,
          venue: editVenue,
          description: editDescription,
          start_at: editStartAt,
          end_at: editEndAt || undefined,
          cover_url: editCoverUrl,
        }),
      })
      setMsg('Événement mis à jour.')
      setEventEditId(null)
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Erreur')
    }
  }

  const deleteEvent = async (id: number) => {
    if (!confirm(`Supprimer l’événement #${id} ?`)) return
    setMsg('')
    setErr('')
    try {
      await api('/api/admin/events/' + id, { method: 'DELETE' })
      setMsg('Événement supprimé.')
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
            <p className="sectionTitle">Admin - Événements</p>
            <p className="sectionHint">Créer / Mettre à jour / Supprimer</p>
          </div>
        </div>

        {msg ? <div className="toast" style={{ marginBottom: 12 }}>{msg}</div> : null}
        {err ? <div className="err" style={{ marginBottom: 12 }}>{err}</div> : null}

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 360 }}>
            <div className="heroCard" style={{ maxWidth: 700 }}>
              <div className="sectionHeader" style={{ padding: 0 }}>
                <div>
                  <p className="sectionTitle">Créer un événement</p>
                  <p className="sectionHint">Remplir le formulaire</p>
                </div>
              </div>

              <div className="form" style={{ marginTop: 10 }}>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" />
                <input className="input" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Lieu" />
                <input
                  className="input"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  type="datetime-local"
                />
                <input
                  className="input"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  type="datetime-local"
                />
                <input className="input" type="file" accept="image/*" onChange={(e) => uploadCover(e.target.files?.[0], setCoverUrl)} />
                {coverUrl ? <img src={coverUrl} alt="Aperçu événement" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} /> : null}
                <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={4} />
                <button className="btn btnPrimary" onClick={createEvent}>Créer un événement</button>
              </div>

              {eventEditId ? (
                <div style={{ marginTop: 18 }}>
                  <div className="sectionHint">Mise à jour : #{eventEditId}</div>
                  <div className="form" style={{ marginTop: 8 }}>
                    <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Titre" />
                    <input className="input" value={editVenue} onChange={(e) => setEditVenue(e.target.value)} placeholder="Lieu" />
                    <input className="input" value={editStartAt.slice(0, 16)} onChange={(e) => setEditStartAt(e.target.value)} type="datetime-local" />
                    <input className="input" value={editEndAt ? editEndAt.slice(0, 16) : ''} onChange={(e) => setEditEndAt(e.target.value)} type="datetime-local" />
                    <input className="input" type="file" accept="image/*" onChange={(e) => uploadCover(e.target.files?.[0], setEditCoverUrl)} />
                    {editCoverUrl ? <img src={editCoverUrl} alt="Aperçu événement" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} /> : null}
                    <textarea className="input" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" rows={3} />
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn btnPrimary" onClick={applyUpdateEvent}>Enregistrer</button>
                      <button className="btn" onClick={() => setEventEditId(null)}>Annuler</button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 360 }}>
            <div className="heroCard" style={{ maxWidth: 700 }}>
              <p className="sectionTitle">Liste des événements</p>
              <p className="sectionHint">Cliquer “Modifier” pour pré-remplir</p>

              <div style={{ marginTop: 10 }}>
                {events.length === 0 ? <div className="sectionHint">Aucun événement</div> : null}
                {events.map((ev) => (
                  <div key={ev.id} className="cardItem" style={{ marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong>#{ev.id} - {ev.title}</strong>
                        <span className="sectionHint">{new Date(ev.start_at).toLocaleString()}</span>
                      </div>
                      <div className="sectionHint">{ev.venue}</div>
                      <div className="sectionHint" style={{ maxHeight: 42, overflow: 'hidden' }}>{ev.description}</div>
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 8 }}>
                      <button className="btn" onClick={() => startEditEvent(ev)}>Modifier</button>
                      <button className="btn" onClick={() => deleteEvent(ev.id)}>Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

