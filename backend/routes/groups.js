const express = require('express');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const groupController = require('../controllers/groupController');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Create group
// @route   POST /api/groups
// @access  Private
router.post('/', validate(schemas.groupCreate), groupController.createGroup);

// @desc    Get user's groups
// @route   GET /api/groups
// @access  Private
router.get('/', groupController.getUserGroups);

// @desc    Get group balances (expense-only; payments do not affect calculation)
// @route   GET /api/groups/:id/balances
// @access  Private (group members only)
router.get('/:id/balances', validate(schemas.objectId, 'params'), groupController.getGroupBalances);

// @desc    Get group settlements (canonical list – single source of truth for UI)
// @route   GET /api/groups/:id/settlements
// @access  Private (group members only)
router.get('/:id/settlements', validate(schemas.objectId, 'params'), groupController.getGroupSettlements);

// @desc    Create settlements from current (expense-only) balances
// @route   POST /api/groups/:id/settlements
// @access  Private (group members only)
router.post('/:id/settlements', validate(schemas.objectId, 'params'), groupController.createSettlementsFromBalances);

// @desc    Get optimized settlements (minimal transactions to settle all debts)
// @route   GET /api/groups/:id/optimized-settlements
// @access  Private (group members only)
router.get('/:id/optimized-settlements', validate(schemas.objectId, 'params'), groupController.getOptimizedSettlements);

// @desc    Generate and persist optimized settlements for group (single source of truth)
// @route   POST /api/groups/:id/settlements/optimize
// @access  Private (group members only)
router.post('/:id/settlements/optimize', validate(schemas.objectId, 'params'), groupController.optimizeSettlements);

// @desc    Get group by ID
// @route   GET /api/groups/:id
// @access  Private
router.get('/:id', validate(schemas.objectId, 'params'), groupController.getGroupById);

// @desc    Update group
// @route   PUT /api/groups/:id
// @access  Private (Admin only)
router.put('/:id',
  validate(schemas.objectId, 'params'),
  validate(schemas.groupUpdate),
  groupController.updateGroup
);

// @desc    Delete group
// @route   DELETE /api/groups/:id
// @access  Private (Owner only)
router.delete('/:id', validate(schemas.objectId, 'params'), groupController.deleteGroup);

// @desc    Add member to group
// @route   POST /api/groups/:id/members
// @access  Private (Admin only)
router.post('/:id/members',
  validate(schemas.objectId, 'params'),
  groupController.addMember
);

// @desc    Remove member from group
// @route   DELETE /api/groups/:id/members/:userId
// @access  Private (Admin only)
router.delete('/:id/members/:userId',
  validate(schemas.objectId, 'params'),
  groupController.removeMember
);

// @desc    Set member admin status (make admin / remove admin)
// @route   PUT /api/groups/:id/members/:userId
// @access  Private (Admin only)
router.put('/:id/members/:userId',
  validate(schemas.objectId, 'params'),
  validate(schemas.setMemberAdmin, 'body'),
  groupController.setMemberAdmin
);

// @desc    Leave group
// @route   POST /api/groups/:id/leave
// @access  Private
router.post('/:id/leave', validate(schemas.objectId, 'params'), groupController.leaveGroup);

module.exports = router;