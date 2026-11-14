
// ==========================================
// WYNBERG PUBLIC LIBRARY - RESERVATIONS API
// ==========================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ==========================================
// 1. GET ALL RESERVATIONS
// ==========================================

router.get('/', async (req, res) => {
    try {
        const [reservations] = await db.query(`
            SELECT
                r.reservation_id,
                r.member_id,
                r.book_id,
                r.reservation_date,
                r.status,
                m.full_name AS member_name,
                b.title AS book_title,
                b.author AS book_author
            FROM reservations r
            JOIN members m ON r.member_id = m.member_id
            JOIN books b ON r.book_id = b.book_id
            ORDER BY r.reservation_id DESC
        `);

        res.json({
            success: true,
            reservations: reservations
        });

    } catch (error) {
        console.error('Error fetching reservations:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve reservations.'
        });
    }
});

// ==========================================
// 2. GET ONE RESERVATION
// ==========================================

router.get('/:id', async (req, res) => {
    try {
        const [reservations] = await db.query(`
            SELECT
                r.*,
                m.full_name AS member_name,
                b.title AS book_title,
                b.author AS book_author
            FROM reservations r
            JOIN members m ON r.member_id = m.member_id
            JOIN books b ON r.book_id = b.book_id
            WHERE r.reservation_id = ?
        `, [req.params.id]);

        if (reservations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found.'
            });
        }

        res.json({
            success: true,
            reservation: reservations[0]
        });

    } catch (error) {
        console.error('Error fetching reservation:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve reservation.'
        });
    }
});

// ==========================================
// 3. CREATE A RESERVATION
// ==========================================

router.post('/', async (req, res) => {
    try {
        const { member_id, book_id } = req.body;

        if (!member_id || !book_id) {
            return res.status(400).json({
                success: false,
                message: 'Member ID and book ID are required.'
            });
        }

        // Check that the member exists and is active
        const [members] = await db.query(
            `SELECT member_id FROM members
             WHERE member_id = ? AND status = 'Active'`,
            [member_id]
        );

        if (members.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Member does not exist or is inactive.'
            });
        }

        // Check that the book exists
        const [books] = await db.query(
            'SELECT book_id FROM books WHERE book_id = ?',
            [book_id]
        );

        if (books.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found.'
            });
        }

        // Check for an existing active reservation
        const [existing] = await db.query(
            `SELECT reservation_id FROM reservations
             WHERE member_id = ?
             AND book_id = ?
             AND status IN ('Pending', 'Ready')`,
            [member_id, book_id]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'This member already has an active reservation for this book.'
            });
        }

        // Create reservation
        const [result] = await db.query(
            `INSERT INTO reservations
             (member_id, book_id, reservation_date, status)
             VALUES (?, ?, CURDATE(), 'Pending')`,
            [member_id, book_id]
        );

        res.status(201).json({
            success: true,
            message: 'Reservation created successfully!',
            reservation_id: result.insertId
        });

    } catch (error) {
        console.error('Error creating reservation:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not create reservation.'
        });
    }
});

// ==========================================
// 4. UPDATE RESERVATION STATUS
// ==========================================

router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            'Pending',
            'Ready',
            'Collected',
            'Cancelled'
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reservation status.'
            });
        }

        const [result] = await db.query(
            `UPDATE reservations
             SET status = ?
             WHERE reservation_id = ?`,
            [status, req.params.id]
        );

        if (result.affectedRows === 0) {
            const [existing] = await db.query(
                'SELECT reservation_id FROM reservations WHERE reservation_id = ?',
                [req.params.id]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Reservation not found.'
                });
            }
        }

        res.json({
            success: true,
            message: 'Reservation status updated successfully!'
        });

    } catch (error) {
        console.error('Error updating reservation:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not update reservation.'
        });
    }
});

// ==========================================
// 5. CANCEL A RESERVATION
// ==========================================

router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query(
            `UPDATE reservations
             SET status = 'Cancelled'
             WHERE reservation_id = ?
             AND status IN ('Pending', 'Ready')`,
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found or can no longer be cancelled.'
            });
        }

        res.json({
            success: true,
            message: 'Reservation cancelled successfully!'
        });

    } catch (error) {
        console.error('Error cancelling reservation:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not cancel reservation.'
        });
    }
});

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
