import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Events from './pages/Events'
import Members from './pages/Members'
import Messages from './pages/Messages'
import Production from './pages/Production'
import Shop from './pages/Shop'
import Auth from './pages/Auth'
import Admin from './pages/Admin'
import AdminEvents from './pages/admin/AdminEvents'
import AdminServices from './pages/admin/AdminServices'
import AdminShopItems from './pages/admin/AdminShopItems'
import AdminMembers from './pages/admin/AdminMembers'
import AdminRequests from './pages/admin/AdminRequests'
import AdminNotifications from './pages/admin/AdminNotifications'
import AdminGallery from './pages/admin/AdminGallery'
import { useAuth } from './auth/useAuth'


export default function App() {
  const { token, role } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 1200)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <>
      <div className={`siteLoader ${loading ? '' : 'siteLoaderHidden'}`} aria-hidden={!loading}>
        <div className="loaderMark">
          <img src="/images/logo.png" alt="Logo Live LOSSAMBO" />
        </div>
        <div className="loaderBar"><span /></div>
      </div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/production" element={<Production />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/members"
          element={token ? <Members /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/messages"
          element={token ? <Messages /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/admin"
          element={token && role === 'admin' ? <Admin /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/admin/events"
          element={token && role === 'admin' ? <AdminEvents /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/admin/gallery"
          element={token && role === 'admin' ? <AdminGallery /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/admin/services"
          element={token && role === 'admin' ? <AdminServices /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/admin/shop/items"
          element={token && role === 'admin' ? <AdminShopItems /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/admin/members"
          element={token && role === 'admin' ? <AdminMembers /> : <Navigate to="/auth" replace />}
        />
        <Route
        path="/admin/requests"
        element={token && role === 'admin' ? <AdminRequests /> : <Navigate to="/auth" replace />}
      />
      <Route
        path="/admin/notifications"
        element={token && role === 'admin' ? <AdminNotifications /> : <Navigate to="/auth" replace />}
      />
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </>
  )
}

