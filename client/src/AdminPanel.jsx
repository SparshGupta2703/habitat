import { useCallback, useEffect, useState } from 'react'
import { request } from './api.js'

export default function AdminPanel({ token }) {
  const [data, setData] = useState({ users: [], page: 1, pages: 1, total: 0 })
  const [provider, setProvider] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetailsBusy, setUserDetailsBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const [users, status] = await Promise.all([
        request(`/admin/users?page=${page}&limit=20&search=${encodeURIComponent(query)}`, token),
        request('/admin/settings/ai-provider', token),
      ])
      setData(users); setProvider(status)
    } catch (cause) { setError(cause.message) } finally { setBusy(false) }
  }, [token, page, query])
  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const saveProvider = async (nextProvider) => {
    setSaving(true); setNotice(''); setError('')
    try { const status = await request('/admin/settings/ai-provider', token, { method: 'PATCH', body: JSON.stringify({ provider: nextProvider }) }); setProvider(status); setNotice(`Nutrition analysis now uses ${nextProvider === 'gemini' ? 'Gemini' : 'Groq'}.`) }
    catch (cause) { setError(cause.message); await load() } finally { setSaving(false) }
  }

  const inspectUser = async (userId) => {
    setUserDetailsBusy(true); setSelectedUser(null); setError('')
    try { const result = await request(`/admin/users/${encodeURIComponent(userId)}`, token); setSelectedUser(result) }
    catch (cause) { setError(cause.message) } finally { setUserDetailsBusy(false) }
  }

  return <div className="screen-scroll admin-screen">
    <header className="admin-intro"><p className="micro-label">HABITAT ADMINISTRATION</p><h2>Admin space</h2><p>Manage user access and the nutrition provider.</p></header>
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
    <section className="glass-panel admin-provider-panel"><header><div><p className="micro-label">AI PROVIDER</p><h3>Nutrition analysis</h3></div><span className="provider-active">Active · {provider?.active || '…'}</span></header>
      <p className="admin-help">Changes apply to new analysis requests. Existing nutrition records are unchanged.</p>
      <div className="provider-options">{[['gemini', 'Gemini'], ['groq', 'Groq']].map(([id, label]) => { const status = provider?.providers?.[id]; return <label className="provider-option" key={id}><span><strong>{label}</strong><small>{status?.model || 'Loading model…'} · {status?.configured ? 'Key configured' : 'Server key missing'}</small></span><input type="radio" name="ai-provider" value={id} checked={provider?.active === id} disabled={saving || !status?.configured} onChange={() => saveProvider(id)}/></label> })}</div>
    </section>
    <section className="glass-panel admin-users-panel"><header className="admin-users-heading"><div><p className="micro-label">USER MANAGEMENT</p><h3>{data.total} accounts</h3></div><form onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search.trim()) }}><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" aria-label="Search users"/><button className="glass-button">Search</button></form></header>
      {busy ? <p className="admin-help">Loading users…</p> : data.users.length ? <div className="admin-user-list">{data.users.map((user) => <article className="admin-user-row" key={user._id}><div><strong>{user.name || '—'}</strong><small>{user.email}</small></div><span className="admin-user-role">{user.role || 'user'}</span><time dateTime={user.createdAt}>{new Date(user.createdAt).toLocaleDateString()}</time><button className="text-action" onClick={() => inspectUser(user._id)}>Details</button></article>)}</div> : <p className="admin-help">No users match this search.</p>}
      {userDetailsBusy && <p className="admin-help">Loading account details…</p>}{selectedUser && <aside className="admin-user-details"><header><strong>Account details</strong><button className="text-action" onClick={() => setSelectedUser(null)}>Close</button></header><dl><div><dt>Name</dt><dd>{selectedUser.name || '—'}</dd></div><div><dt>Email</dt><dd>{selectedUser.email}</dd></div><div><dt>Role</dt><dd>{selectedUser.role || 'user'}</dd></div><div><dt>Created</dt><dd>{new Date(selectedUser.createdAt).toLocaleString()}</dd></div></dl></aside>}
      <footer className="admin-pagination"><span>Page {data.page || page} of {Math.max(1, data.pages || 1)}</span><div><button className="glass-button" disabled={page <= 1 || busy} onClick={() => setPage((current) => current - 1)}>Previous</button><button className="glass-button" disabled={page >= (data.pages || 1) || busy} onClick={() => setPage((current) => current + 1)}>Next</button></div></footer>
    </section>
  </div>
}
