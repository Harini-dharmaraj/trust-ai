import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import io from 'socket.io-client';

export function useProposals() {
  const { token } = useSelector((state) => state.auth);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProposals = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    const activeGroupId = localStorage.getItem('trustcircle-active-group') || '';

    try {
      const response = await axios.get(`/api/proposals?groupId=${activeGroupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProposals(response.data);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();

    const handleGroupChange = () => {
      fetchProposals();
    };
    window.addEventListener('trustcircle-active-group-changed', handleGroupChange);

    // Socket integration for real-time live proposal updates
    const activeGroupId = localStorage.getItem('trustcircle-active-group') || '';
    let socket;
    if (activeGroupId) {
      socket = io(window.location.origin);
      socket.emit('join_group', activeGroupId);

      socket.on('new_proposal', (newProp) => {
        if (newProp.groupId === activeGroupId) {
          setProposals((prev) => {
            if (prev.some((p) => p._id === newProp._id)) return prev;
            return [newProp, ...prev];
          });
        }
      });

      socket.on('vote_updated', (updatedProp) => {
        if (updatedProp.groupId === activeGroupId) {
          setProposals((prev) =>
            prev.map((p) => (p._id === updatedProp._id ? updatedProp : p))
          );
        }
      });
    }

    return () => {
      window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
      if (socket) {
        socket.off('new_proposal');
        socket.off('vote_updated');
        socket.disconnect();
      }
    };
  }, [token]);

  return { proposals, loading, refetch: fetchProposals };
}
