
// ==========================================
// WYNBERG PUBLIC LIBRARY - FINES API
// ==========================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Fine charged per overdue day
const FINE_PER_DAY = 5.00;

// ==========================================
// 1. CALCULATE AND UPDATE OVERDUE FINES
// ==========================================

async function updateOverdueFines() {

    // Find all borrowings that are overdue or were
    // returned after their due date.
    const [overdueBorrowings] = await db.query(`
        SELECT
            borrowing_id,
            GREATEST(
                DATEDIFF(
                    COALESCE(return_date, CURDATE()),
                    due_date
                ),
                0
            ) AS overdue_days
        FROM borrowings
        WHERE DATEDIFF(
            COALESCE(return_date, CURDATE()),
            due_date
        ) > 0
    `);

    for (const borrowing of overdueBorrowings) {

        const fineAmount =
            borrowing.overdue_days * FINE_PER_DAY;

        // Create a fine or update an existing unpaid fine.
        await db.query(`
            INSERT INTO fines
                (borrowing_id, amount, status)
            VALUES (?, ?, 'Unpaid')
            ON DUPLICATE KEY UPDATE
                amount = IF(status = 'Unpaid', ?, amount)
        `, [
            borrowing.borrowing_id,
            fineAmount,
            fineAmount
        ]);
    }
}

// ==========================================
// 2. GET ALL FINES
// ==========================================

router.get('/', async (req, res) => {
    try {

        // Refresh overdue fine calculations first.
        await updateOverdueFines();

        const [fines] = await db.query(`
            SELECT
                f.fine_id,
                f.borrowing_id,
                f.amount,
                f.status,
                br.member_id,
                br.book_id,
                br.borrow_date,
                br.due_date,
                br.return_date,
                m.full_name AS member_name,
                b.title AS book_title,
                GREATEST(
                    DATEDIFF(
                        COALESCE(br.return_date, CURDATE()),
                        br.due_date
                    ),
                    0
                ) AS overdue_days
            FROM fines f
            JOIN borrowings br
                ON f.borrowing_id = br.borrowing_id
            JOIN members m
                ON br.member_id = m.member_id
            JOIN books b
                ON br.book_id = b.book_id
            ORDER BY f.fine_id DESC
        `);

        res.json({
            success: true,
            fines: fines
        });

    } catch (error) {
        console.error('Error fetching fines:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve fines.'
        });
    }
});

// ==========================================
// 3. GET ONE FINE
// ==========================================

router.get('/:id', async (req, res) => {
    try {

        await updateOverdueFines();

        const [fines] = await db.query(`
            SELECT
                f.*,
                br.member_id,
                br.book_id,
                br.due_date,
                br.return_date,
                m.full_name AS member_name,
                b.title AS book_title
            FROM fines f
            JOIN borrowings br
                ON f.borrowing_id = br.borrowing_id
            JOIN members m
                ON br.member_id = m.member_id
            JOIN books b
                ON br.book_id = b.book_id
            WHERE f.fine_id = ?
        `, [req.params.id]);

        if (fines.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Fine record not found.'
            });
        }

        res.json({
            success: true,
            fine: fines[0]
        });

    } catch (error) {
        console.error('Error fetching fine:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve fine.'
        });
    }
});

// ==========================================
// 4. MARK A FINE AS PAID
// ==========================================

router.put('/:id/pay', async (req, res) => {
    try {

        // Find the fine and its borrowing record.
        const [fines] = await db.query(`
            SELECT
                f.fine_id,
                f.status,
                br.return_date
            FROM fines f
            JOIN borrowings br
                ON f.borrowing_id = br.borrowing_id
            WHERE f.fine_id = ?
        `, [req.params.id]);

        if (fines.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Fine record not found.'
            });
        }

        if (fines[0].status === 'Paid') {
            return res.status(400).json({
                success: false,
                message: 'This fine has already been paid.'
            });
        }

        // Only allow payment after the book is returned.
        if (!fines[0].return_date) {
            return res.status(400).json({
                success: false,
                message: 'The book must be returned before its fine can be paid.'
            });
        }

        await db.query(
            `UPDATE fines
             SET status = 'Paid'
             WHERE fine_id = ?`,
            [req.params.id]
        );

        res.json({
            success: true,
            message: 'Fine marked as paid successfully!'
        });

    } catch (error) {
        console.error('Error updating fine:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not update fine payment.'
        });
    }
});

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
