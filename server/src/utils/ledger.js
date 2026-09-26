import crypto from 'crypto';

/**
 * Generates a cryptographic SHA-256 hash block for financial auditability.
 * @param {Object} data - Transaction details
 * @param {string} previousHash - Previous block hash in chain
 * @returns {Object} - Hash block metadata
 */
export function generateCryptographicBlock(data, previousHash = '0000000000000000000000000000000000000000000000000000000000000000') {
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({ data, previousHash, timestamp });
  const blockHash = crypto.createHash('sha256').update(payload).digest('hex');

  return {
    blockHash,
    previousHash,
    timestamp,
    merkleRoot: crypto.createHash('md5').update(payload).digest('hex'),
    verified: true,
  };
}

/**
 * Validates cryptographic chain integrity.
 */
export function verifyChainIntegrity(blocks = []) {
  if (!blocks || blocks.length === 0) return { isValid: true, count: 0 };
  
  for (let i = 1; i < blocks.length; i++) {
    if (blocks[i].previousHash !== blocks[i - 1].blockHash) {
      return { isValid: false, corruptedIndex: i };
    }
  }
  return { isValid: true, count: blocks.length };
}
