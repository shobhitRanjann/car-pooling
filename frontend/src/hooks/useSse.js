import { useEffect, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../api/axios';
import { useAuth } from '../context/AuthContext';

export function SseManager() {
  const { user } = useAuth();
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('piggyback_token');
    if (!user || !token) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    abortControllerRef.current = new AbortController();

    const connect = async () => {
      try {
        await fetchEventSource(`${API_BASE_URL}/api/events/subscribe`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: abortControllerRef.current.signal,
          onmessage(ev) {
            if (ev.event === 'INIT') {
              console.log('SSE Connected');
            } else if (ev.event === 'NEW_RIDE') {
              toast.success(ev.data, { duration: 5000, icon: '🚗' });
              window.dispatchEvent(new CustomEvent('REFRESH_DATA'));
            } else if (ev.event === 'RIDE_REQUEST') {
              toast.success(ev.data, { duration: 5000, icon: '👋' });
              window.dispatchEvent(new CustomEvent('REFRESH_DATA'));
            } else if (ev.event === 'REQUEST_UPDATE') {
              toast.success(ev.data, { duration: 5000 });
              window.dispatchEvent(new CustomEvent('REFRESH_DATA'));
            }
          },
          onclose() {
            throw new Error('Connection closed by server');
          },
          onerror(err) {
            console.error('SSE Error:', err);
            return 5000; 
          }
        });
      } catch (err) {
        console.error('SSE Failed:', err);
      }
    };

    connect();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user]);

  return null;
}
