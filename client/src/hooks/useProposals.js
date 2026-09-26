import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';

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
      console.error(error);
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
    return () => window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
  }, [token]);

  return { proposals, loading, refetch: fetchProposals };
}
