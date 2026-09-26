import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import Proposal from '../models/Proposal.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { readStore } from '../utils/db.js';

const router = express.Router();

router.post('/chat', protect, async (req, res) => {
  const { message, groupId } = req.body;
  const userId = req.user.id;
  const store = readStore();

  let context = {
    groupName: '',
    category: '',
    goalAmount: 0,
    contributionAmount: 0,
    members: [],
    payments: [],
    expenses: [],
    proposals: []
  };

  if (!groupId) {
    return res.json({ reply: 'Please select an active community group room so I can query its ledger context.' });
  }

  // 1. Retrieve actual database records for context
  try {
    const group = await Group.findById(groupId).populate('members', 'name email role trustScore');
    if (group) {
      context.groupName = group.name;
      context.category = group.category;
      context.goalAmount = group.goalAmount;
      context.contributionAmount = group.contributionAmount;
      context.members = group.members.map(m => ({ name: m.name, email: m.email, role: m.role, trustScore: m.trustScore }));
      
      const payments = await Payment.find({ group: groupId });
      context.payments = payments.map(p => ({ member: p.memberName, amount: p.amount, date: p.date, status: p.status }));

      const expenses = await Expense.find({ group: groupId });
      context.expenses = expenses.map(e => ({ title: e.title, amount: e.amount, category: e.category, reason: e.noReceiptReason || 'Receipt Verified' }));

      const proposals = await Proposal.find({ groupId });
      context.proposals = proposals.map(p => ({ title: p.title, amount: p.amount, status: p.status, yesVotes: p.yesVotes, noVotes: p.noVotes }));
    }
  } catch (dbErr) {
    // Local store fallback for offline tests
    const group = store.groups.find(g => g._id === groupId);
    if (group) {
      context.groupName = group.name;
      context.category = group.category;
      context.goalAmount = group.goalAmount;
      context.contributionAmount = group.contributionAmount;
      
      // Map members
      context.members = (group.members || []).map(mid => {
        const u = store.users.find(usr => usr._id === mid);
        return u ? { name: u.name, email: u.email, role: u.role, trustScore: u.trustScore || 90 } : { name: 'Member', role: 'member', trustScore: 90 };
      });

      const payments = store.payments.filter(p => p.groupId === groupId);
      context.payments = payments.map(p => ({ member: p.memberName, amount: p.amount, date: p.date, status: p.status }));

      const expenses = store.expenses.filter(e => e.groupId === groupId);
      context.expenses = expenses.map(e => ({ title: e.title, amount: e.amount, category: e.category, reason: e.noReceiptReason || 'Receipt Verified' }));

      const proposals = store.proposals.filter(p => p.groupId === groupId);
      context.proposals = proposals.map(p => ({ title: p.title, amount: p.amount, status: p.status, yesVotes: p.yesVotes, noVotes: p.noVotes }));
    }
  }

  // 2. Perform dynamic contextual query processing
  const lower = (message || '').toLowerCase();
  let reply = '';

  const totalCollected = context.payments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalSpent = context.expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const currentBalance = totalCollected - totalSpent;

  // Pattern Matching query parser backed by true DB records
  if (lower.includes('paid') && (lower.includes('how much') || lower.includes('my'))) {
    const userPayments = context.payments.filter(p => p.member.toLowerCase() === req.user.name?.toLowerCase());
    const totalUserPaid = userPayments.reduce((acc, curr) => acc + Number(curr.amount), 0);
    reply = `You have completed ${userPayments.length} payment contribution(s) towards "${context.groupName}". Total deposited: ₹${totalUserPaid.toLocaleString()}.`;
  } 
  else if (lower.includes('who hasn\'t') || lower.includes('pending') || lower.includes('unpaid')) {
    const paidNames = new Set(context.payments.map(p => p.member.toLowerCase()));
    const unpaidMembers = context.members.filter(m => !paidNames.has(m.name.toLowerCase()));
    
    if (unpaidMembers.length === 0) {
      reply = `All ${context.members.length} registered group members have paid their contribution dues.`;
    } else {
      reply = `The following members have pending contributions: ${unpaidMembers.map(m => m.name).join(', ')}. Per-member due: ₹${context.contributionAmount.toLocaleString()}.`;
    }
  } 
  else if (lower.includes('medical') || lower.includes('hospital')) {
    const medicalExp = context.expenses.filter(e => e.category.toLowerCase().includes('medical'));
    if (medicalExp.length === 0) {
      reply = `No medical or emergency category expenses are recorded for "${context.groupName}".`;
    } else {
      const sum = medicalExp.reduce((acc, curr) => acc + curr.amount, 0);
      reply = `Found ${medicalExp.length} medical expense entry/entries totaling ₹${sum.toLocaleString()}: \n` + 
              medicalExp.map(e => `- ${e.title}: ₹${e.amount.toLocaleString()} (${e.reason})`).join('\n');
    }
  } 
  else if (lower.includes('balance') || lower.includes('available') || lower.includes('pool')) {
    if (currentBalance < 0) {
      reply = `⚠️ Treasury Deficit Notice: "${context.groupName}" is running a deficit of ₹${Math.abs(currentBalance).toLocaleString()}. Total collected contributions equal ₹${totalCollected.toLocaleString()}, while approved disbursements total ₹${totalSpent.toLocaleString()}.`;
    } else {
      reply = `The active fund balance for "${context.groupName}" is ₹${currentBalance.toLocaleString()} (Total Collected: ₹${totalCollected.toLocaleString()} | Total Spent: ₹${totalSpent.toLocaleString()}).`;
    }
  } 
  else if (lower.includes('proposal') || lower.includes('vote')) {
    const pendingProps = context.proposals.filter(p => p.status === 'pending');
    if (pendingProps.length === 0) {
      reply = `There are no pending budget proposals awaiting votes in "${context.groupName}".`;
    } else {
      reply = `Found ${pendingProps.length} active proposal(s) awaiting approval:\n` +
              pendingProps.map(p => `- ${p.title} (₹${p.amount.toLocaleString()}) | Yes: ${p.yesVotes}, No: ${p.noVotes}`).join('\n');
    }
  } 
  else if (lower.includes('expense') || lower.includes('spent') || lower.includes('disbursement')) {
    if (context.expenses.length === 0) {
      reply = `No expense logs have been recorded yet for "${context.groupName}".`;
    } else {
      reply = `Total disbursements for "${context.groupName}" equal ₹${totalSpent.toLocaleString()} across ${context.expenses.length} transaction(s):\n` +
              context.expenses.map(e => `- ${e.title}: ₹${e.amount.toLocaleString()} [Category: ${e.category}]`).join('\n');
    }
  } 
  else {
    // Smart RAG Fallback using Gemini model context prompt structure
    const promptContext = `
      You are the AI Financial Advisor for TrustCircle AI.
      Group Name: ${context.groupName}
      Category/Type: ${context.category}
      Target Goal: ₹${context.goalAmount}
      Members list: ${JSON.stringify(context.members)}
      Dues Collected: ₹${totalCollected}
      Approved Expenses: ₹${totalSpent}
      Proposals: ${JSON.stringify(context.proposals)}
      
      User asks: "${message}"
      Please provide a concise, professional financial assessment based strictly on the group context provided above.
    `;

    // Hook up Gemini fetch query if GEMINI_API_KEY is available
    if (process.env.GEMINI_API_KEY) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptContext }] }]
          })
        });
        const resData = await response.json();
        const geminiReply = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (geminiReply) {
          reply = geminiReply;
        }
      } catch (err) {
        console.error('Gemini API call failed, falling back to local processing:', err);
      }
    }

    if (!reply) {
      reply = `I am monitoring "${context.groupName}". Our target goal is ₹${context.goalAmount.toLocaleString()} (${Math.round((totalCollected/context.goalAmount)*100)}% progress). Let me know if you need to trace contribution logs, pending votes, or GST receipt audits.`;
    }
  }

  res.json({ reply });
});

export default router;
