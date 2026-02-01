const express = require('express');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const chatController = require('../controllers/chatController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @desc    Get messages for a group
// @route   GET /api/chat/:groupId/messages
// @access  Private
router.get('/:groupId/messages', 
  validate(schemas.objectId, 'params'),
  chatController.getGroupMessages
);

// @desc    Send a message to a group
// @route   POST /api/chat/:groupId/messages
// @access  Private
router.post('/:groupId/messages',
  validate(schemas.objectId, 'params'),
  validate(schemas.messageSend),
  chatController.sendMessage
);

// @desc    Delete a message
// @route   DELETE /api/chat/messages/:messageId
// @access  Private
router.delete('/messages/:messageId',
  validate(schemas.objectId, 'params'),
  chatController.deleteMessage
);

// @desc    Get unread message counts for all groups
// @route   GET /api/chat/unread-counts
// @access  Private
router.get('/unread-counts', chatController.getUnreadCounts);

module.exports = router;
