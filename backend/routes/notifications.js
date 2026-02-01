const express = require('express');
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isRead } = req.query;
    const result = await Notification.getUserNotifications(req.user._id, {
      page: parseInt(page),
      limit: parseInt(limit),
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined
    });
    res.status(200).json({
      success: true,
      data: {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        totalPages: result.totalPages,
        currentPage: result.currentPage
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Mark all notifications as read (must be before /:id/read)
// @route   PATCH /api/notifications/read-all
// @access  Private
router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.markAllAsRead(req.user._id);
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    await notification.markAsRead();
    res.status(200).json({ success: true, data: { notification } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;