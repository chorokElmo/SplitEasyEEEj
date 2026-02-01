const express = require('express');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const friendController = require('../controllers/friendController');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get user's friends
// @route   GET /api/friends/my
// @access  Private
router.get('/my', friendController.getMyFriends);

// @desc    Search users for friend requests
// @route   GET /api/friends/search
// @access  Private
router.get('/search', 
  (req, res, next) => {
    // Validate query parameter
    const { query } = req.query
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      })
    }
    next()
  },
  friendController.searchUsers
);

// @desc    Get received friend requests
// @route   GET /api/friends/requests/received
// @access  Private
router.get('/requests/received', friendController.getReceivedRequests);

// @desc    Get sent friend requests
// @route   GET /api/friends/requests/sent
// @access  Private
router.get('/requests/sent', friendController.getSentRequests);

// IMPORTANT: More specific routes must come before generic routes
// @desc    Accept friend request
// @route   POST /api/friends/request/:requestId/accept
// @access  Private
router.post('/request/:requestId/accept', 
  validate(schemas.objectId, 'params'), 
  friendController.acceptFriendRequest
);

// @desc    Reject friend request
// @route   POST /api/friends/request/:requestId/reject
// @access  Private
router.post('/request/:requestId/reject', 
  validate(schemas.objectId, 'params'), 
  friendController.rejectFriendRequest
);

// @desc    Cancel friend request
// @route   POST /api/friends/request/:requestId/cancel
// @access  Private
router.post('/request/:requestId/cancel', 
  validate(schemas.objectId, 'params'), 
  friendController.cancelFriendRequest
);

// @desc    Send friend request (must be last to avoid route conflicts)
// @route   POST /api/friends/request/:userId
// @access  Private
router.post('/request/:userId', 
  validate(schemas.objectId, 'params'), 
  friendController.sendFriendRequest
);

// @desc    Remove friend
// @route   DELETE /api/friends/remove/:friendshipId
// @access  Private
router.delete('/remove/:friendshipId', 
  validate(schemas.objectId, 'params'), 
  friendController.removeFriend
);

module.exports = router;