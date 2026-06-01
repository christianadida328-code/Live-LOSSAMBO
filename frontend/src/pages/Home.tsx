import React, { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Link } from 'react-router-dom'
import NavBar from '../shared/NavBar'

type EventItem = {
  id: number
  title: string
  description?: string
  start_at: string
  cover_url?: string
  venue?: string
}

type GalleryItem = {
  id: number
  title: string
  description?: string
  media_url?: string
  media_type?: string
}

export default function Home(){
  const [events,setEvents]=useState<EventItem[]>([])
  const [gallery,setGallery]=useState<GalleryItem[]>([])

  useEffect(()=>{
    api<{events:EventItem[]}>('/api/events/upcoming')
      .then(r=>setEvents(r.events))
      .catch(()=>{})
    api<{items:GalleryItem[]}>('/api/gallery/items')
      .then(r=>setGallery(r.items))
      .catch(()=>{})
  },[])

  return (
    <div>
      <NavBar />
      <div className="hero">
        <div className="container">
          <img className="homeBigLogo" src="/images/logo.png" alt="Logo Live LOSSAMBO" />
          <img className="homePreviewImage" src="/images/Preview.png" alt="Aperçu Live LOSSAMBO" />
          <div className="heroTop">
            <div className="heroCard">
              <h1 className="heroTitle">Live LOSSAMBO</h1>
              <p className="heroLead">
                Une plateforme moderne pour réunir musiciens religieux, chorales, chantres et centres.
                Découvrez les événements live et promouvez votre art.
              </p>
              <div className="actions">
                <Link className="btn btnPrimary" to="/events">Voir les événements</Link>
                <Link className="btn btnGhost" to="/production">Services de production</Link>
                <Link className="btn btnGhost" to="/shop">Boutique</Link>
              </div>
            </div>
          </div>

          <div className="section">
            <div className="sectionHeader">
              <div>
                <p className="sectionTitle">Événements à venir</p>
                <p className="sectionHint">S’inscrire en quelques clics</p>
              </div>
            </div>
            <div className="grid">
              {events.slice(0,6).map(e=> (
                <div className="card" key={e.id}>
                  <div className="cardMedia">
                    {e.cover_url ? <img src={e.cover_url} alt={e.title}/> : null}
                  </div>
                  <div className="cardBody">
                    <p className="cardTitle">{e.title}</p>
                    <p className="cardText">{(e.description || '').slice(0,90)}{(e.description||'').length>90?'…':''}</p>
                    <div className="row">
                      <span className="sectionHint">{new Date(e.start_at).toLocaleString()}</span>
                      <Link className="btn" to={`/events#event-${e.id}`}>Détails</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <div className="sectionHeader">
              <p className="sectionTitle">Galerie multimédia</p>
              <p className="sectionHint">Photos et moments live</p>
            </div>
            <div className="grid">
              {gallery.map(item=> (
                <div className="card" key={item.id}>
                  <div className="cardMedia">
                    {item.media_url ? <img src={item.media_url} alt={item.title}/> : null}
                  </div>
                  <div className="cardBody">
                    <p className="cardTitle">{item.title}</p>
                    <p className="cardText">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <div className="footer">
        <div className="container">© {new Date().getFullYear()} Live LOSSAMBO — Plateforme pour événements live.</div>
      </div>
    </div>
  )
}

