import { useEffect, useState } from 'react'

export function useAuth(){
  const [token,setToken]=useState<string | null>(localStorage.getItem('token'))
  const [role,setRole]=useState<string | null>(localStorage.getItem('role'))

  useEffect(()=>{
    const onStorage=()=>{
      setToken(localStorage.getItem('token'))
      setRole(localStorage.getItem('role'))
    }
    window.addEventListener('storage',onStorage)
    return ()=>window.removeEventListener('storage',onStorage)
  },[])

  const logout=()=>{
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setToken(null)
    setRole(null)
  }

  return { token, role, logout }
}

