require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const Settlement = require('../models/Settlement');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Split = require('../models/Split');

const clearSettlementsAndExpenses = async () => {
  try {
    // Connect to database
    await connectDB();
    
    console.log('🗑️  Clearing settlements and expenses...');
    
    // Delete all payments first (they reference settlements)
    const paymentResult = await Payment.deleteMany({});
    console.log(`✅ Deleted ${paymentResult.deletedCount} payment(s)`);
    
    // Delete all settlements
    const settlementResult = await Settlement.deleteMany({});
    console.log(`✅ Deleted ${settlementResult.deletedCount} settlement(s)`);
    
    // Delete all splits (they reference expenses)
    const splitResult = await Split.deleteMany({});
    console.log(`✅ Deleted ${splitResult.deletedCount} split(s)`);
    
    // Delete all expenses
    const expenseResult = await Expense.deleteMany({});
    console.log(`✅ Deleted ${expenseResult.deletedCount} expense(s)`);
    
    console.log('\n✅ Successfully cleared all settlements and expenses!');
    console.log('💡 Balances will be recalculated on next query');
    
  } catch (error) {
    console.error('❌ Error clearing settlements and expenses:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

clearSettlementsAndExpenses();
