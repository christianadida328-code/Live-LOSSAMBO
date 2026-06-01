import React, { useEffect, useState } from 'react'
import NavBar from '../shared/NavBar'
import { api, uploadFile } from '../api/client'

export default function Members(){
  const [profile,setProfile]=useState<any>(null)
  const [regs,setRegs]=useState<any[]>([])
  const [notifications,setNotifications]=useState<any[]>([])
  const [editName,setEditName]=useState('')
  const [editRole,setEditRole]=useState('')
  const [editImage,setEditImage]=useState('')
  const [msg,setMsg]=useState('')
  const [err,setErr]=useState('')

  const refreshProfile = async () => {
    const r = await api<any>('/api/members/me')
    setProfile(r.user)
    setEditName(r.user?.profile?.display_name || '')
    setEditRole(r.user?.profile?.ministry_role || '')
    setEditImage(r.user?.profile?.profile_image_url || '')
  }

  useEffect(()=>{
    refreshProfile().catch(()=>{})
    api<any>('/api/members/my-registrations').then(r=>setRegs(r.registrations)).catch(()=>{})
    api<any>('/api/members/notifications').then(r=>setNotifications(r.notifications)).catch(()=>{})
  },[])

  const uploadProfileImage = async (file: File | undefined) => {
    if(!file) return
    setErr(''); setMsg('')
    try{
      const uploaded = await uploadFile('/api/auth/profile-image', file)
      setEditImage(uploaded.url)
      setMsg('Nouvelle photo prête. Enregistrez le profil.')
    }catch(e:any){ setErr(e?.message || 'Erreur upload') }
  }

  const saveProfile = async () => {
    setErr(''); setMsg('')
    try{
      await api('/api/members/me',{method:'PUT', body:JSON.stringify({display_name:editName, ministry_role:editRole, profile_image_url:editImage})})
      setMsg('Profil mis à jour.')
      await refreshProfile()
    }catch(e:any){ setErr(e?.message || 'Erreur') }
  }

  const blockOwnAccount = async () => {
    if(!confirm('Bloquer votre compte ? Vous ne pourrez plus vous connecter.')) return
    await api('/api/members/me/block',{method:'PUT'})
    localStorage.clear()
    location.href = '/'
  }

  const deleteOwnAccount = async () => {
    if(!confirm('Supprimer définitivement votre compte ? Cette action est irréversible.')) return
    await api('/api/members/me',{method:'DELETE'})
    localStorage.clear()
    location.href = '/'
  }

  return (
    <div>
      <NavBar />
      <div className="container section">
        <div className="sectionHeader">
          <div>
            <p className="sectionTitle">Espace membres</p>
            <p className="sectionHint">Profil, inscriptions et contenus exclusifs</p>
          </div>
        </div>
        {msg ? <div className="toast" style={{ marginBottom: 12 }}>{msg}</div> : null}
        {err ? <div className="err" style={{ marginBottom: 12 }}>{err}</div> : null}

        <div className="grid">
          <div className="card" style={{gridColumn:'span 1'}}>
            <div className="cardBody">
              <p className="cardTitle">Profil</p>
              {profile?.profile?.profile_image_url ? <img className="profilePreview" src={profile.profile.profile_image_url} alt="Profil" /> : null}
              <p className="cardText">Nom: <b>{profile?.profile?.display_name || '-'}</b></p>
              <p className="cardText">Rôle: <b>{profile?.profile?.ministry_role || '-'}</b></p>
              <p className="cardText">Amis: <b>{profile?.friends_count ?? 0}</b></p>
              <p className="cardText">Email: <b>{profile?.email || '-'}</b></p>
              <p className="cardText">Localisation: <b>{profile?.profile?.location || '-'}</b></p>
              <p className="cardText" style={{whiteSpace:'pre-wrap'}}>{profile?.profile?.bio || '—'}</p>
            </div>
          </div>

          <div className="card" style={{gridColumn:'span 2'}}>
            <div className="cardBody">
              <p className="cardTitle">Mes inscriptions</p>
              <div style={{height:10}} />
              {regs.length===0 ? (
                <p className="cardText">Aucune inscription pour le moment.</p>
              ) : (
                <div className="grid" style={{gridTemplateColumns:'repeat(2, 1fr)'}}>
                  {regs.slice(0,6).map(r=> (
                    <div className="card" key={r.id}>
                      <div className="cardBody">
                        <p className="cardTitle">{r.event.title}</p>
                        <p className="cardText">{new Date(r.event.start_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="section">
          <div className="sectionHeader">
            <p className="sectionTitle">Paramètres du profil</p>
            <p className="sectionHint">Photo, nom, rôle et compte</p>
          </div>
          <div className="heroCard" style={{ maxWidth: 720 }}>
            <div className="form" style={{ maxWidth: 'none' }}>
              <input className="input" value={editName} onChange={(e)=>setEditName(e.target.value)} placeholder="Nom d’affichage" />
              <input className="input" value={editRole} onChange={(e)=>setEditRole(e.target.value)} placeholder="Rôle/ministère" />
              <input className="input" type="file" accept="image/*" onChange={(e)=>uploadProfileImage(e.target.files?.[0])} />
              {editImage ? <img className="profilePreview" src={editImage} alt="Aperçu profil" /> : null}
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btnPrimary" onClick={saveProfile}>Enregistrer</button>
                <button className="btn" onClick={blockOwnAccount}>Bloquer mon compte</button>
                <button className="btn" onClick={deleteOwnAccount}>Supprimer définitivement</button>
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="sectionHeader">
            <p className="sectionTitle">Notifications</p>
            <p className="sectionHint">Messages envoyés par l’administration</p>
          </div>
          <div className="grid">
            {notifications.length===0 ? (
              <div className="card">
                <div className="cardBody">
                  <p className="cardText">Aucune notification pour le moment.</p>
                </div>
              </div>
            ) : notifications.map((n)=> (
              <div className="card" key={n.id}>
                <div className="cardBody">
                  <p className="cardTitle">{n.title}</p>
                  {n.created_at ? <p className="sectionHint">{new Date(n.created_at).toLocaleString()}</p> : null}
                  <p className="cardText" style={{whiteSpace:'pre-wrap'}}>{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="sectionHeader">
            <p className="sectionTitle">Contenus exclusifs</p>
            <p className="sectionHint">(démo - à brancher plus tard)</p>
          </div>
          <div className="grid">
            {Array.from({length:3}).map((_,i)=> (
              <div className="card" key={i}>
                <div className="cardMedia" />
                <div className="cardBody">
                  <p className="cardTitle">Vidéo privée</p>
                  <p className="cardText">Accès réservé aux membres.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="footer"><div className="container">Les contenus exclusifs peuvent être ajoutés via API.</div></div>
    </div>
  )
}

