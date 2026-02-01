const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  settlementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Settlement',
    required: [true, 'Settlement ID is required']
  },
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  paidAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

paymentSchema.set('toJSON', {
  transform: function(doc, ret) {
    if (ret.amount) ret.amount = parseFloat(ret.amount.toString());
    return ret;
  }
});

paymentSchema.set('toObject', {
  transform: function(doc, ret) {
    if (ret.amount) ret.amount = parseFloat(ret.amount.toString());
    return ret;
  }
});

paymentSchema.index({ settlementId: 1 });
paymentSchema.index({ paidAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
