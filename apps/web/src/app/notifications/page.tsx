'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  orderId?: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchNotifications();
  }, [user, page]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/notifications?page=${page}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.ok) {
        setNotifications(data.data.notifications);
        setTotal(data.data.total);
        setUnreadCount(data.data.unreadCount);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/notifications/${id}/read`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
      );
      fetchNotifications();
    } catch {}
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/notifications/read-all`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
      );
      fetchNotifications();
    } catch {}
  };

  if (loading) return <div className="pageWrapper" style={{ textAlign: 'center', padding: '100px 24px' }}>Cargando...</div>;

  return (
    <div className="pageWrapper" style={{ maxWidth: 800, margin: '0 auto', padding: '100px 24px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>Notificaciones</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--secondary)',
              color: '#fff',
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
          No tienes notificaciones
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                markAsRead(n.id);
                if (n.orderId) router.push(`/orders/${n.orderId}`);
              }}
              style={{
                padding: 16,
                borderRadius: 12,
                background: n.read ? '#fff' : 'rgba(30, 64, 175, 0.04)',
                border: `1px solid ${n.read ? 'var(--border-light)' : 'var(--secondary)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{n.message}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {new Date(n.createdAt).toLocaleDateString('es-VE')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          {Array.from({ length: Math.ceil(total / 20) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: page === p ? 'var(--secondary)' : '#fff',
                color: page === p ? '#fff' : 'var(--text)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                fontWeight: page === p ? 600 : 400,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
