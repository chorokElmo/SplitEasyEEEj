const Joi = require('joi');

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    // For params validation, we need to validate each param individually
    // since Joi.string() validates a single value, not an object
    if (property === 'params') {
      // Get the param name from the route (userId, requestId, friendshipId, etc.)
      const paramNames = Object.keys(req.params);
      
      // Validate each param
      for (const paramName of paramNames) {
        const paramValue = req.params[paramName];
        
        // Convert to string if needed (Express params should already be strings, but ensure it)
        let stringValue = paramValue;
        if (paramValue != null) {
          // If it's already a string, use it; otherwise convert
          if (typeof paramValue !== 'string') {
            stringValue = String(paramValue);
          }
        } else {
          // If paramValue is null or undefined, it will fail required validation
          stringValue = '';
        }
        
        // Validate using the schema
        const { error } = schema.validate(stringValue, { abortEarly: false });
        
        if (error) {
          const errors = error.details.map(detail => ({
            field: paramName,
            message: detail.message
          }));
          
          let errorMessage = 'Validation error';
          if (errors.length === 1) {
            const errorMsg = errors[0].message.toLowerCase();
            if (errorMsg.includes('pattern') || errorMsg.includes('objectid')) {
              errorMessage = `Invalid ${paramName} format. ${paramName} must be a valid MongoDB ObjectId (24 hex characters).`;
            } else if (errorMsg.includes('required')) {
              errorMessage = `${paramName} is required.`;
            } else if (errorMsg.includes('string.base') || errorMsg.includes('must be a string') || errorMsg.includes('value must be a string')) {
              errorMessage = `${paramName} must be a string. Received: ${typeof paramValue}`;
            } else {
              errorMessage = errors[0].message;
            }
          }
          
          return res.status(400).json({
            success: false,
            message: errorMessage,
            errors: errors.length > 1 ? errors : undefined
          });
        }
      }
      
      // All params validated successfully
      return next();
    }
    
    // For body/query validation, use the original logic
    const { error } = schema.validate(req[property], { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      // For ObjectId validation, provide a clearer message
      const isObjectIdError = errors.some(e => 
        e.message.includes('pattern') || 
        e.message.includes('required') ||
        e.field.includes('userId') ||
        e.field.includes('requestId') ||
        e.field.includes('friendshipId')
      );
      
      let errorMessage = 'Validation error';
      if (isObjectIdError && errors.length === 1) {
        const field = errors[0].field || 'ID';
        if (errors[0].message.includes('pattern')) {
          errorMessage = `Invalid ${field} format. ${field} must be a valid MongoDB ObjectId (24 hex characters).`;
        } else if (errors[0].message.includes('required')) {
          errorMessage = `${field} is required.`;
        } else {
          errorMessage = errors[0].message;
        }
      } else if (errors.length === 1) {
        errorMessage = errors[0].message;
      }
      
      return res.status(400).json({
        success: false,
        message: errorMessage,
        errors: errors.length > 1 ? errors : undefined
      });
    }
    
    next();
  };
};

