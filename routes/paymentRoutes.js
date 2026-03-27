/**
 * PAYMENT ROUTES
 * Base: /api/payments
 */
const express = require('express');
const router  = express.Router();
const { createOrder, verifyPayment, mockPay } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/create-order', createOrder);   // POST /api/payments/create-order
router.post('/verify',       verifyPayment); // POST /api/payments/verify
router.post('/mock-pay',     mockPay);       // POST /api/payments/mock-pay (dev only)

module.exports = router;
