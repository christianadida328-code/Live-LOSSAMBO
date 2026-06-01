import React, { useEffect, useState } from 'react'
import NavBar from '../shared/NavBar'
import { api } from '../api/client'

type Item = { id:number; name:string; description?:string; price:string; image_url?:string; kind:string }

export default function Shop(){
  const [items,setItems]=useState<Item[]>([])
  const [selectedItemId,setSelectedItemId]=useState<number | null>(null)
  const [name,setName]=useState('')
  const [whatsapp,setWhatsapp]=useState('')
  const [quantity,setQuantity]=useState('1')
  const [message,setMessage]=useState('')
  const [msg,setMsg]=useState('')
  const [err,setErr]=useState('')

  useEffect(()=>{
    api<{items:Item[]}>('/api/shop/items')
      .then(r=>setItems(r.items))
      .catch(()=>{})
  },[])

  const buyItem = async (itemId:number) => {
    setMsg('')
    setErr('')
    if(!name.trim() || !whatsapp.trim()){
      setErr('Nom et WhatsApp requis.')
      return
    }
    try{
      await api(`/api/shop/items/${itemId}/orders`, {
        method: 'POST',
        body: JSON.stringify({ name, whatsapp, quantity: Number(quantity) || 1, message }),
      })
      setMsg('Commande envoyée. L’admin vous répondra sur WhatsApp.')
      setSelectedItemId(null)
      setName('')
      setWhatsapp('')
      setQuantity('1')
      setMessage('')
    }catch(e:any){
      setErr(e?.message || 'Erreur')
    }
  }

  return (
    <div>
      <NavBar />
      <div className="container section">
        <div className="sectionHeader">
          <div>
            <p className="sectionTitle">Boutique</p>
            <p className="sectionHint">Billets et produits dérivés</p>
          </div>
        </div>

        {msg ? <div className="toast" style={{ marginBottom: 12 }}>{msg}</div> : null}
        {err ? <div className="err" style={{ marginBottom: 12 }}>{err}</div> : null}

        <div className="grid">
          {items.map(it=> (
            <div className="card" key={it.id}>
              <div className="cardMedia">
                {it.image_url ? <img src={it.image_url} alt={it.name}/> : null}
              </div>
              <div className="cardBody">
                <p className="cardTitle">{it.name}</p>
                <p className="cardText">{it.description}</p>
                <p className="sectionHint">Prix: {it.price}</p>
                <div style={{ height: 10 }} />
                <button className="btn btnPrimary" onClick={()=>setSelectedItemId(selectedItemId===it.id ? null : it.id)}>Acheter</button>
                {selectedItemId===it.id ? (
                  <div className="form" style={{ marginTop: 10 }}>
                    <input className="input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Votre nom" />
                    <input className="input" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} placeholder="Numéro WhatsApp" />
                    <input className="input" value={quantity} onChange={(e)=>setQuantity(e.target.value)} placeholder="Quantité" type="number" min="1" />
                    <textarea className="input" value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="Message (optionnel)" rows={3} />
                    <button className="btn btnPrimary" onClick={()=>buyItem(it.id)}>Envoyer la commande</button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

