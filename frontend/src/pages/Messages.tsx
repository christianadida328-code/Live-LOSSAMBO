import React, { useEffect, useState } from 'react'
import NavBar from '../shared/NavBar'
import { api, uploadFile } from '../api/client'

type Member = { id:number; display_name:string; profile_image_url?:string; ministry_role?:string }
type Contact = { id:number; status:string; direction:'sent'|'received'; member:Member }
type ChatMessage = { id:number; sender_id:number; content?:string; media_url?:string; message_type:string; created_at?:string }

export default function Messages(){
  const [me,setMe]=useState<any>(null)
  const [contacts,setContacts]=useState<Contact[]>([])
  const [query,setQuery]=useState('')
  const [results,setResults]=useState<Member[]>([])
  const [selected,setSelected]=useState<Member | null>(null)
  const [messages,setMessages]=useState<ChatMessage[]>([])
  const [text,setText]=useState('')
  const [msg,setMsg]=useState('')
  const [err,setErr]=useState('')

  const refreshContacts = async()=>{
    const r = await api<{contacts:Contact[]}>('/api/members/contacts')
    setContacts(r.contacts)
  }

  const refreshMessages = async(member:Member)=>{
    const r = await api<{messages:ChatMessage[]}>('/api/members/messages/'+member.id)
    setMessages(r.messages)
  }

  useEffect(()=>{
    api<any>('/api/members/me').then(r=>setMe(r.user)).catch(()=>{})
    refreshContacts().catch(()=>{})
    api<{members:Member[]}>('/api/members/search?q=').then(r=>setResults(r.members)).catch(()=>{})
  },[])

  useEffect(()=>{
    const timer = window.setTimeout(()=>{
      api<{members:Member[]}>('/api/members/search?q='+encodeURIComponent(query))
        .then(r=>setResults(r.members))
        .catch(()=>{})
    },250)
    return ()=>window.clearTimeout(timer)
  },[query])

  const openChat = async(member:Member)=>{
    setSelected(member)
    setErr('')
    await refreshMessages(member)
  }

  const sendText = async()=>{
    if(!selected || !text.trim()) return
    setErr(''); setMsg('')
    try{
      await api('/api/members/messages/'+selected.id,{method:'POST', body:JSON.stringify({content:text, message_type:'text'})})
      setText('')
      await refreshMessages(selected)
      await refreshContacts()
    }catch(e:any){ setErr(e?.message || 'Erreur') }
  }

  const sendMedia = async(file: File | undefined)=>{
    if(!selected || !file) return
    setErr(''); setMsg('')
    try{
      const uploaded = await uploadFile('/api/members/messages/upload', file)
      await api('/api/members/messages/'+selected.id,{method:'POST', body:JSON.stringify({media_url:uploaded.url, message_type:uploaded.message_type})})
      await refreshMessages(selected)
      await refreshContacts()
    }catch(e:any){ setErr(e?.message || 'Erreur upload') }
  }

  const requestContact = async(member:Member)=>{
    setErr(''); setMsg('')
    try{
      await api('/api/members/contacts/'+member.id+'/request',{method:'POST'})
      setMsg('Demande envoyée.')
      await refreshContacts()
    }catch(e:any){ setErr(e?.message || 'Erreur') }
  }

  const updateContact = async(contact:Contact, status:string)=>{
    await api('/api/members/contacts/'+contact.id,{method:'PUT', body:JSON.stringify({status})})
    await refreshContacts()
  }

  const blockMember = async(member:Member)=>{
    if(!confirm(`Bloquer ${member.display_name} ?`)) return
    await api('/api/members/block/'+member.id,{method:'POST'})
    setSelected(null)
    setMessages([])
    await refreshContacts()
  }

  const selectedContact = selected ? contacts.find(c=>c.member.id===selected.id) : null

  return (
    <div>
      <NavBar />
      <div className="container section">
        <div className="sectionHeader">
          <div>
            <p className="sectionTitle">Messages</p>
            <p className="sectionHint">Rechercher, envoyer une demande et discuter entre membres</p>
          </div>
        </div>
        {msg ? <div className="toast" style={{marginBottom:12}}>{msg}</div> : null}
        {err ? <div className="err" style={{marginBottom:12}}>{err}</div> : null}

        <div className="row" style={{alignItems:'flex-start'}}>
          <div className="heroCard" style={{maxWidth:360, flex:1}}>
            <p className="sectionTitle">Rechercher les amis</p>
            <p className="sectionHint">Tous les membres inscrits sont listés ici.</p>
            <input className="input" style={{marginTop:10}} value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Chercher par nom" />
            <div style={{marginTop:12}}>
              {results.map(member=>(
                <div className="cardItem" key={member.id} style={{marginBottom:8}}>
                  <div className="memberLine">
                    <img className="avatar" src={member.profile_image_url || '/images/logo.png'} alt={member.display_name} />
                    <div>
                      <strong>{member.display_name}</strong>
                      {member.ministry_role ? <div className="sectionHint">{member.ministry_role}</div> : null}
                    </div>
                  </div>
                  <div className="row" style={{gap:8, marginTop:8}}>
                    <button className="btn" onClick={()=>openChat(member)}>Chat</button>
                    <button className="btn btnPrimary" onClick={()=>requestContact(member)}>Demande</button>
                  </div>
                </div>
              ))}
            </div>

            <p className="sectionTitle" style={{marginTop:18}}>Contacts</p>
            <div style={{marginTop:10}}>
              {contacts.length===0 ? <div className="sectionHint">Aucun contact</div> : null}
              {contacts.map(contact=>(
                <div className="cardItem" key={contact.id} style={{marginBottom:8}}>
                  <div className="memberLine">
                    <img className="avatar" src={contact.member.profile_image_url || '/images/logo.png'} alt={contact.member.display_name} />
                    <div>
                      <strong>{contact.member.display_name}</strong>
                      {contact.member.ministry_role ? <div className="sectionHint">{contact.member.ministry_role}</div> : null}
                      <div className="sectionHint">{contact.status} • {contact.direction==='sent'?'envoyée':'reçue'}</div>
                    </div>
                  </div>
                  <div className="row" style={{gap:8, marginTop:8}}>
                    <button className="btn" onClick={()=>openChat(contact.member)}>Ouvrir</button>
                    {contact.status==='pending' && contact.direction==='received' ? <button className="btn btnPrimary" onClick={()=>updateContact(contact,'accepted')}>Accepter</button> : null}
                    {contact.status==='pending' ? <button className="btn" onClick={()=>updateContact(contact,'deleted')}>Supprimer</button> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="heroCard" style={{flex:2, minHeight:520}}>
            {selected ? (
              <>
                <div className="row" style={{justifyContent:'space-between'}}>
                  <div className="memberLine">
                    <img className="avatar" src={selected.profile_image_url || '/images/logo.png'} alt={selected.display_name} />
                    <div>
                      <p className="sectionTitle">{selected.display_name}</p>
                      {selected.ministry_role ? <p className="sectionHint">{selected.ministry_role}</p> : null}
                      <p className="sectionHint">{selectedContact?.status === 'accepted' ? 'Contact accepté' : '2 messages maximum avant acceptation'}</p>
                    </div>
                  </div>
                  <button className="btn" onClick={()=>blockMember(selected)}>Bloquer</button>
                </div>

                <div className="chatBox">
                  {messages.map(m=>(
                    <div key={m.id} className={`chatBubble ${m.sender_id===me?.id?'chatMine':''}`}>
                      {m.message_type==='image' && m.media_url ? <img src={m.media_url} alt="Image envoyée" /> : null}
                      {m.message_type==='audio' && m.media_url ? <audio controls src={m.media_url} /> : null}
                      {m.content ? <div>{m.content}</div> : null}
                    </div>
                  ))}
                </div>

                <div className="form" style={{maxWidth:'none'}}>
                  <textarea className="input" value={text} onChange={(e)=>setText(e.target.value)} placeholder="Votre message" rows={3} />
                  <div className="row" style={{gap:8}}>
                    <button className="btn btnPrimary" onClick={sendText}>Envoyer</button>
                    <label className="btn">Image<input hidden type="file" accept="image/*" onChange={(e)=>sendMedia(e.target.files?.[0])} /></label>
                    <label className="btn">Vocal<input hidden type="file" accept="audio/*" onChange={(e)=>sendMedia(e.target.files?.[0])} /></label>
                  </div>
                </div>
              </>
            ) : (
              <div className="sectionHint">Sélectionnez un membre ou recherchez une personne.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
