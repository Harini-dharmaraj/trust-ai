import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';

export function useFinance() {
  const { token } = useSelector((state) => state.auth);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFinance = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    const activeGroupId = localStorage.getItem('trustcircle-active-group') || '';

    try {
      const [paymentsRes, expensesRes] = await Promise.all([
        axios.get(`/api/finance/payments?groupId=${activeGroupId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/api/finance/expenses?groupId=${activeGroupId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setPayments(paymentsRes.data);
      setExpenses(expensesRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
    
    // Listen for custom event when active group changes
    const handleGroupChange = () => {
      fetchFinance();
    };
    window.addEventListener('trustcircle-active-group-changed', handleGroupChange);
    return () => window.removeEventListener('trustcircle-active-group-changed', handleGroupChange);
  }, [token]);

  return { payments, expenses, loading, refetch: fetchFinance };
}
