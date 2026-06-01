import React, { useEffect, useState } from 'react'
import { api } from '../api/client'
import NavBar from '../shared/NavBar'

type EventItem = {
  id: number
  title: string
  description?: string
  start_at: string
  cover_url?: string
  venue?: string
}

export default function Events(){
  const [events,setEvents]=useState<EventItem[]>([])
  const [msg,setMsg]=useState<string>('')
  const [err,setErr]=useState<string>('')
  const [requestEventId,setRequestEventId]=useState<number | null>(null)
  const [visitorName,setVisitorName]=useState('')
  const [visitorWhatsapp,setVisitorWhatsapp]=useState('')
  const [visitorMessage,setVisitorMessage]=useState('')

  useEffect(()=>{
    api<{events:EventItem[]}>('/api/events/calendar')
      .then(r=>setEvents(r.events))
      .catch(e=>setErr(String(e.message||e)))
  },[])

  const register = async (id:number)=>{
    setErr(''); setMsg('')
    try{
      await api(`/api/events/${id}/register`,{method:'POST'})
      setMsg('Inscription effectuée.')
    }catch(e:any){
      setErr(e?.message || 'Erreur')
    }
  }

  const sendVisitorRequest = async (id:number)=>{
    setErr(''); setMsg('')
    if(!visitorName.trim() || !visitorWhatsapp.trim()){
      setErr('Nom et WhatsApp requis.')
      return
    }
    try{
      await api(`/api/events/${id}/requests`,{
        method:'POST',
        body:JSON.stringify({name:visitorName, whatsapp:visitorWhatsapp, message:visitorMessage})
      })
      setMsg('Demande envoyée. L’admin vous répondra sur WhatsApp.')
      setRequestEventId(null)
      setVisitorName('')
      setVisitorWhatsapp('')
      setVisitorMessage('')
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
            <p className="sectionTitle">Calendrier des événements</p>
            <p className="sectionHint">Choisis un concert ou une session live</p>
          </div>
        </div>

        {msg ? <div className="toast">{msg}</div> : null}
        {err ? <div className="err">{err}</div> : null}

        <div className="grid" style={{marginTop:14}}>
          {events.map(e=> (
            <div className="card" key={e.id} id={`event-${e.id}`}>
              <div className="cardMedia">
                {e.cover_url ? <img src={e.cover_url} alt={e.title}/> : null}
              </div>
              <div className="cardBody">
                <p className="cardTitle">{e.title}</p>
                <p className="cardText">{(e.description || '').slice(0,120)}{(e.description||'').length>120?'…':''}</p>
                <div className="row" style={{justifyContent:'space-between'}}>
                  <span className="sectionHint">{new Date(e.start_at).toLocaleString()} • {e.venue||'Lieu'}</span>
                </div>
                <div style={{height:10}} />
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btnPrimary" onClick={()=>setRequestEventId(requestEventId===e.id ? null : e.id)}>S’inscrire</button>
                  <button className="btn" onClick={()=>register(e.id)}>Compte membre</button>
                </div>
                {requestEventId===e.id ? (
                  <div className="form" style={{ marginTop: 10 }}>
                    <input className="input" value={visitorName} onChange={(ev)=>setVisitorName(ev.target.value)} placeholder="Votre nom" />
                    <input className="input" value={visitorWhatsapp} onChange={(ev)=>setVisitorWhatsapp(ev.target.value)} placeholder="Numéro WhatsApp" />
                    <textarea className="input" value={visitorMessage} onChange={(ev)=>setVisitorMessage(ev.target.value)} placeholder="Message (optionnel)" rows={3} />
                    <button className="btn btnPrimary" onClick={()=>sendVisitorRequest(e.id)}>Envoyer la demande</button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="footer"><div className="container">Les visiteurs peuvent envoyer une demande, et les membres peuvent s’inscrire avec leur compte.</div></div>
    </div>
  )
}

