import React, { useEffect, useState } from 'react'
import NavBar from '../shared/NavBar'
import { api } from '../api/client'

type Service = { id:number; name:string; description?:string; price_hint?:string; media_url?:string }

export default function Production(){
  const [services,setServices]=useState<Service[]>([])
  const [selectedServiceId,setSelectedServiceId]=useState<number | null>(null)
  const [name,setName]=useState('')
  const [whatsapp,setWhatsapp]=useState('')
  const [message,setMessage]=useState('')
  const [msg,setMsg]=useState('')
  const [err,setErr]=useState('')

  useEffect(()=>{
    api<{services:Service[]}>('/api/production/services')
      .then(r=>setServices(r.services))
      .catch(()=>{})
  },[])

  const sendRequest = async (serviceId:number) => {
    setMsg('')
    setErr('')
    if(!name.trim() || !whatsapp.trim()){
      setErr('Nom et WhatsApp requis.')
      return
    }
    try{
      await api(`/api/production/services/${serviceId}/requests`, {
        method: 'POST',
        body: JSON.stringify({ name, whatsapp, message }),
      })
      setMsg('Demande envoyée. L’admin vous répondra sur WhatsApp.')
      setSelectedServiceId(null)
      setName('')
      setWhatsapp('')
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
            <p className="sectionTitle">Production</p>
            <p className="sectionHint">Services: vidéos, audio, affiches, flyers</p>
          </div>
        </div>

        {msg ? <div className="toast" style={{ marginBottom: 12 }}>{msg}</div> : null}
        {err ? <div className="err" style={{ marginBottom: 12 }}>{err}</div> : null}

        <div className="grid">
          {services.map(s=> (
            <div className="card" key={s.id}>
              <div className="cardMedia">
                {s.media_url ? <img src={s.media_url} alt={s.name}/> : null}
              </div>
              <div className="cardBody">
                <p className="cardTitle">{s.name}</p>
                <p className="cardText">{s.description}</p>
                {s.price_hint ? <p className="sectionHint">{s.price_hint}</p> : null}
                <div style={{ height: 10 }} />
                <button className="btn btnPrimary" onClick={()=>setSelectedServiceId(selectedServiceId===s.id ? null : s.id)}>Faire une demande</button>
                {selectedServiceId===s.id ? (
                  <div className="form" style={{ marginTop: 10 }}>
                    <input className="input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Votre nom" />
                    <input className="input" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} placeholder="Numéro WhatsApp" />
                    <textarea className="input" value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="Décrivez votre besoin" rows={3} />
                    <button className="btn btnPrimary" onClick={()=>sendRequest(s.id)}>Envoyer</button>
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

