import React, { useState } from 'react'
import NavBar from '../shared/NavBar'
import { api, uploadFile } from '../api/client'
import { useNavigate } from 'react-router-dom'

export default function Auth(){
  const nav = useNavigate()
  const [mode,setMode]=useState<'login'|'register'>('register')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [displayName,setDisplayName]=useState('')
  const [profileImageUrl,setProfileImageUrl]=useState('')
  const [ministryRole,setMinistryRole]=useState('')
  const [msg,setMsg]=useState('')
  const [err,setErr]=useState('')

  const submit = async ()=>{
    setMsg(''); setErr('')
    try{
      if(mode==='register'){
        const r = await api<{ access_token: string; user: any }>(
          '/api/auth/register',
          {
            method: 'POST',
            body: JSON.stringify({
              email,
              password,
              display_name: displayName || undefined,
              profile_image_url: profileImageUrl,
              ministry_role: ministryRole,
            }),
          }
        )
        localStorage.setItem('token', r.access_token)
        localStorage.setItem('role', r.user?.role || 'member')
        setMsg('Compte créé.')
        nav('/members')
      } else {
        const r = await api<{access_token:string; user:any}>('/api/auth/login',{method:'POST', body: JSON.stringify({email,password})})
        localStorage.setItem('token', r.access_token)
        localStorage.setItem('role', r.user.role)
        setMsg('Connexion réussie.')
        nav('/members')
      }
    }catch(e:any){
      setErr(e?.message || 'Erreur')
    }
  }

  const uploadProfileImage = async (file: File | undefined)=>{
    if(!file) return
    setErr(''); setMsg('')
    try{
      const uploaded = await uploadFile('/api/auth/profile-image', file)
      setProfileImageUrl(uploaded.url)
      setMsg('Image de profil ajoutée.')
    }catch(e:any){
      setErr(e?.message || 'Erreur upload')
    }
  }

  return (
    <div>
      <NavBar />
      <div className="container section">
        <div className="sectionHeader">
          <div>
            <p className="sectionTitle">Inscription / Connexion</p>
            <p className="sectionHint">Rejoignez l’organisation Live LOSSAMBO</p>
          </div>
        </div>

        <div className="heroCard" style={{maxWidth:520}}>
          <div className="row" style={{marginBottom:12}}>
            <button className={`btn ${mode==='register'?'btnPrimary':''}`} onClick={()=>setMode('register')}>Inscription</button>
            <button className={`btn ${mode==='login'?'btnPrimary':''}`} onClick={()=>setMode('login')}>Connexion</button>
          </div>

          <div className="form">
            {mode==='register' ? (
              <>
                <input className="input" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} placeholder="Nom d’affichage" />
                <input className="input" value={ministryRole} onChange={(e)=>setMinistryRole(e.target.value)} placeholder="Rôle/ministère (chantre, pasteur, adorateur...)" />
                <input className="input" type="file" accept="image/*" onChange={(e)=>uploadProfileImage(e.target.files?.[0])} />
                {profileImageUrl ? <img className="profilePreview" src={profileImageUrl} alt="Aperçu profil" /> : null}
              </>
            ) : null}
            <input className="input" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" type="email" />
            <input className="input" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Mot de passe" type="password" />

            {msg ? <div className="toast">{msg}</div> : null}
            {err ? <div className="err">{err}</div> : null}

            <button className="btn btnPrimary" onClick={submit}>{mode==='register' ? 'Créer le compte' : 'Se connecter'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

