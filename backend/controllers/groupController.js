const mongoose = require('mongoose');
const Group = require('../models/Group');
const Membership = require('../models/Membership');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Split = require('../models/Split');
const Settlement = require('../models/Settlement');
const { computeOptimizedSettlements } = require('../utils/debtOptimization');

/**
 * @desc    Create group
 * @route   POST /api/groups
 * @access  Private
 */
const createGroup = async (req, res, next) => {
  try {
    const { title, description, type, currency, member_ids } = req.body;
    
    const userId = req.user._id;
    
    // Ensure currency is valid (exactly 3 characters, uppercase)
    let validCurrency = 'USD'; // default
    if (currency && typeof currency === 'string' && currency.trim().length === 3) {
      validCurrency = currency.trim().toUpperCase();
    }
    
    // Create group
    const group = await Group.create({
      title,
      description,
      type: type || 'Other',
      currency: validCurrency,
      ownerId: userId
    });
    
    // Add creator as admin member
    await Membership.addMember(group._id, userId, true);
    
    // Add other members if provided (exclude creator to avoid duplicate)
    const creatorIdStr = userId.toString();
    if (member_ids && member_ids.length > 0) {
      for (const memberId of member_ids) {
        const idStr = memberId && (memberId.toString ? memberId.toString() : String(memberId));
        if (!idStr || idStr === creatorIdStr) continue;
        try {
          await Membership.addMember(group._id, memberId, false);
        } catch (error) {
          // Continue with other members even if one fails
        }
      }
    }
    
    // Log activity
    await ActivityLog.logActivity({
      userId: userId,
      groupId: group._id,
      action: 'group_created',
      details: { title, type, currency, memberCount: (member_ids?.length || 0) + 1 },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Populate owner info
    const populatedGroup = await Group.findById(group._id)
      .populate('ownerId', 'firstName lastName username');
    
    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: { group: populatedGroup }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's groups
 * @route   GET /api/groups
 * @access  Private
 */
const getUserGroups = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const userId = req.user._id;
    
    // Verify user ID is valid
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const memberships = await Membership.find({ userId: userId })
      .populate({
        path: 'groupId',
        populate: {
          path: 'ownerId',
          select: 'firstName lastName username'
        }
      })
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Filter out memberships with null groups (in case group was deleted)
    const validMemberships = memberships.filter(m => 
      m.groupId !== null && 
      m.groupId !== undefined && 
      m.groupId._id !== null && 
      m.groupId._id !== undefined
    );
    
    if (validMemberships.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          groups: [],
          pagination: {
            totalPages: 0,
            currentPage: parseInt(page),
            totalGroups: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    }
    
    // Get member counts for all groups
    const groupIds = validMemberships.map(m => m.groupId._id || m.groupId);
    const memberCounts = await Membership.aggregate([
      { $match: { groupId: { $in: groupIds } } },
      { $group: { _id: '$groupId', count: { $sum: 1 } } }
    ]);
    
    const memberCountMap = {};
    memberCounts.forEach(mc => {
      memberCountMap[mc._id.toString()] = mc.count;
    });
    
    // Map memberships to groups
    const groups = validMemberships.map(membership => {
      const groupObj = membership.groupId.toObject();
      const groupIdStr = groupObj._id.toString();
      return {
        ...groupObj,
        isAdmin: membership.isAdmin,
        membershipUpdatedAt: membership.updatedAt,
        memberCount: memberCountMap[groupIdStr] || 0
      };
    });
    
    const total = await Membership.countDocuments({ userId: userId });
    
    res.status(200).json({
      success: true,
      data: {
        groups,
        pagination: {
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          totalGroups: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get group by ID
 * @route   GET /api/groups/:id
 * @access  Private
 */
const getGroupById = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('ownerId', 'firstName lastName username profilePhoto');
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user is member
    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this group'
      });
    }
    
    // Get members
    const members = await Membership.getGroupMembers(group._id);
    
    // Check if current user is admin
    const isAdmin = await group.isAdmin(req.user._id);
    
    res.status(200).json({
      success: true,
      data: {
        group: {
          ...group.toObject(),
          members,
          isAdmin
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update group
 * @route   PUT /api/groups/:id
 * @access  Private (Admin only)
 */
const updateGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user is admin
    const isAdmin = await group.isAdmin(req.user._id);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can update group details'
      });
    }
    
    const allowedFields = ['title', 'description', 'type', 'currency'];
    const updates = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    const updatedGroup = await Group.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('ownerId', 'firstName lastName username');
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      groupId: group._id,
      action: 'group_updated',
      details: updates,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      data: { group: updatedGroup }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete group
 * @route   DELETE /api/groups/:id
 * @access  Private (Owner only)
 */
const deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Only owner can delete group
    if (group.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only group owner can delete the group'
      });
    }
    
    // Check if group has expenses
    const Expense = require('../models/Expense');
    const expenseCount = await Expense.countDocuments({ groupId: group._id });
    
    if (expenseCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete group with existing expenses. Please settle all expenses first.'
      });
    }
    
    // Remove all memberships
    await Membership.deleteMany({ groupId: group._id });
    
    // Delete group
    await Group.findByIdAndDelete(req.params.id);
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      action: 'group_deleted',
      details: { 
        groupId: group._id,
        title: group.title 
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add member to group
 * @route   POST /api/groups/:id/members
 * @access  Private (Admin only)
 */
const addMember = async (req, res, next) => {
  try {
    const { userId, isAdmin = false } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if current user is admin
    const isCurrentUserAdmin = await group.isAdmin(req.user._id);
    if (!isCurrentUserAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can add members'
      });
    }
    
    // Check if user exists
    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Add member
    await Membership.addMember(group._id, userId, isAdmin);
    
    // Notify the added user
    await Notification.create({
      userId,
      title: 'Added to group',
      message: `${req.user.username || req.user.email} added you to the group "${group.title}"`,
      type: 'member_added',
      relatedId: group._id,
      relatedModel: 'Group'
    });
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      groupId: group._id,
      action: 'member_added',
      details: { 
        addedUserId: userId,
        username: userToAdd.username,
        isAdmin
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: 'Member added successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this group'
      });
    }
    next(error);
  }
};

