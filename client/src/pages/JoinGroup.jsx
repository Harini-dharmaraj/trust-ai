import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { FiUsers, FiBookOpen, FiUser, FiArrowRight, FiCheckCircle } from 'react-icons/fi';

function JoinGroup() {
  const { token: inviteToken } = useParams();
  const navigate = useNavigate();
  const { token: authToken, user } = useSelector((state) => state.auth);

  const [group, setGroup] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [success, setSuccess] = useState(false);

  const isGroupAdmin = group?.admin?._id === user?.id || group?.admin === user?.id || group?.adminId === user?.id;
  const isAlreadyMember = group?.members?.some((m) => (m._id || m || m.user) === user?.id) || isGroupAdmin;

  useEffect(() => {
    const fetchInviteDetails = async () => {
      try {
        const response = await axios.get(`/api/groups/invite/${inviteToken}`);
        setGroup(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired invitation link');
      } finally {
        setLoading(false);
      }
    };
    fetchInviteDetails();
  }, [inviteToken]);

  const handleJoin = async () => {
    if (!authToken) {
      // Save invite token in localStorage so we can auto-redeem after login/register
      localStorage.setItem('trustcircle-pending-invite', inviteToken);
      navigate('/auth');
      return;
    }

    setJoining(true);
    try {
      const response = await axios.post(
        `/api/groups/invite/${inviteToken}/join`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSuccess(true);
      
      // Update active group context
      localStorage.setItem('trustcircle-active-group', response.data.groupId);
      window.dispatchEvent(new Event('trustcircle-active-group-changed'));
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join group.');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center dark:bg-slate-950 text-slate-500">
        <p className="text-sm font-semibold animate-pulse">Verifying invitation code...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {error ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950 dark:text-rose-300 mb-4">
              ⚠️
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Invitation Error</h3>
            <p className="mt-2 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 w-full rounded-xl bg-slate-950 py-3 font-bold text-xs text-white hover:bg-slate-850 dark:bg-slate-800 transition"
            >
              Return Home
            </button>
          </div>
        ) : success ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 mb-4">
              <FiCheckCircle size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Success!</h3>
            <p className="mt-2 text-xs text-slate-500">You are now a member of {group?.name}. Redirecting to Workspace...</p>
          </div>
        ) : (
          <div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
              Community Invitation
            </span>
            
            <h3 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
              Join {group?.name}
            </h3>
            
            {group?.description && (
              <p className="mt-1 text-xs text-slate-500">{group.description}</p>
            )}

            <div className="my-5 space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 text-xs">
                <FiUser className="text-slate-400" size={16} />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Group Owner</p>
                  <p className="text-[10px] text-slate-500">{group?.admin?.name || 'Administrator'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs border-t border-slate-200/60 dark:border-slate-800 pt-3">
                <FiUsers className="text-slate-400" size={16} />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Active Directory</p>
                  <p className="text-[10px] text-slate-500">{group?.membersCount || 1} members registered</p>
                </div>
              </div>
            </div>

            {authToken ? (
              isAlreadyMember ? (
                <div className="text-xs text-slate-500 mb-4 bg-emerald-50 p-3 rounded-xl dark:bg-emerald-950/20 text-center border border-emerald-100">
                  {isGroupAdmin ? (
                    <span>🛡️ You are the **Group Admin** of this community.</span>
                  ) : (
                    <span>✓ You are **already a member** of this community.</span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 mb-4 bg-blue-50/50 p-3 rounded-xl dark:bg-blue-950/20 text-center border border-blue-100/40">
                  You are currently logged in as <strong className="text-blue-600 dark:text-blue-400">{user?.name}</strong>.
                </div>
              )
            ) : (
              <div className="text-xs text-slate-500 mb-4 bg-amber-50 p-3 rounded-xl dark:bg-amber-950/30 border border-amber-100">
                ⚠️ Register or log in to accept the invitation.
              </div>
            )}

            {authToken && isAlreadyMember ? (
              <button
                onClick={() => {
                  localStorage.setItem('trustcircle-active-group', group._id);
                  window.dispatchEvent(new Event('trustcircle-active-group-changed'));
                  navigate('/dashboard');
                }}
                className="w-full rounded-xl bg-slate-900 py-3.5 font-bold text-xs text-white hover:bg-slate-800 transition flex items-center justify-center gap-2"
              >
                Go to Dashboard Workspace
                <FiArrowRight />
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full rounded-xl bg-blue-600 py-3.5 font-bold text-xs text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                {joining ? 'Joining Pool...' : authToken ? 'Accept Invite & Join' : 'Sign In to Join'}
                <FiArrowRight />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default JoinGroup;
