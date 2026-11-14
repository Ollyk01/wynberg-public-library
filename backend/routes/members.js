
// ==========================================
// WYNBERG PUBLIC LIBRARY - MEMBERS API
// ==========================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ==========================================
// 1. GET ALL MEMBERS
// ==========================================

router.get('/', async (req, res) => {
    try {
        const [members] = await db.query(
            'SELECT * FROM members ORDER BY member_id DESC'
        );

        res.json({
            success: true,
            members: members
        });

    } catch (error) {
        console.error('Error fetching members:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve members.'
        });
    }
});

// ==========================================
// 2. GET ONE MEMBER
// ==========================================

router.get('/:id', async (req, res) => {
    try {
        const [members] = await db.query(
            'SELECT * FROM members WHERE member_id = ?',
            [req.params.id]
        );

        if (members.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Member not found.'
            });
        }

        res.json({
            success: true,
            member: members[0]
        });

    } catch (error) {
        console.error('Error fetching member:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve member.'
        });
    }
});

// ==========================================
// 3. ADD A NEW MEMBER
// ==========================================

router.post('/', async (req, res) => {
    try {
        const {
            full_name,
            email,
            phone,
            address,
            membership_date
        } = req.body;

        // Validate required fields
        if (!full_name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Full name and email are required.'
            });
        }

        const [result] = await db.query(
            `INSERT INTO members
            (full_name, email, phone, address, membership_date)
            VALUES (?, ?, ?, ?, COALESCE(?, CURDATE()))`,
            [
                full_name.trim(),
                email.trim().toLowerCase(),
                phone || null,
                address || null,
                membership_date || null
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Member registered successfully!',
            member_id: result.insertId
        });

    } catch (error) {
        console.error('Error adding member:', error.message);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'A member with this email address already exists.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Could not register member.'
        });
    }
});

// ==========================================
// 4. UPDATE MEMBER DETAILS
// ==========================================

router.put('/:id', async (req, res) => {
    try {
        const {
            full_name,
            email,
            phone,
            address,
            status
        } = req.body;

        if (!full_name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Full name and email are required.'
            });
        }

        if (status && !['Active', 'Inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid member status.'
            });
        }

        const [result] = await db.query(
            `UPDATE members SET
                full_name = ?,
                email = ?,
                phone = ?,
                address = ?,
                status = COALESCE(?, status)
             WHERE member_id = ?`,
            [
                full_name.trim(),
                email.trim().toLowerCase(),
                phone || null,
                address || null,
                status || null,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            const [existing] = await db.query(
                'SELECT member_id FROM members WHERE member_id = ?',
                [req.params.id]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Member not found.'
                });
            }
        }

        res.json({
            success: true,
            message: 'Member details updated successfully!'
        });

    } catch (error) {
        console.error('Error updating member:', error.message);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Another member already uses this email address.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Could not update member.'
        });
    }
});

// ==========================================
// 5. DELETE A MEMBER
// ==========================================

router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM members WHERE member_id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Member not found.'
            });
        }

        res.json({
            success: true,
            message: 'Member deleted successfully!'
        });

    } catch (error) {
        console.error('Error deleting member:', error.message);

        res.status(409).json({
            success: false,
            message: 'This member cannot be deleted because they have existing borrowing or reservation records.'
        });
    }
});

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
