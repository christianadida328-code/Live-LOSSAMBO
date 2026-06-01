import React, { useEffect, useState } from 'react'
import NavBar from '../../shared/NavBar'
import { api, uploadAdminFile } from '../../api/client'

type AdminShopItem = {
  id: number
  name: string
  description: string | null
  price: string
  image_url: string | null
  kind: string
  available: boolean
}

export default function AdminShopItems() {
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [items, setItems] = useState<AdminShopItem[]>([])

  // Create Item
  const [itemName, setItemName] = useState('')
  const [itemDesc, setItemDesc] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemImageUrl, setItemImageUrl] = useState('')
  const [itemKind, setItemKind] = useState<'ticket' | 'merch'>('ticket')
  const [itemAvailable, setItemAvailable] = useState(true)

  // Update Item form
  const [itemEditId, setItemEditId] = useState<number | null>(null)
  const [editItemName, setEditItemName] = useState('')
  const [editItemDesc, setEditItemDesc] = useState('')
  const [editItemPrice, setEditItemPrice] = useState('')
  const [editItemImageUrl, setEditItemImageUrl] = useState('')
  const [editItemKind, setEditItemKind] = useState<'ticket' | 'merch'>('ticket')
  const [editItemAvailable, setEditItemAvailable] = useState(true)

  const refresh = async () => {
    try {
      const i = await api<{ items: AdminShopItem[] }>('/api/admin/shop/items', { method: 'GET' })
      setItems(i.items)
    } catch (e: any) {
      setErr(e?.message || 'Erreur')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const uploadItemImage = async (file: File | undefined, updateUrl: (url: string) => void) => {
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
    if (!itemName.trim()) {
      setErr('Nom de l’item requis.')
      return
    }
    try {
      const r = await api<{ id: number }>('/api/admin/shop/items', {
        method: 'POST',
        body: JSON.stringify({
          name: itemName,
          description: itemDesc,
          price: itemPrice ? Number(itemPrice) : 0,
          image_url: itemImageUrl,
          kind: itemKind,
          available: itemAvailable,
        }),
      })
      setMsg(`Item créé (id=${r.id}).`)
      setItemName('')
      setItemDesc('')
      setItemPrice('')
      setItemImageUrl('')
      setItemKind('ticket')
      setItemAvailable(true)
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Erreur')
    }
  }

  const startEditItem = (it: AdminShopItem) => {
    setItemEditId(it.id)
    setEditItemName(it.name || '')
    setEditItemDesc(it.description || '')
    setEditItemPrice(it.price || '')
    setEditItemImageUrl(it.image_url || '')
    setEditItemKind((it.kind as any) || 'ticket')
    setEditItemAvailable(!!it.available)
  }

  const applyUpdateItem = async () => {
    if (!itemEditId) return
    setMsg('')
    setErr('')
    try {
      await api('/api/admin/shop/items/' + itemEditId, {
        method: 'PUT',
        body: JSON.stringify({
          name: editItemName,
          description: editItemDesc,
          price: editItemPrice ? Number(editItemPrice) : 0,
          image_url: editItemImageUrl,
          kind: editItemKind,
          available: editItemAvailable,
        }),
      })
      setMsg('Item mis à jour.')
      setItemEditId(null)
      await refresh()
    } catch (e: any) {
      setErr(e?.message || 'Erreur')
    }
  }

  const deleteItem = async (id: number) => {
    if (!confirm(`Supprimer l’item #${id} ?`)) return
    setMsg('')
    setErr('')
    try {
      await api('/api/admin/shop/items/' + id, { method: 'DELETE' })
      setMsg('Item supprimé.')
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
            <p className="sectionTitle">Admin - Boutique (Items)</p>
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
                  <p className="sectionTitle">Créer un item</p>
                  <p className="sectionHint">Remplir le formulaire</p>
                </div>
              </div>

              <div className="form" style={{ marginTop: 10 }}>
                <input className="input" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Nom" />
                <textarea className="input" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} placeholder="Description" rows={3} />
                <input className="input" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} placeholder="Prix (ex: 12.50)" />
                <input className="input" type="file" accept="image/*" onChange={(e) => uploadItemImage(e.target.files?.[0], setItemImageUrl)} />
                {itemImageUrl ? <img src={itemImageUrl} alt="Aperçu item" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} /> : null}
                <div className="row" style={{ gap: 8 }}>
                  <select className="input" value={itemKind} onChange={(e) => setItemKind(e.target.value as any)}>
                    <option value="ticket">ticket</option>
                    <option value="merch">merch</option>
                  </select>
                  <label className="row" style={{ alignItems: 'center', gap: 8, paddingLeft: 6 }}>
                    <input type="checkbox" checked={itemAvailable} onChange={(e) => setItemAvailable(e.target.checked)} />
                    Disponible
                  </label>
                </div>
                <button className="btn btnPrimary" onClick={createItem}>Créer un item</button>
              </div>

              {itemEditId ? (
                <div style={{ marginTop: 18 }}>
                  <div className="sectionHint">Mise à jour : #{itemEditId}</div>
                  <div className="form" style={{ marginTop: 8 }}>
                    <input className="input" value={editItemName} onChange={(e) => setEditItemName(e.target.value)} placeholder="Nom" />
                    <textarea className="input" value={editItemDesc} onChange={(e) => setEditItemDesc(e.target.value)} placeholder="Description" rows={3} />
                    <input className="input" value={editItemPrice} onChange={(e) => setEditItemPrice(e.target.value)} placeholder="Prix" />
                    <input className="input" type="file" accept="image/*" onChange={(e) => uploadItemImage(e.target.files?.[0], setEditItemImageUrl)} />
                    {editItemImageUrl ? <img src={editItemImageUrl} alt="Aperçu item" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} /> : null}
                    <div className="row" style={{ gap: 8 }}>
                      <select className="input" value={editItemKind} onChange={(e) => setEditItemKind(e.target.value as any)}>
                        <option value="ticket">ticket</option>
                        <option value="merch">merch</option>
                      </select>
                      <label className="row" style={{ alignItems: 'center', gap: 8, paddingLeft: 6 }}>
                        <input type="checkbox" checked={editItemAvailable} onChange={(e) => setEditItemAvailable(e.target.checked)} />
                        Disponible
                      </label>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn btnPrimary" onClick={applyUpdateItem}>Enregistrer</button>
                      <button className="btn" onClick={() => setItemEditId(null)}>Annuler</button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 360 }}>
            <div className="heroCard" style={{ maxWidth: 700 }}>
              <p className="sectionTitle">Liste items boutique</p>
              <div style={{ marginTop: 10 }}>
                {items.length === 0 ? <div className="sectionHint">Aucun item</div> : null}
                {items.map((it) => (
                  <div key={it.id} className="cardItem" style={{ marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong>#{it.id} - {it.name}</strong>
                        <span className="sectionHint">{it.kind} • {it.price}€</span>
                      </div>
                      <div className="sectionHint">Disponible : {it.available ? 'oui' : 'non'}</div>
                      <div className="sectionHint" style={{ maxHeight: 42, overflow: 'hidden' }}>{it.description}</div>
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 8 }}>
                      <button className="btn" onClick={() => startEditItem(it)}>Modifier</button>
                      <button className="btn" onClick={() => deleteItem(it.id)}>Supprimer</button>
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

