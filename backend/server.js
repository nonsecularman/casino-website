const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/casino');

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    upiId: { type: String, required: true },
    password: { type: String, required: true },
    uniqueId: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0 },
    referralCode: { type: String },
    referredBy: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Transaction Schema
const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['deposit', 'withdrawal', 'win', 'loss'], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    merchantOrderNo: String,
    payoutId: String,
    createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// JWT Middleware
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, message: 'No token' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, phone, upiId, password, uniqueId, referralCode } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.json({ success: false, message: 'Phone number already registered' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = new User({
            name,
            phone,
            upiId,
            password: hashedPassword,
            uniqueId,
            referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            referredBy: referralCode || null,
            balance: referralCode ? 50 : 0 // Bonus for using referral
        });
        
        await user.save();
        
        // Generate token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key');
        
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                uniqueId: user.uniqueId,
                balance: user.balance,
                upiId: user.upiId,
                phone: user.phone
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        const user = await User.findOne({ phone });
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.json({ success: false, message: 'Invalid password' });
        }
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key');
        
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                uniqueId: user.uniqueId,
                balance: user.balance,
                upiId: user.upiId,
                phone: user.phone
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// Wallet Routes
app.post('/api/wallet/deposit', authMiddleware, async (req, res) => {
    try {
        const { amount } = req.body;
        // Integrate with your payment gateway here
        // Return payment URL
        res.json({ success: true, paymentUrl: 'https://your-payment-gateway.com/pay' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// Withdrawal using YOUR BladePay API
app.post('/api/wallet/withdraw', authMiddleware, async (req, res) => {
    try {
        const { amount, upiId, userName, userPhone } = req.body;
        const user = await User.findById(req.userId);
        
        if (user.balance < amount) {
            return res.json({ success: false, message: 'Insufficient balance' });
        }
        
        // Generate unique order number
        const merchantOrderNo = `UPI-WD-${Date.now()}`;
        
        // Call BladePay API with YOUR credentials
        const payoutResponse = await axios.post('https://api.bladepay.pro/merchant/api/payout/create', {
            merchantOrderNo: merchantOrderNo,
            version: 'V3',
            amount: amount.toFixed(2),
            cashNumber: upiId,
            cashName: userName,
            cashPhone: userPhone,
            notifyUrl: `${process.env.BASE_URL}/api/webhook/payout`
        }, {
            headers: { 
                'Authorization': `Bearer ${process.env.BLADEPAY_API_KEY || 'gw_8c2c7aed2861daf80574db85f5254c5ccaa85069dcaf9e6c8d81811316b71ef9'}` 
            }
        });
        
        if (payoutResponse.data.code === 200) {
            // Deduct balance
            user.balance -= amount;
            await user.save();
            
            // Create transaction record
            const transaction = new Transaction({
                userId: user._id,
                type: 'withdrawal',
                amount: amount,
                status: 'pending',
                merchantOrderNo: merchantOrderNo,
                payoutId: payoutResponse.data.data?.payoutId
            });
            await transaction.save();
            
            res.json({
                success: true,
                payoutId: payoutResponse.data.data?.payoutId,
                message: 'Withdrawal initiated successfully'
            });
        } else {
            res.json({ success: false, message: payoutResponse.data.msg || 'Payout failed' });
        }
    } catch (error) {
        console.error('Withdrawal error:', error.response?.data || error.message);
        res.json({ success: false, message: 'Withdrawal processing failed' });
    }
});

// Webhook for BladePay callbacks
app.post('/api/webhook/payout', async (req, res) => {
    try {
        const { merchantOrderNo, status, amount } = req.body;
        
        const transaction = await Transaction.findOne({ merchantOrderNo });
        if (transaction) {
            transaction.status = status === 'success' ? 'completed' : 'failed';
            await transaction.save();
            
            // If failed, refund the user
            if (status !== 'success') {
                const user = await User.findById(transaction.userId);
                user.balance += parseFloat(amount);
                await user.save();
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Get user data
app.get('/api/user', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        res.json({ success: true, user });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
