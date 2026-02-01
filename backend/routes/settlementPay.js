const express = require('express');
const mongoose = require('mongoose');
const Settlement = require('../models/Settlement');
const Payment = require('../models/Payment');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

router.use(protect);

// Standalone MongoDB does not support transactions (replica set required). Use same logic without session when needed.
function isTransactionNotSupportedError(err) {
  if (!err) return false;
  const msg = (err.message && String(err.message)) || '';
  return /replica set|Transaction numbers|transactions are not supported/i.test(msg) || err.code === 263;
}

/**
 * POST /api/settlements/:settlementId/pay-part
 * Part payment: reduce remainingAmount, create Payment, update balance via Payment sum.
 * Multiple calls allowed until remainingAmount = 0. Double payment impossible (amount > remainingAmount → 400).
 *
 * Example: totalAmount = 100
 *   POST pay-part { "amount": 30 } → remainingAmount = 70, status = "partial"
 *   POST pay-part { "amount": 70 } → remainingAmount = 0, status = "paid"
 */
router.post('/:settlementId/pay-part',
  validate(schemas.objectId, 'params'),
  validate(schemas.payPartAmount, 'body'),
  async (req, res, next) => {
    try {
      const { settlementId } = req.params;
      const { amount } = req.body;

      const settlement = await Settlement.findById(settlementId).lean();
      if (!settlement) {
        return res.status(404).json({ success: false, message: 'Settlement not found' });
      }
      if (settlement.status === 'paid') {
        return res.status(409).json({ success: false, message: 'Settlement is already paid' });
      }
      if (amount <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
      }

      const remaining = settlement.remainingAmount != null
        ? parseFloat(settlement.remainingAmount.toString())
        : (settlement.totalAmount != null ? parseFloat(settlement.totalAmount.toString()) : null);
      if (remaining == null) {
        return res.status(400).json({ success: false, message: 'Settlement does not support part payments' });
      }
      if (amount > remaining) {
        return res.status(400).json({ success: false, message: 'Amount exceeds remaining amount' });
      }

      const runPayPart = async (session) => {
        const opts = session ? { session } : {};
        const paymentDoc = await Payment.create(
          [{ settlementId, amount, paidAt: new Date() }],
          opts
        );
        const paymentId = (Array.isArray(paymentDoc) ? paymentDoc[0] : paymentDoc)._id;

        const updated = await Settlement.findOneAndUpdate(
          { _id: settlementId, status: { $ne: 'paid' }, remainingAmount: { $gte: amount } },
          { $inc: { totalPaid: amount, remainingAmount: -amount } },
          { new: true, ...opts }
        );

        if (!updated) return null;
        const newRemaining = parseFloat(updated.remainingAmount.toString());
        const newStatus = newRemaining <= 0 ? 'paid' : 'partial';
        await Settlement.updateOne(
          { _id: settlementId },
          { $set: { status: newStatus } },
          opts
        );
        return paymentId;
      };

      try {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const paymentId = await runPayPart(session);
          if (!paymentId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
              success: false,
              message: 'Settlement state changed or amount exceeds remaining'
            });
          }
          await session.commitTransaction();
          session.endSession();
        } catch (txErr) {
          await session.abortTransaction().catch(() => {});
          session.endSession();
          if (!isTransactionNotSupportedError(txErr)) throw txErr;
          const paymentId = await runPayPart(null);
          if (!paymentId) {
            return res.status(400).json({
              success: false,
              message: 'Settlement state changed or amount exceeds remaining'
            });
          }
        }
        const settlementPopulated = await Settlement.findById(settlementId)
          .populate('fromUserId', 'firstName lastName username')
          .populate('toUserId', 'firstName lastName username')
          .populate('groupId', 'title')
          .lean();
        const paymentPopulated = await Payment.findOne({ settlementId }).sort({ paidAt: -1 }).lean();
        if (paymentPopulated && paymentPopulated.amount) {
          paymentPopulated.amount = parseFloat(paymentPopulated.amount.toString());
        }
        return res.status(200).json({
          success: true,
          message: 'Part payment recorded',
          data: { settlement: settlementPopulated, payment: paymentPopulated }
        });
      } catch (error) {
        if (isTransactionNotSupportedError(error)) {
          const paymentId = await runPayPart(null);
          if (!paymentId) {
            return res.status(400).json({
              success: false,
              message: 'Settlement state changed or amount exceeds remaining'
            });
          }
          const settlementPopulated = await Settlement.findById(settlementId)
            .populate('fromUserId', 'firstName lastName username')
            .populate('toUserId', 'firstName lastName username')
            .populate('groupId', 'title')
            .lean();
          const paymentPopulated = await Payment.findOne({ settlementId }).sort({ paidAt: -1 }).lean();
          if (paymentPopulated && paymentPopulated.amount) {
            paymentPopulated.amount = parseFloat(paymentPopulated.amount.toString());
          }
          return res.status(200).json({
            success: true,
            message: 'Part payment recorded',
            data: { settlement: settlementPopulated, payment: paymentPopulated }
          });
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/settlements/:settlementId/pay
 * Record a payment (full or partial). Single source of truth: backend rejects duplicate/over-payment.
 * - If settlement has totalAmount/remainingAmount: body.amount optional (default = pay full remaining).
 * - If already paid → 409. If amount > remaining → 400. All writes transactional.
 */
router.post('/:settlementId/pay',
  validate(schemas.objectId, 'params'),
  validate(schemas.payAmountOptional, 'body'),
  async (req, res, next) => {
    try {
      const { settlementId } = req.params;
      const bodyAmount = req.body && req.body.amount != null ? parseFloat(req.body.amount) : null;

      const settlement = await Settlement.findById(settlementId).lean();
      if (!settlement) {
        return res.status(404).json({ success: false, message: 'Settlement not found' });
      }
      if (settlement.status === 'paid') {
        return res.status(409).json({ success: false, message: 'Settlement is already paid; duplicate payment not allowed' });
      }

      const remaining = settlement.remainingAmount != null
        ? parseFloat(settlement.remainingAmount.toString())
        : (settlement.totalAmount != null ? parseFloat(settlement.totalAmount.toString()) : null);

      if (remaining != null && remaining > 0) {
        const amount = bodyAmount != null ? bodyAmount : remaining;
        if (amount <= 0) {
          return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
        }
        if (amount > remaining) {
          return res.status(400).json({ success: false, message: 'Amount exceeds remaining amount' });
        }

        const runPay = async (session) => {
          const opts = session ? { session } : {};
          const paymentDoc = await Payment.create(
            [{ settlementId, amount, paidAt: new Date() }],
            opts
          );
          const paymentId = (Array.isArray(paymentDoc) ? paymentDoc[0] : paymentDoc)._id;
          const updated = await Settlement.findOneAndUpdate(
            { _id: settlementId, status: { $ne: 'paid' }, remainingAmount: { $gte: amount } },
            { $inc: { totalPaid: amount, remainingAmount: -amount } },
            { new: true, ...opts }
          );
          if (!updated) return null;
          const newRemaining = parseFloat(updated.remainingAmount.toString());
          const newStatus = newRemaining <= 0 ? 'awaiting_confirmation' : 'partial';
          await Settlement.updateOne(
            { _id: settlementId },
            { $set: { status: newStatus } },
            opts
          );
          return paymentId;
        };

        try {
          const session = await mongoose.startSession();
          session.startTransaction();
          try {
            const paymentId = await runPay(session);
            if (!paymentId) {
              await session.abortTransaction();
              session.endSession();
              return res.status(400).json({
                success: false,
                message: 'Settlement state changed or amount exceeds remaining'
              });
            }
            await session.commitTransaction();
            session.endSession();
          } catch (txErr) {
            await session.abortTransaction().catch(() => {});
            session.endSession();
            if (!isTransactionNotSupportedError(txErr)) throw txErr;
            const paymentId = await runPay(null);
            if (!paymentId) {
              return res.status(400).json({
                success: false,
                message: 'Settlement state changed or amount exceeds remaining'
              });
            }
          }
          const settlementPopulated = await Settlement.findById(settlementId)
            .populate('fromUserId', 'firstName lastName username')
            .populate('toUserId', 'firstName lastName username')
            .populate('groupId', 'title')
            .lean();
          const paymentPopulated = await Payment.findOne({ settlementId }).sort({ paidAt: -1 }).lean();
          if (paymentPopulated && paymentPopulated.amount) {
            paymentPopulated.amount = parseFloat(paymentPopulated.amount.toString());
          }
          return res.status(200).json({
            success: true,
            message: 'Payment recorded',
            data: { settlement: settlementPopulated, payment: paymentPopulated }
          });
        } catch (err) {
          if (isTransactionNotSupportedError(err)) {
            const paymentId = await runPay(null);
            if (!paymentId) {
              return res.status(400).json({
                success: false,
                message: 'Settlement state changed or amount exceeds remaining'
              });
            }
            const settlementPopulated = await Settlement.findById(settlementId)
              .populate('fromUserId', 'firstName lastName username')
              .populate('toUserId', 'firstName lastName username')
              .populate('groupId', 'title')
              .lean();
            const paymentPopulated = await Payment.findOne({ settlementId }).sort({ paidAt: -1 }).lean();
            if (paymentPopulated && paymentPopulated.amount) {
              paymentPopulated.amount = parseFloat(paymentPopulated.amount.toString());
            }
            return res.status(200).json({
              success: true,
              message: 'Payment recorded',
              data: { settlement: settlementPopulated, payment: paymentPopulated }
            });
          }
          throw err;
        }
      }

      if (settlement.status === 'pending' && (settlement.amount != null || settlement.totalAmount == null)) {
        const legacyAmount = settlement.amount != null
          ? parseFloat(settlement.amount.toString())
          : (bodyAmount != null ? bodyAmount : 0);
        if (legacyAmount <= 0) {
          return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
        }
        const runLegacyPay = async (session) => {
          const opts = session ? { session } : {};
          const result = await Settlement.findOneAndUpdate(
            { _id: settlementId, status: 'pending' },
            { $set: { status: 'awaiting_confirmation', paidAt: new Date() } },
            { new: true, ...opts }
          );
          if (!result) return false;
          await Payment.create([{ settlementId, amount: legacyAmount, paidAt: new Date() }], opts);
          return true;
        };
        try {
          const session = await mongoose.startSession();
          session.startTransaction();
          try {
            const ok = await runLegacyPay(session);
            if (!ok) {
              await session.abortTransaction();
              session.endSession();
              return res.status(400).json({ success: false, message: 'Settlement state changed' });
            }
            await session.commitTransaction();
            session.endSession();
          } catch (txErr) {
            await session.abortTransaction().catch(() => {});
            session.endSession();
            if (!isTransactionNotSupportedError(txErr)) throw txErr;
            await runLegacyPay(null);
          }
          const populated = await Settlement.findById(settlementId)
            .populate('fromUserId', 'firstName lastName username')
            .populate('toUserId', 'firstName lastName username')
            .populate('groupId', 'title')
            .lean();
          return res.status(200).json({
            success: true,
            message: 'Settlement marked as paid',
            data: { settlement: populated }
          });
        } catch (err) {
          if (isTransactionNotSupportedError(err)) {
            const ok = await runLegacyPay(null);
            if (!ok) return res.status(400).json({ success: false, message: 'Settlement state changed' });
            const populated = await Settlement.findById(settlementId)
              .populate('fromUserId', 'firstName lastName username')
              .populate('toUserId', 'firstName lastName username')
              .populate('groupId', 'title')
              .lean();
            return res.status(200).json({
              success: true,
              message: 'Settlement marked as paid',
              data: { settlement: populated }
            });
          }
          throw err;
        }
      }

      return res.status(400).json({
        success: false,
        message: 'Settlement does not support payment or is not in a payable state'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/settlements/:settlementId/confirm
 * Receiver confirms they received the payment. Sets status to 'paid'.
 */
router.post('/:settlementId/confirm',
  validate(schemas.objectId, 'params'),
  async (req, res, next) => {
    try {
      const { settlementId } = req.params;
      const userId = req.user._id.toString();

      const settlement = await Settlement.findById(settlementId).lean();
      if (!settlement) {
        return res.status(404).json({ success: false, message: 'Settlement not found' });
      }

      const toUserId = settlement.toUserId?.toString?.() || settlement.toUserId?.toString();
      if (toUserId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the receiver can confirm this payment'
        });
      }

      if (settlement.status !== 'awaiting_confirmation') {
        return res.status(400).json({
          success: false,
          message: 'Settlement is not awaiting confirmation'
        });
      }

      const updated = await Settlement.findOneAndUpdate(
        {
          _id: settlementId,
          toUserId: req.user._id,
          status: 'awaiting_confirmation'
        },
        { $set: { status: 'paid', paidAt: new Date() } },
        { new: true }
      );

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Settlement not found or not awaiting confirmation'
        });
      }

      const settlementPopulated = await Settlement.findById(settlementId)
        .populate('fromUserId', 'firstName lastName username')
        .populate('toUserId', 'firstName lastName username')
        .populate('groupId', 'title')
        .lean();

      return res.status(200).json({
        success: true,
        message: 'Payment confirmed',
        data: { settlement: settlementPopulated }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/settlements/:settlementId/undo
 * Undo the last payment for this settlement. Transactional when MongoDB supports it.
 */
router.post('/:settlementId/undo',
  validate(schemas.objectId, 'params'),
  async (req, res, next) => {
    try {
      const { settlementId } = req.params;

      const settlement = await Settlement.findById(settlementId).lean();
      if (!settlement) {
        return res.status(404).json({ success: false, message: 'Settlement not found' });
      }

      const runUndo = async (session) => {
        const opts = session ? { session } : {};
        let q = Payment.findOne({ settlementId }).sort({ paidAt: -1 });
        if (session) q = q.session(session);
        const lastPayment = await q.lean();
        if (!lastPayment) return { ok: false, reason: 'no_payment' };
        const undoAmount = parseFloat(lastPayment.amount.toString());
        await Payment.deleteOne({ _id: lastPayment._id }, opts);
        const updated = await Settlement.findOneAndUpdate(
          { _id: settlementId },
          { $inc: { totalPaid: -undoAmount, remainingAmount: undoAmount } },
          { new: true, ...opts }
        );
        if (!updated) return { ok: false, reason: 'update_failed' };
        const newTotalPaid = parseFloat(updated.totalPaid.toString());
        const newRemaining = updated.remainingAmount != null ? parseFloat(updated.remainingAmount.toString()) : null;
        const newStatus = newRemaining != null && newRemaining <= 0 ? 'paid' : (newTotalPaid <= 0 ? 'pending' : 'partial');
        await Settlement.updateOne(
          { _id: settlementId },
          { $set: { status: newStatus } },
          opts
        );
        return { ok: true };
      };

      try {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const result = await runUndo(session);
          if (!result.ok) {
            await session.abortTransaction();
            session.endSession();
            if (result.reason === 'no_payment') {
              return res.status(400).json({ success: false, message: 'No payment to undo' });
            }
            return res.status(400).json({ success: false, message: 'Could not update settlement' });
          }
          await session.commitTransaction();
          session.endSession();
        } catch (txErr) {
          await session.abortTransaction().catch(() => {});
          session.endSession();
          if (!isTransactionNotSupportedError(txErr)) throw txErr;
          const result = await runUndo(null);
          if (!result.ok) {
            if (result.reason === 'no_payment') {
              return res.status(400).json({ success: false, message: 'No payment to undo' });
            }
            return res.status(400).json({ success: false, message: 'Could not update settlement' });
          }
        }
        const settlementPopulated = await Settlement.findById(settlementId)
          .populate('fromUserId', 'firstName lastName username')
          .populate('toUserId', 'firstName lastName username')
          .populate('groupId', 'title')
          .lean();
        return res.status(200).json({
          success: true,
          message: 'Last payment undone',
          data: { settlement: settlementPopulated }
        });
      } catch (err) {
        if (isTransactionNotSupportedError(err)) {
          const result = await runUndo(null);
          if (!result.ok) {
            if (result.reason === 'no_payment') {
              return res.status(400).json({ success: false, message: 'No payment to undo' });
            }
            return res.status(400).json({ success: false, message: 'Could not update settlement' });
          }
          const settlementPopulated = await Settlement.findById(settlementId)
            .populate('fromUserId', 'firstName lastName username')
            .populate('toUserId', 'firstName lastName username')
            .populate('groupId', 'title')
            .lean();
          return res.status(200).json({
            success: true,
            message: 'Last payment undone',
            data: { settlement: settlementPopulated }
          });
        }
        throw err;
      }
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
