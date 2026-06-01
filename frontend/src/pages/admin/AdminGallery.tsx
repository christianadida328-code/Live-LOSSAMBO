import React, { useEffect, useState } from 'react'
import NavBar from '../../shared/NavBar'
import { api, uploadAdminFile } from '../../api/client'

type AdminGalleryItem = {
  id: number
  title: string
  description: string | null
  media_url: string | null
  media_type: string
  created_at: string | null
}

export default function AdminGallery() {
  const [items, setItems] = useState<AdminGalleryItem[]>([])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')

  const [editId, setEditId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editMediaUrl, setEditMediaUrl] = useState('')

  const refresh = async () => {
    try {
      const r = await api<{ items: AdminGalleryItem[] }>('/api/admin/gallery/items', { method: 'GET' })
      setItems(r.items)
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

  const createItem = async () => {
    setMsg('')
    setErr('')
    if (!title.trim()) {
      setErr('Titre requis.')
      return
    }
    try {
      const r = await api<{ id: number }>('/api/admin/gallery/items', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          media_url: mediaUrl,
          media_type: 'image',
        }),
      })
      setMsg(`Élément galerie créé (id=${r.id}).`)
      setTitle('')
      setDescription('')
      setMediaUrl('')
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Erreur')
    }
  }

  const startEdit = (item: AdminGalleryItem) => {
    setEditId(item.id)
    setEditTitle(item.title || '')
    setEditDescription(item.description || '')
    setEditMediaUrl(item.media_url || '')
  }

  const applyUpdate = async () => {
    if (!editId) return
    setMsg('')
    setErr('')
    try {
      await api('/api/admin/gallery/items/' + editId, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          media_url: editMediaUrl,
          media_type: 'image',
        }),
      })
      setMsg('Élément galerie mis à jour.')
      setEditId(null)
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Erreur')
    }
  }

  const deleteItem = async (id: number) => {
    if (!confirm(`Supprimer l’élément galerie #${id} ?`)) return
    setMsg('')
    setErr('')
    try {
      await api('/api/admin/gallery/items/' + id, { method: 'DELETE' })
      setMsg('Élément galerie supprimé.')
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
            <p className="sectionTitle">Admin - Galerie multimédia</p>
            <p className="sectionHint">Ajouter / Modifier / Supprimer les éléments affichés sur l’accueil</p>
          </div>
        </div>

        {msg ? <div className="toast" style={{ marginBottom: 12 }}>{msg}</div> : null}
        {err ? <div className="err" style={{ marginBottom: 12 }}>{err}</div> : null}

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="heroCard" style={{ maxWidth: 700, flex: 1 }}>
            <p className="sectionTitle">Ajouter à la galerie</p>
            <div className="form" style={{ marginTop: 10 }}>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" />
              <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={3} />
              <input className="input" type="file" accept="image/*" onChange={(e) => uploadMedia(e.target.files?.[0], setMediaUrl)} />
              {mediaUrl ? <img src={mediaUrl} alt="Aperçu galerie" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} /> : null}
              <button className="btn btnPrimary" onClick={createItem}>Ajouter</button>
            </div>

            {editId ? (
              <div style={{ marginTop: 18 }}>
                <div className="sectionHint">Modification : #{editId}</div>
                <div className="form" style={{ marginTop: 8 }}>
                  <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Titre" />
                  <textarea className="input" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" rows={3} />
                  <input className="input" type="file" accept="image/*" onChange={(e) => uploadMedia(e.target.files?.[0], setEditMediaUrl)} />
                  {editMediaUrl ? <img src={editMediaUrl} alt="Aperçu galerie" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} /> : null}
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btnPrimary" onClick={applyUpdate}>Enregistrer</button>
                    <button className="btn" onClick={() => setEditId(null)}>Annuler</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="heroCard" style={{ maxWidth: 700, flex: 1 }}>
            <p className="sectionTitle">Liste galerie</p>
            <div style={{ marginTop: 10 }}>
              {items.length === 0 ? <div className="sectionHint">Aucun élément galerie</div> : null}
              {items.map((item) => (
                <div key={item.id} className="cardItem" style={{ marginBottom: 10 }}>
                  <div>
                    <strong>#{item.id} - {item.title}</strong>
                    <div className="sectionHint" style={{ maxHeight: 42, overflow: 'hidden' }}>{item.description}</div>
                  </div>
                  <div className="row" style={{ gap: 8, marginTop: 8 }}>
                    <button className="btn" onClick={() => startEdit(item)}>Modifier</button>
                    <button className="btn" onClick={() => deleteItem(item.id)}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
