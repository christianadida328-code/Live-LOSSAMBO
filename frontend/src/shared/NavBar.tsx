import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export default function NavBar(){
  const { token, role, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const closeMenu = () => setOpen(false)

  return (
    <div className="nav">
      <div className="container">
        <div className="navInner">
          <Link className="brand" to="/" onClick={closeMenu}>
            <img className="brandLogo" src="/images/logo.png" alt="Logo Live LOSSAMBO" />
            <span className="brandName">Live LOSSAMBO</span>
          </Link>
          <button
            className="menuButton"
            type="button"
            aria-label="Ouvrir le menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className={`navLinks ${open ? 'navLinksOpen' : ''}`}>
            <Link to="/" onClick={closeMenu}>Accueil</Link>
            <Link to="/events" onClick={closeMenu}>Événements</Link>
            <Link to="/production" onClick={closeMenu}>Production</Link>
            <Link to="/shop" onClick={closeMenu}>Boutique</Link>
            {token ? (
              <>
                <Link to="/members" onClick={closeMenu}>Membres</Link>
                <Link to="/messages" onClick={closeMenu}>Messages</Link>
                {role==='admin' ? <Link to="/admin" onClick={closeMenu}>Admin</Link> : null}
                <button className="btn" onClick={()=>{logout(); closeMenu(); nav('/')}}>Déconnexion</button>
              </>
            ) : (
              <Link to="/auth" onClick={closeMenu}>Inscription / Connexion</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

