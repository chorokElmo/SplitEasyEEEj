const Message = require('../models/Message');
const MessageRead = require('../models/MessageRead');
const Group = require('../models/Group');
const Membership = require('../models/Membership');

/**
 * @desc    Get messages for a group
 * @route   GET /api/chat/:groupId/messages
 * @access  Private
 */
const getGroupMessages = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Verify user is a member
    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member of this group to view messages'
      });
    }

    // Get messages
    const messages = await Message.getGroupMessages(groupId, { page, limit });

    // Reverse to show oldest first (for chat UI)
    const reversedMessages = messages.reverse();

    // Mark messages as read when user views them
    await MessageRead.markGroupAsRead(req.user._id, groupId);

    res.status(200).json({
      success: true,
      data: {
        messages: reversedMessages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send a message to a group
 * @route   POST /api/chat/:groupId/messages
 * @access  Private
 */
const sendMessage = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { content, messageType = 'text' } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Verify user is a member
    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member of this group to send messages'
      });
    }

    // Create message
    const message = await Message.create({
      groupId,
      senderId: req.user._id,
      content: content.trim(),
      messageType
    });

    // Populate sender info
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'firstName lastName username email profilePhoto')
      .lean();

    // Broadcast message to all group members via WebSocket
    if (global.broadcastToGroup) {
      global.broadcastToGroup(groupId, {
        type: 'new_message',
        data: populatedMessage
      });
    }

    // Create notification for group members (except sender)
    const Notification = require('../models/Notification');
    const members = await Membership.find({ groupId });
    
    for (const member of members) {
      if (member.userId.toString() !== req.user._id.toString()) {
        await Notification.createNotification({
          userId: member.userId,
          title: 'New message',
          message: `${req.user.username || req.user.email} sent a message in ${group.title}`,
          type: 'system',
          relatedId: groupId,
          relatedModel: 'Group'
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: populatedMessage }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a message
 * @route   DELETE /api/chat/messages/:messageId
 * @access  Private
 */
const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only sender can delete their message
    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }

    // Soft delete
    message.isDeleted = true;
    await message.save();

    // Broadcast deletion
    if (global.broadcastToGroup) {
      global.broadcastToGroup(message.groupId.toString(), {
        type: 'message_deleted',
        data: { messageId: message._id.toString() }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get unread message counts for all groups
 * @route   GET /api/chat/unread-counts
 * @access  Private
 */
const getUnreadCounts = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Get user's groups
    const memberships = await Membership.find({ userId })
      .populate('groupId')
      .lean();
    
    const unreadCounts = {};
    
    // Get unread count for each group
    for (const membership of memberships) {
      if (membership.groupId && membership.groupId._id) {
        const groupId = membership.groupId._id.toString();
        const unreadCount = await MessageRead.getUnreadCount(userId, groupId);
        unreadCounts[groupId] = unreadCount;
      }
    }
    
    res.status(200).json({
      success: true,
      data: { unreadCounts }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGroupMessages,
  sendMessage,
  deleteMessage,
  getUnreadCounts
};
