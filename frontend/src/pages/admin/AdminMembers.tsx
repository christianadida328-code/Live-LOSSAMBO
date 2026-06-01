import React, { useEffect, useState } from 'react'
import NavBar from '../../shared/NavBar'
import { api } from '../../api/client'

type AdminMember = {
  id: number
  email: string
  role: string
  is_blocked: boolean
  display_name: string | null
  profile_image_url: string | null
  ministry_role: string | null
  bio: string | null
  location: string | null
  created_at: string | null
}

export default function AdminMembers() {
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [members, setMembers] = useState<AdminMember[]>([])

  const refresh = async () => {
    try {
      const m = await api<{ members: AdminMember[] }>('/api/admin/members', { method: 'GET' })
      setMembers(m.members)
    } catch (e: any) {
      setErr(e?.message || 'Erreur')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <NavBar />
      <div className="container section">
        <div className="sectionHeader">
          <div>
            <p className="sectionTitle">Admin - Membres</p>
            <p className="sectionHint">Bloquer / Débloquer / Supprimer</p>
          </div>
        </div>

        {msg ? <div className="toast" style={{ marginBottom: 12 }}>{msg}</div> : null}
        {err ? <div className="err" style={{ marginBottom: 12 }}>{err}</div> : null}

        <div className="heroCard" style={{ maxWidth: 1000 }}>
          <p className="sectionTitle">Liste des comptes</p>
          <p className="sectionHint">Les comptes admin/membres sont listés (rôle inclus).</p>

          <div style={{ marginTop: 10 }}>
            {members.length === 0 ? <div className="sectionHint">Aucun membre</div> : null}
            {members.map((u) => (
              <div key={u.id} className="cardItem" style={{ marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div className="memberLine">
                      <img className="avatar" src={u.profile_image_url || '/images/logo.png'} alt={u.display_name || u.email} />
                      <strong>#{u.id} - {u.display_name || u.email}</strong>
                    </div>
                    <span className="sectionHint">{u.is_blocked ? 'bloqué' : 'actif'}</span>
                  </div>
                  <div className="sectionHint">{u.email}</div>
                  {u.ministry_role ? <div className="sectionHint">{u.ministry_role}</div> : null}
                  <div className="sectionHint" style={{ maxHeight: 42, overflow: 'hidden' }}>{u.bio || ''}</div>
                  {u.location ? <div className="sectionHint">{u.location}</div> : null}
                </div>
                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <button
                    className="btn"
                    onClick={async () => {
                      try {
                        await api('/api/admin/members/' + u.id + '/block', {
                          method: 'PUT',
                          body: JSON.stringify({ is_blocked: !u.is_blocked }),
                        })
                        setMsg('Compte mis à jour.')
                        await refresh()
                      } catch (e: any) {
                        setErr(e?.message || 'Erreur')
                      }
                    }}
                  >
                    {u.is_blocked ? 'Débloquer' : 'Bloquer'}
                  </button>

                  <button
                    className="btn"
                    onClick={async () => {
                      if (!confirm(`Supprimer le compte membre #${u.id} ?`)) return
                      try {
                        await api('/api/admin/members/' + u.id, { method: 'DELETE' })
                        setMsg('Compte supprimé.')
                        await refresh()
                      } catch (e: any) {
                        setErr(e?.message || 'Erreur')
                      }
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

