import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Battles = () => {
  const navigate = useNavigate();
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); 

  // Create form state
  const [createForm, setCreateForm] = useState({ name: '', initial_balance: 100000, duration: '24h' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join form state
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => { fetchBattles(); }, []);

  const fetchBattles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/battles');
      setBattles(res.data.battles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreateError('');
    if (!createForm.name.trim()) return setCreateError('Battle name is required');
    setCreateLoading(true);
    try {
      const res = await api.post('/battles/create', createForm);
      setModal(null);
      navigate(`/battles/${res.data.group.id}`);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create battle');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async () => {
    setJoinError('');
    if (!joinCode.trim()) return setJoinError('Invite code is required');
    setJoinLoading(true);
    try {
      const res = await api.post('/battles/join', { invite_code: joinCode });
      setModal(null);
      navigate(`/battles/${res.data.group.id}`);
    } catch (err) {
      setJoinError(err.response?.data?.message || 'Failed to join battle');
    } finally {
      setJoinLoading(false);
    }
  };

  const statusColor = (status) => {
    if (status === 'waiting') return '#f0c040';
    if (status === 'active') return '#00d09c';
    return '#888';
  };

  const statusLabel = (status) => {
    if (status === 'waiting') return '⏳ Waiting';
    if (status === 'active') return '🔴 Live';
    return '✅ Ended';
  };

  const timeRemaining = (ends_at) => {
    if (!ends_at) return null;
    const diff = new Date(ends_at) - new Date();
    if (diff <= 0) return 'Ended';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h remaining`;
    return `${h}h ${m}m remaining`;
  };

  if (loading) return <div style={centered}>Loading battles...</div>;

  return (
    <div style={container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={pageTitle}>Stock Battles ⚔️</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button style={joinBtn} onClick={() => { setModal('join'); setJoinCode(''); setJoinError(''); }}>
            Join Battle
          </button>
          <button style={createBtn} onClick={() => { setModal('create'); setCreateForm({ name: '', initial_balance: 100000, duration: '24h' }); setCreateError(''); }}>
            + Create Battle
          </button>
        </div>
      </div>

      {battles.length === 0 ? (
        <div style={emptyState}>
          <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No battles yet</p>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>Create a battle and invite your friends to compete</p>
          <button style={createBtn} onClick={() => setModal('create')}>+ Create your first battle</button>
        </div>
      ) : (
        <div style={grid}>
          {battles.map((battle) => (
            <div key={battle.id} style={card} onClick={() => navigate(`/battles/${battle.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{battle.name}</h3>
                  <p style={{ color: '#666', fontSize: '0.85rem' }}>Created by {battle.created_by}</p>
                </div>
                <span style={{ ...statusBadge, background: statusColor(battle.status) + '22', color: statusColor(battle.status) }}>
                  {statusLabel(battle.status)}
                </span>
              </div>

              <div style={cardStats}>
                <div>
                  <div style={cardStatLabel}>Starting Balance</div>
                  <div style={cardStatValue}>₹{parseFloat(battle.initial_balance).toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div style={cardStatLabel}>Duration</div>
                  <div style={cardStatValue}>{battle.duration}</div>
                </div>
                <div>
                  <div style={cardStatLabel}>
                    {battle.status === 'active' ? 'Time Left' : battle.status === 'ended' ? 'Status' : 'Waiting'}
                  </div>
                  <div style={cardStatValue}>
                    {battle.status === 'active' ? timeRemaining(battle.ends_at) : battle.status === 'ended' ? 'Finished' : 'Not started'}
                  </div>
                </div>
              </div>

              {battle.status === 'waiting' && (
                <div style={{ marginTop: '1rem', padding: '0.5rem 0.75rem', background: '#0f0f0f', borderRadius: '6px', fontSize: '0.85rem', color: '#888' }}>
                  Invite Code: <span style={{ color: '#f0c040', fontWeight: 'bold', letterSpacing: '0.1em' }}>{battle.invite_code}</span>
                </div>
              )}

              {battle.is_creator && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#555' }}>👑 You created this</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {modal === 'create' && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Create a Battle</h3>

            <label style={label}>Battle Name</label>
            <input
              style={input}
              placeholder="e.g. Diwali Stock Wars"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />

            <label style={label}>Starting Balance</label>
            <select
              style={input}
              value={createForm.initial_balance}
              onChange={(e) => setCreateForm({ ...createForm, initial_balance: parseInt(e.target.value) })}
            >
              <option value={50000}>₹50,000</option>
              <option value={100000}>₹1,00,000</option>
              <option value={500000}>₹5,00,000</option>
              <option value={1000000}>₹10,00,000</option>
            </select>

            <label style={label}>Duration</label>
            <select
              style={input}
              value={createForm.duration}
              onChange={(e) => setCreateForm({ ...createForm, duration: e.target.value })}
            >
              <option value="24h">24 Hours</option>
              <option value="48h">48 Hours</option>
              <option value="5d">5 Days</option>
            </select>

            {createError && <p style={errorText}>{createError}</p>}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button style={createBtn} onClick={handleCreate} disabled={createLoading}>
                {createLoading ? 'Creating...' : 'Create Battle'}
              </button>
              <button style={cancelBtn} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {modal === 'join' && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Join a Battle</h3>
            <label style={label}>Invite Code</label>
            <input
              style={{ ...input, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '1.2rem' }}
              placeholder="XXXXXX"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />

            {joinError && <p style={errorText}>{joinError}</p>}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button style={createBtn} onClick={handleJoin} disabled={joinLoading}>
                {joinLoading ? 'Joining...' : 'Join Battle'}
              </button>
              <button style={cancelBtn} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const container = { maxWidth: '1100px', margin: '0 auto', padding: '2rem' };
const centered = { textAlign: 'center', padding: '4rem', color: '#888' };
const pageTitle = { fontSize: '1.8rem', fontWeight: 'bold' };
const emptyState = { textAlign: 'center', padding: '4rem', color: '#888' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' };
const card = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '1.5rem', cursor: 'pointer' };
const statusBadge = { padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' };
const cardStats = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' };
const cardStatLabel = { color: '#666', fontSize: '0.75rem', marginBottom: '0.25rem' };
const cardStatValue = { fontWeight: 'bold', fontSize: '0.9rem' };
const createBtn = { padding: '0.7rem 1.5rem', background: '#00d09c', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const joinBtn = { padding: '0.7rem 1.5rem', background: 'transparent', color: '#00d09c', border: '1px solid #00d09c', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const cancelBtn = { padding: '0.7rem 1.5rem', background: 'transparent', color: '#888', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '420px' };
const label = { display: 'block', color: '#888', fontSize: '0.85rem', marginBottom: '0.4rem' };
const input = { width: '100%', padding: '0.8rem', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#e0e0e0', fontSize: '0.95rem', marginBottom: '1rem', display: 'block' };
const errorText = { color: '#ff4444', fontSize: '0.85rem', marginBottom: '0.5rem' };

export default Battles;