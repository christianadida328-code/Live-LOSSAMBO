import React, { useEffect, useState } from 'react'
import NavBar from '../../shared/NavBar'
import { api, uploadAdminFile } from '../../api/client'

type AdminService = {
  id: number
  name: string
  description: string | null
  price_hint: string | null
  media_url: string
}

export default function AdminServices() {
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [services, setServices] = useState<AdminService[]>([])

  // Create Service
  const [svcName, setSvcName] = useState('')
  const [svcDescription, setSvcDescription] = useState('')
  const [svcPriceHint, setSvcPriceHint] = useState('')
  const [svcMediaUrl, setSvcMediaUrl] = useState('')

  // Update Service form
  const [svcEditId, setSvcEditId] = useState<number | null>(null)
  const [editSvcName, setEditSvcName] = useState('')
  const [editSvcDescription, setEditSvcDescription] = useState('')
  const [editSvcPriceHint, setEditSvcPriceHint] = useState('')
  const [editSvcMediaUrl, setEditSvcMediaUrl] = useState('')

  const refresh = async () => {
    try {
      const s = await api<{ services: AdminService[] }>('/api/admin/production/services', { method: 'GET' })
      setServices(s.services)
    } catch (e: any) {
      setErr(e?.message || 'Erreur')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const uploadMedia = async (file: File | undefined, updateUrl: (url: string) => void) => {
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

  const createService = async () => {
    setMsg('')
    setErr('')
    if (!svcName.trim()) {
      setErr('Nom du service requis.')
      return
    }
    try {
      const r = await api<{ id: number }>('/api/admin/production/services', {
        method: 'POST',
        body: JSON.stringify({
          name: svcName,
          description: svcDescription,
          price_hint: svcPriceHint,
          media_url: svcMediaUrl,
        }),
      })
      setMsg(`Service créé (id=${r.id}).`)
      setSvcName('')
      setSvcDescription('')
      setSvcPriceHint('')
      setSvcMediaUrl('')
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Erreur')
    }
  }

  const startEditService = (s: AdminService) => {
    setSvcEditId(s.id)
    setEditSvcName(s.name || '')
    setEditSvcDescription(s.description || '')
    setEditSvcPriceHint(s.price_hint || '')
    setEditSvcMediaUrl(s.media_url || '')
  }

  const applyUpdateService = async () => {
    if (!svcEditId) return
    setMsg('')
    setErr('')
    try {
      await api('/api/admin/production/services/' + svcEditId, {
        method: 'PUT',
        body: JSON.stringify({
          name: editSvcName,
          description: editSvcDescription,
          price_hint: editSvcPriceHint,
          media_url: editSvcMediaUrl,
        }),
      })
      setMsg('Service mis à jour.')
      setSvcEditId(null)
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Erreur')
    }
  }

  const deleteService = async (id: number) => {
    if (!confirm(`Supprimer le service #${id} ?`)) return
    setMsg('')
    setErr('')
    try {
      await api('/api/admin/production/services/' + id, { method: 'DELETE' })
      setMsg('Service supprimé.')
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
            <p className="sectionTitle">Admin - Services production</p>
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
                  <p className="sectionTitle">Créer un service</p>
                  <p className="sectionHint">Remplir le formulaire</p>
                </div>
              </div>

              <div className="form" style={{ marginTop: 10 }}>
                <input className="input" value={svcName} onChange={(e) => setSvcName(e.target.value)} placeholder="Nom du service" />
                <textarea className="input" value={svcDescription} onChange={(e) => setSvcDescription(e.target.value)} placeholder="Description" rows={3} />
                <input className="input" value={svcPriceHint} onChange={(e) => setSvcPriceHint(e.target.value)} placeholder="price_hint (ex: à partir de 50€)" />
                <input className="input" type="file" accept="image/*" onChange={(e) => uploadMedia(e.target.files?.[0], setSvcMediaUrl)} />
                {svcMediaUrl ? <img src={svcMediaUrl} alt="Aperçu service" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} /> : null}
                <button className="btn btnPrimary" onClick={createService}>Créer un service</button>
              </div>

              {svcEditId ? (
                <div style={{ marginTop: 18 }}>
                  <div className="sectionHint">Mise à jour : #{svcEditId}</div>
                  <div className="form" style={{ marginTop: 8 }}>
                    <input className="input" value={editSvcName} onChange={(e) => setEditSvcName(e.target.value)} placeholder="Nom" />
                    <textarea className="input" value={editSvcDescription} onChange={(e) => setEditSvcDescription(e.target.value)} placeholder="Description" rows={3} />
                    <input className="input" value={editSvcPriceHint} onChange={(e) => setEditSvcPriceHint(e.target.value)} placeholder="price_hint" />
                    <input className="input" type="file" accept="image/*" onChange={(e) => uploadMedia(e.target.files?.[0], setEditSvcMediaUrl)} />
                    {editSvcMediaUrl ? <img src={editSvcMediaUrl} alt="Aperçu service" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} /> : null}
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn btnPrimary" onClick={applyUpdateService}>Enregistrer</button>
                      <button className="btn" onClick={() => setSvcEditId(null)}>Annuler</button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 360 }}>
            <div className="heroCard" style={{ maxWidth: 700 }}>
              <p className="sectionTitle">Liste services</p>
              <div style={{ marginTop: 10 }}>
                {services.length === 0 ? <div className="sectionHint">Aucun service</div> : null}
                {services.map((s) => (
                  <div key={s.id} className="cardItem" style={{ marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong>#{s.id} - {s.name}</strong>
                        <span className="sectionHint">{s.price_hint || ''}</span>
                      </div>
                      <div className="sectionHint" style={{ maxHeight: 42, overflow: 'hidden' }}>{s.description}</div>
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 8 }}>
                      <button className="btn" onClick={() => startEditService(s)}>Modifier</button>
                      <button className="btn" onClick={() => deleteService(s.id)}>Supprimer</button>
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

