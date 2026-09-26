import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { FiShield, FiCheckCircle, FiCopy, FiLock, FiX, FiInfo } from 'react-icons/fi';

function AuditLedgerModal({ onClose }) {
  const { token } = useSelector((state) => state.auth);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const res = await axios.get('/api/finance/ledger', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBlocks(res.data);
      } catch (err) {
        console.error('Failed to retrieve audit ledger:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [token]);

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
              <FiShield size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cryptographic Audit Ledger</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <FiCheckCircle size={12} /> SHA-256 Validated
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immutable hash-chained transaction trail for maximum transparency.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Ledger Blocks */}
        <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {loading ? (
            <p className="text-xs text-slate-500 p-4">Auditing ledger hashes...</p>
          ) : blocks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60">
                <FiInfo size={24} />
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Audit Trail Empty</h4>
              <p className="mt-1 text-xs text-slate-500">
                No blocks in the audit trail yet. Add a contribution payment or record an approved expense to generate the Genesis block!
              </p>
            </div>
          ) : (
            blocks.map((block, idx) => (
              <div
                key={block.blockHeight || idx}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition dark:border-slate-800 dark:bg-slate-950/60 hover:border-blue-300 dark:hover:border-blue-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                      Block #{block.blockHeight}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-200">{block.action}</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">{block.timestamp}</span>
                </div>

                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Entity/User:</span>{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{block.entity}</span>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Amount / Impact:</span>{' '}
                    <span className="font-bold text-blue-600 dark:text-blue-400">{block.amount}</span>
                  </div>
                </div>

                {/* Hashes */}
                <div className="mt-3 space-y-2 rounded-xl bg-slate-900 p-3 text-[11px] font-mono text-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 font-sans text-[10px]">Block Hash:</span>
                    <button
                      onClick={() => handleCopy(block.blockHash, idx)}
                      className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
                    >
                      <FiCopy size={12} /> {copiedIndex === idx ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="truncate font-semibold text-emerald-400">{block.blockHash}</p>
                  <div className="border-t border-slate-800 pt-1 text-[10px] text-slate-400 truncate">
                    Prev Hash: {block.previousHash}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
            <FiLock size={14} className="text-blue-600" /> All records cryptographically signed with SHA-256 algorithm.
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuditLedgerModal;
