const mongoose = require('mongoose');

const messageReadSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: [true, 'Message ID is required'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group ID is required'],
    index: true
  },
  readAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Compound index to ensure one read record per user per message
messageReadSchema.index({ messageId: 1, userId: 1 }, { unique: true });

// Index for querying unread messages
messageReadSchema.index({ userId: 1, groupId: 1 });

// Static method to mark message as read
messageReadSchema.statics.markAsRead = async function(messageId, userId, groupId) {
  return await this.findOneAndUpdate(
    { messageId, userId },
    { groupId, readAt: new Date() },
    { upsert: true, new: true }
  );
};

// Static method to get unread count for a user in a group
messageReadSchema.statics.getUnreadCount = async function(userId, groupId) {
  const Message = mongoose.model('Message');
  
  // Get all messages in the group
  const totalMessages = await Message.countDocuments({ 
    groupId, 
    isDeleted: false,
    senderId: { $ne: userId } // Don't count own messages
  });
  
  // Get read messages count
  const readCount = await this.countDocuments({ userId, groupId });
  
  return Math.max(0, totalMessages - readCount);
};

// Static method to mark all messages in a group as read
messageReadSchema.statics.markGroupAsRead = async function(userId, groupId) {
  const Message = mongoose.model('Message');
  
  // Get all unread messages in the group (excluding user's own messages)
  const unreadMessages = await Message.find({
    groupId,
    isDeleted: false,
    senderId: { $ne: userId }
  }).select('_id');
  
  // Mark all as read
  const messageIds = unreadMessages.map(m => m._id);
  const operations = messageIds.map(messageId => ({
    updateOne: {
      filter: { messageId, userId },
      update: { $set: { groupId, readAt: new Date() } },
      upsert: true
    }
  }));
  
  if (operations.length > 0) {
    await this.bulkWrite(operations);
  }
  
  return { marked: operations.length };
};

module.exports = mongoose.model('MessageRead', messageReadSchema);
