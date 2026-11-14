
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

/* =====admin login==== */

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        const [admins] = await db.query(
            'SELECT * FROM admins WHERE email = ?',
            [email.trim().toLowerCase()]
        );

        if (admins.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const admin = admins[0];
        const passwordMatches = await bcrypt.compare(
            password,
            admin.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        req.session.admin = {
            admin_id: admin.admin_id,
            full_name: admin.full_name,
            email: admin.email
        };

        res.json({
            success: true,
            message: 'Login successful!',
            admin: req.session.admin
        });

    } catch (error) {
        console.error('Admin login error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not process login.'
        });
    }
});

/* =====check admin session==== */

router.get('/me', (req, res) => {
    if (!req.session.admin) {
        return res.status(401).json({
            success: false,
            message: 'You are not logged in.'
        });
    }

    res.json({
        success: true,
        admin: req.session.admin
    });
});

/* =====customer login==== */

router.post('/customer/login', async (req, res) => {
    try {
        const { identity, password } = req.body;

        if (!identity || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email or library card number and password are required.'
            });
        }

        const loginIdentity = identity.trim();
        const cardMatch = loginIdentity.match(/^WPL0*(\d+)$/i);

        let query;
        let values;

        if (cardMatch) {
            query = 'SELECT * FROM members WHERE member_id = ?';
            values = [Number(cardMatch[1])];
        } else {
            query = 'SELECT * FROM members WHERE email = ?';
            values = [loginIdentity.toLowerCase()];
        }

        const [members] = await db.query(query, values);

        if (members.length === 0 || !members[0].password_hash) {
            return res.status(401).json({
                success: false,
                message: 'Invalid login details or customer password has not been set.'
            });
        }

        const customer = members[0];

        if (customer.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'Your library account is inactive. Please contact the library.'
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            customer.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: 'Invalid login details.'
            });
        }

        req.session.customer = {
            member_id: customer.member_id,
            full_name: customer.full_name,
            email: customer.email
        };

        res.json({
            success: true,
            message: 'Customer login successful!',
            customer: req.session.customer
        });

    } catch (error) {
        console.error('Customer login error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not process customer login.'
        });
    }
});

/* =====check customer session==== */

router.get('/customer/me', (req, res) => {
    if (!req.session.customer) {
        return res.status(401).json({
            success: false,
            message: 'You are not logged in.'
        });
    }

    res.json({
        success: true,
        customer: req.session.customer
    });
});

/* =====customer logout==== */

router.post('/customer/logout', (req, res) => {
    delete req.session.customer;

    req.session.save((error) => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Could not log out.'
            });
        }

        res.json({
            success: true,
            message: 'Customer logged out successfully!'
        });
    });
});

/* =====admin logout==== */

router.post('/logout', (req, res) => {
    delete req.session.admin;

    req.session.save((error) => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Could not log out.'
            });
        }

        res.json({
            success: true,
            message: 'Logged out successfully!'
        });
    });
});

module.exports = router;
