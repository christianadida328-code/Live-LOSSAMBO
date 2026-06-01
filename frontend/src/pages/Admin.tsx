import React from 'react'
import NavBar from '../shared/NavBar'
import { useNavigate } from 'react-router-dom'

export default function Admin() {
  const navigate = useNavigate()

  return (
    <div>
      <NavBar />
      <div className="container section">
        <div className="sectionHeader">
          <div>
            <p className="sectionTitle">Admin</p>
            <p className="sectionHint">Choisissez une catégorie</p>
          </div>
        </div>

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="heroCard" style={{ maxWidth: 900, marginRight: 16, flex: 1 }}>
            <p className="sectionTitle">Gestion</p>
            <p className="sectionHint">Accueil, événements, galerie, services production, boutique, demandes, notifications, membres</p>

            <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="btn btnPrimary" onClick={() => navigate('/admin/events')}>
                Événements à venir
              </button>
              <button className="btn btnPrimary" onClick={() => navigate('/admin/gallery')}>
                Galerie multimédia
              </button>
              <button className="btn btnPrimary" onClick={() => navigate('/admin/services')}>
                Services production
              </button>
              <button className="btn btnPrimary" onClick={() => navigate('/admin/shop/items')}>
                Boutique - Items
              </button>
              <button className="btn btnPrimary" onClick={() => navigate('/admin/requests')}>
                Demandes visiteurs
              </button>
              <button className="btn btnPrimary" onClick={() => navigate('/admin/notifications')}>
                Notifications
              </button>
              <button className="btn btnPrimary" onClick={() => navigate('/admin/members')}>
                Membres
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