/**
 * @desc    Remove member from group
 * @route   DELETE /api/groups/:id/members/:userId
 * @access  Private (Admin only)
 */
const removeMember = async (req, res, next) => {
  try {
    const { id: groupId, userId } = req.params;
    
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if current user is admin or removing themselves
    const isAdmin = await group.isAdmin(req.user._id);
    const isSelf = req.user._id.toString() === userId;
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can remove members'
      });
    }
    
    // Cannot remove group owner
    if (group.ownerId.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove group owner'
      });
    }
    
    // Remove member
    const result = await Membership.removeMember(groupId, userId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this group'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set member admin status (make admin / remove admin)
 * @route   PUT /api/groups/:id/members/:userId
 * @access  Private (Admin only)
 */
const setMemberAdmin = async (req, res, next) => {
  try {
    const { id: groupId, userId } = req.params;
    const { isAdmin } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isCurrentUserAdmin = await group.isAdmin(req.user._id);
    if (!isCurrentUserAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can change member roles'
      });
    }

    if (group.ownerId.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change group owner admin status'
      });
    }

    const membership = await Membership.findOne({ groupId, userId });
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this group'
      });
    }

    membership.isAdmin = !!isAdmin;
    await membership.save();

    res.status(200).json({
      success: true,
      message: isAdmin ? 'Member is now admin' : 'Admin role removed',
      data: { membership }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Leave group
 * @route   POST /api/groups/:id/leave
 * @access  Private
 */
const leaveGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Cannot leave if user is owner
    if (group.ownerId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Group owner cannot leave the group. Transfer ownership or delete the group.'
      });
    }
    
    // Check if user has unsettled expenses
    const Split = require('../models/Split');
    const userBalance = await Split.calculateUserBalance(req.user._id, group._id);
    
    if (Math.abs(userBalance.balance) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Cannot leave group with unsettled expenses. Please settle all expenses first.',
        data: { balance: userBalance }
      });
    }
    
    // Remove membership
    await Membership.removeMember(group._id, req.user._id);
    
    res.status(200).json({
      success: true,
      message: 'Left group successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get group balances (expense-only; payments do NOT affect this)
 * @route   GET /api/groups/:id/balances
 * @access  Private (group members only)
 * Returns: final net balance per user. netBalance = totalPaid - fairShare (from expenses/splits only).
 */
const getGroupBalances = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view balances for this group'
      });
    }

    const balances = await Split.getGroupBalances(groupId);

    res.status(200).json({
      success: true,
      data: { balances }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get group settlements (canonical list – single source of truth for UI)
 * @route   GET /api/groups/:id/settlements
 * @access  Private (group members only)
 * Returns: id, groupId, payerId, receiverId, totalAmount, paidAmount, status (unpaid|partial|paid)
 */
const getGroupSettlements = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view settlements for this group'
      });
    }

    const docs = await Settlement.find({ groupId })
      .populate('fromUserId', 'firstName lastName username')
      .populate('toUserId', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .lean();

    const normalizeStatus = (s) => {
      if (s === 'paid' || s === 'partial' || s === 'awaiting_confirmation') return s;
      if (s === 'pending' || s === 'rejected') return 'unpaid';
      if (s === 'accepted') return 'paid';
      return 'unpaid';
    };

    const settlements = docs.map((s) => {
      const totalAmount = s.totalAmount != null
        ? parseFloat(s.totalAmount.toString())
        : (s.amount != null ? parseFloat(s.amount.toString()) : 0);
      const totalPaid = s.totalPaid != null
        ? parseFloat(s.totalPaid.toString())
        : (s.status === 'accepted' || s.status === 'paid' ? totalAmount : 0);
      const status = normalizeStatus(s.status);
      const rawStatus = s.status;
      const remainingAmount = status === 'paid' ? 0 : (s.remainingAmount != null
        ? parseFloat(s.remainingAmount.toString())
        : Math.round((totalAmount - totalPaid) * 100) / 100);
      return {
        id: s._id.toString(),
        _id: s._id,
        groupId: s.groupId.toString(),
        payerId: s.fromUserId?._id?.toString() || s.fromUserId?.toString(),
        receiverId: s.toUserId?._id?.toString() || s.toUserId?.toString(),
        totalAmount,
        paidAmount: totalPaid,
        status,
        rawStatus,
        fromUserId: s.fromUserId,
        toUserId: s.toUserId,
        remainingAmount,
        createdAt: s.createdAt
      };
    });

    res.status(200).json({
      success: true,
      data: { settlements }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get optimized settlements for a group (minimal number of transactions)
 * @route   GET /api/groups/:id/optimized-settlements
 * @access  Private (group members only)
 * @note    Suggested settlements only; does not mark anything as paid.
 */
const getOptimizedSettlements = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view settlements for this group'
      });
    }

    const balances = await Split.getGroupBalances(groupId);
    const balanceInput = balances.map((b) => ({
      userId: b.userId,
      balance: Number(b.balance)
    }));
    const transactions = computeOptimizedSettlements(balanceInput);

    res.status(200).json({
      success: true,
      data: { transactions }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate and persist optimized settlements for a group (single source of truth)
 * @route   POST /api/groups/:id/settlements/optimize
 * @access  Private (group members only)
 * - Deletes previous PENDING settlements for the group
 * - Generates new optimized settlements from current balances
 * - Saves them in DB with status "pending"
 * - Returns created settlements
 */
const optimizeSettlements = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to optimize settlements for this group'
      });
    }

    const balances = await Split.getGroupBalances(groupId);
    const balanceInput = balances.map((b) => ({
      userId: b.userId,
      balance: Number(b.balance)
    }));
    const transactions = computeOptimizedSettlements(balanceInput);

    await Settlement.deleteMany({ groupId: new mongoose.Types.ObjectId(groupId), status: 'pending' });

    if (transactions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No settlements needed; balances are already settled',
        data: { settlements: [] }
      });
    }

    const settlementsToCreate = transactions.map((t) => ({
      groupId,
      fromUserId: t.from,
      toUserId: t.to,
      amount: t.amount,
      totalAmount: t.amount,
      totalPaid: 0,
      remainingAmount: t.amount,
      status: 'pending'
    }));

    const created = await Settlement.insertMany(settlementsToCreate);
    const populated = await Settlement.find({ _id: { $in: created.map((c) => c._id) } })
      .populate('fromUserId', 'firstName lastName username')
      .populate('toUserId', 'firstName lastName username')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Optimized settlements generated',
      data: { settlements: populated }
    });
  } catch (error) {
    next(error);
  }
};

// Alias: create settlements from expense-only balances (same as optimize)
const createSettlementsFromBalances = optimizeSettlements;

module.exports = {
  createGroup,
  getUserGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  setMemberAdmin,
  leaveGroup,
  getGroupBalances,
  getGroupSettlements,
  getOptimizedSettlements,
  optimizeSettlements,
  createSettlementsFromBalances
};