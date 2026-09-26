import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';

export function useDashboardData() {
  const { token } = useSelector((state) => state.auth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    const activeGroupId = localStorage.getItem('trustcircle-active-group') || '';

    try {
      const response = await axios.get(`/api/dashboard/summary?groupId=${activeGroupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    const handleGroupChange = () => {
      fetchDashboard();
    };
    window.addEventListener('trustcircle-active-group-changed', handleGroupChange);
    return () => window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
  }, [token]);

  return { data, loading, refetch: fetchDashboard };
}