// Common validation schemas
const schemas = {
  // User schemas
  userRegister: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).optional(),
    gender: Joi.string().valid('Male', 'Female').optional()
  }),

  userLogin: Joi.object({
    email: Joi.string().optional(),
    username: Joi.string().optional(),
    password: Joi.string().required()
  }).or('email', 'username'), // At least one of email or username is required

  userUpdate: Joi.object({
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).optional(),
    gender: Joi.string().valid('Male', 'Female').optional(),
    globalSettlementMode: Joi.string().valid('separate', 'auto_adjust', 'hybrid').optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  }),

  // Chat schemas
  messageSend: Joi.object({
    content: Joi.string().min(1).max(2000).required(),
    messageType: Joi.string().valid('text', 'image', 'file').optional()
  }),

  // Group schemas
  groupCreate: Joi.object({
    title: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    type: Joi.string().max(50).optional(),
    currency: Joi.string().length(3).default('USD').optional(),
    member_ids: Joi.array().items(Joi.string().hex().length(24)).optional()
  }),

  groupUpdate: Joi.object({
    title: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional(),
    type: Joi.string().max(50).optional(),
    currency: Joi.string().length(3).optional()
  }),

  setMemberAdmin: Joi.object({
    isAdmin: Joi.boolean().required()
  }),

  // Chat schemas
  messageSend: Joi.object({
    content: Joi.string().min(1).max(2000).required(),
    messageType: Joi.string().valid('text', 'image', 'file').optional()
  }),

  // Expense schemas
  expenseCreate: Joi.object({
    groupId: Joi.string().hex().length(24).required(),
    payerId: Joi.string().hex().length(24).optional(),
    description: Joi.string().min(1).max(200).required(),
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().length(3).default('USD').optional(),
    category: Joi.string().max(50).optional(),
    walletId: Joi.string().hex().length(24).optional(),
    splitType: Joi.string().valid('equal', 'exact', 'percentage').default('equal').optional(),
    note: Joi.string().max(500).optional(),
    expenseDate: Joi.date().iso().optional(),
    splitMemberIds: Joi.array().items(Joi.string().hex().length(24)).optional(),
    splits: Joi.array().items(
      Joi.object({
        userId: Joi.string().hex().length(24).required(),
        shareAmount: Joi.number().positive().precision(2).required()
      })
    ).optional()
  }),

  expenseUpdate: Joi.object({
    groupId: Joi.string().hex().length(24).optional(),
    payerId: Joi.string().hex().length(24).optional(),
    description: Joi.string().min(1).max(200).optional(),
    amount: Joi.number().positive().precision(2).optional(),
    currency: Joi.string().length(3).optional(),
    category: Joi.string().max(50).optional(),
    walletId: Joi.string().hex().length(24).optional(),
    splitType: Joi.string().valid('equal', 'exact', 'percentage').optional(),
    note: Joi.string().max(500).optional(),
    expenseDate: Joi.date().iso().optional(),
    splitMemberIds: Joi.array().items(Joi.string().hex().length(24)).optional(),
    splits: Joi.array().items(
      Joi.object({
        userId: Joi.string().hex().length(24).required(),
        shareAmount: Joi.number().positive().precision(2).required()
      })
    ).optional()
  }),

  // Wallet schemas
  walletCreate: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    category: Joi.string().valid('cash', 'bank', 'credit_card', 'other').required(),
    balance: Joi.number().precision(2).default(0).optional()
  }),

  walletUpdate: Joi.object({
    name: Joi.string().min(1).max(50).optional(),
    category: Joi.string().valid('cash', 'bank', 'credit_card', 'other').optional(),
    balance: Joi.number().precision(2).optional()
  }),

  walletTransfer: Joi.object({
    fromWalletId: Joi.string().hex().length(24).required(),
    toWalletId: Joi.string().hex().length(24).required(),
    amount: Joi.number().positive().precision(2).required(),
    description: Joi.string().max(200).optional()
  }),

  // Settlement schemas
  settlementRecord: Joi.object({
    fromUserId: Joi.string().hex().length(24).required(),
    toUserId: Joi.string().hex().length(24).required(),
    amount: Joi.number().positive().precision(2).required(),
    message: Joi.string().max(200).optional()
  }),

  settlementResponse: Joi.object({
    status: Joi.string().valid('accepted', 'rejected').required(),
    rejectedReason: Joi.string().max(200).optional()
  }),

  payPartAmount: Joi.object({
    amount: Joi.number().positive().precision(2).required()
  }),

  payAmountOptional: Joi.object({
    amount: Joi.number().positive().precision(2).optional()
  }),

  // Query parameter schemas
  pagination: Joi.object({
    page: Joi.string().pattern(/^\d+$/).optional().default('1'),
    limit: Joi.string().pattern(/^\d+$/).optional().default('20'),
    category: Joi.string().optional(),
    payerId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    startDate: Joi.string().isoDate().optional(),
    endDate: Joi.string().isoDate().optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional()
  }),

  // MongoDB ObjectId validation
  objectId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'must be a valid MongoDB ObjectId (24 hex characters)',
      'any.required': 'is required',
      'string.empty': 'cannot be empty'
    })
};

module.exports = {
  validate,
  schemas
};