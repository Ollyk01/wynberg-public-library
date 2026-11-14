
// ==========================================
// WYNBERG PUBLIC LIBRARY - BORROWINGS API
// ==========================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ==========================================
// 1. GET ALL BORROWING RECORDS
// ==========================================

router.get('/', async (req, res) => {
    try {
        const [borrowings] = await db.query(`
            SELECT
                br.borrowing_id,
                br.member_id,
                br.book_id,
                br.borrow_date,
                br.due_date,
                br.return_date,
                CASE
                    WHEN br.status = 'Returned' THEN 'Returned'
                    WHEN br.due_date < CURDATE() THEN 'Overdue'
                    ELSE 'Borrowed'
                END AS status,
                m.full_name AS member_name,
                b.title AS book_title,
                b.author AS book_author
            FROM borrowings br
            JOIN members m ON br.member_id = m.member_id
            JOIN books b ON br.book_id = b.book_id
            ORDER BY br.borrowing_id DESC
        `);

        res.json({
            success: true,
            borrowings: borrowings
        });

    } catch (error) {
        console.error('Error fetching borrowings:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve borrowing records.'
        });
    }
});

// ==========================================
// 2. GET ONE BORROWING RECORD
// ==========================================

router.get('/:id', async (req, res) => {
    try {
        const [borrowings] = await db.query(`
            SELECT
                br.*,
                m.full_name AS member_name,
                b.title AS book_title
            FROM borrowings br
            JOIN members m ON br.member_id = m.member_id
            JOIN books b ON br.book_id = b.book_id
            WHERE br.borrowing_id = ?
        `, [req.params.id]);

        if (borrowings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Borrowing record not found.'
            });
        }

        res.json({
            success: true,
            borrowing: borrowings[0]
        });

    } catch (error) {
        console.error('Error fetching borrowing:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve borrowing record.'
        });
    }
});

// ==========================================
// 3. RECORD A BOOK BORROWING
// ==========================================

router.post('/', async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { member_id, book_id, due_date } = req.body;

        if (!member_id || !book_id || !due_date) {
            return res.status(400).json({
                success: false,
                message: 'Member, book and due date are required.'
            });
        }

        // Validate due date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide the due date in YYYY-MM-DD format.'
            });
        }

        const parsedDate = new Date(`${due_date}T00:00:00Z`);

        if (
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== due_date
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid due date.'
            });
        }

        await connection.beginTransaction();

        // Check that the member exists and is active
        const [members] = await connection.query(
            'SELECT * FROM members WHERE member_id = ? FOR UPDATE',
            [member_id]
        );

        if (members.length === 0 || members[0].status !== 'Active') {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'Member does not exist or is inactive.'
            });
        }

        // Check book availability
        const [books] = await connection.query(
            'SELECT * FROM books WHERE book_id = ? FOR UPDATE',
            [book_id]
        );

        if (books.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Book not found.'
            });
        }

        if (books[0].available_copies < 1) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'No copies of this book are currently available.'
            });
        }

        // Record the borrowing
        const [result] = await connection.query(
            `INSERT INTO borrowings
            (member_id, book_id, borrow_date, due_date, status)
            VALUES (?, ?, CURDATE(), ?, 'Borrowed')`,
            [member_id, book_id, due_date]
        );

        // Reduce available book copies
        await connection.query(
            `UPDATE books
             SET available_copies = available_copies - 1
             WHERE book_id = ?`,
            [book_id]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Book borrowed successfully!',
            borrowing_id: result.insertId
        });

    } catch (error) {
        await connection.rollback();

        console.error('Error recording borrowing:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not record book borrowing.'
        });

    } finally {
        connection.release();
    }
});

// ==========================================
// 4. RECORD A BOOK RETURN
// ==========================================

router.put('/:id/return', async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Find and lock the borrowing record
        const [borrowings] = await connection.query(
            `SELECT * FROM borrowings
             WHERE borrowing_id = ?
             FOR UPDATE`,
            [req.params.id]
        );

        if (borrowings.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Borrowing record not found.'
            });
        }

        const borrowing = borrowings[0];

        if (borrowing.status === 'Returned') {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'This book has already been returned.'
            });
        }

        // Mark the borrowing as returned
        await connection.query(
            `UPDATE borrowings
             SET return_date = CURDATE(),
                 status = 'Returned'
             WHERE borrowing_id = ?`,
            [req.params.id]
        );

        // Restore available book copies
        await connection.query(
            `UPDATE books
             SET available_copies = available_copies + 1
             WHERE book_id = ?`,
            [borrowing.book_id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Book returned successfully!'
        });

    } catch (error) {
        await connection.rollback();

        console.error('Error returning book:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not process book return.'
        });

    } finally {
        connection.release();
    }
});

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
