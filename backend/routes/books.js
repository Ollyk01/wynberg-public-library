
// ==========================================
// WYNBERG PUBLIC LIBRARY - BOOKS API
// ==========================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ==========================================
// 1. GET ALL BOOKS
// ==========================================

router.get('/', async (req, res) => {
    try {
        const [books] = await db.query(
            'SELECT * FROM books ORDER BY book_id DESC'
        );

        res.json({
            success: true,
            books: books
        });

    } catch (error) {
        console.error('Error fetching books:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve books.'
        });
    }
});

// ==========================================
// 2. GET ONE BOOK
// ==========================================

router.get('/:id', async (req, res) => {
    try {
        const [books] = await db.query(
            'SELECT * FROM books WHERE book_id = ?',
            [req.params.id]
        );

        if (books.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found.'
            });
        }

        res.json({
            success: true,
            book: books[0]
        });

    } catch (error) {
        console.error('Error fetching book:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not retrieve book.'
        });
    }
});

// ==========================================
// 3. ADD A NEW BOOK
// ==========================================

router.post('/', async (req, res) => {
    try {
        const {
            title,
            author,
            isbn,
            category,
            publisher,
            publication_year,
            total_copies
        } = req.body;

        // Validate required fields
        if (!title || !author || !total_copies) {
            return res.status(400).json({
                success: false,
                message: 'Title, author and total copies are required.'
            });
        }

        const copies = Number(total_copies);

        if (!Number.isInteger(copies) || copies < 1) {
            return res.status(400).json({
                success: false,
                message: 'Total copies must be a positive whole number.'
            });
        }

        const [result] = await db.query(
            `INSERT INTO books
            (title, author, isbn, category, publisher,
             publication_year, total_copies, available_copies)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                author.trim(),
                isbn || null,
                category || null,
                publisher || null,
                publication_year || null,
                copies,
                copies
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Book added successfully!',
            book_id: result.insertId
        });

    } catch (error) {
        console.error('Error adding book:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not add book. Check whether the ISBN already exists.'
        });
    }
});

// ==========================================
// 4. UPDATE A BOOK
// ==========================================

router.put('/:id', async (req, res) => {
    try {
        const {
            title,
            author,
            isbn,
            category,
            publisher,
            publication_year,
            total_copies
        } = req.body;

        if (!title || !author || total_copies === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Title, author and total copies are required.'
            });
        }

        const copies = Number(total_copies);

        if (!Number.isInteger(copies) || copies < 1) {
            return res.status(400).json({
                success: false,
                message: 'Total copies must be a positive whole number.'
            });
        }

        // Check that the book exists
        const [existing] = await db.query(
            'SELECT * FROM books WHERE book_id = ?',
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found.'
            });
        }

        const book = existing[0];

        // Calculate how many copies are currently borrowed
        const borrowedCopies =
            book.total_copies - book.available_copies;

        if (copies < borrowedCopies) {
            return res.status(400).json({
                success: false,
                message: 'Total copies cannot be less than the number currently borrowed.'
            });
        }

        const availableCopies = copies - borrowedCopies;

        await db.query(
            `UPDATE books SET
                title = ?,
                author = ?,
                isbn = ?,
                category = ?,
                publisher = ?,
                publication_year = ?,
                total_copies = ?,
                available_copies = ?
             WHERE book_id = ?`,
            [
                title.trim(),
                author.trim(),
                isbn || null,
                category || null,
                publisher || null,
                publication_year || null,
                copies,
                availableCopies,
                req.params.id
            ]
        );

        res.json({
            success: true,
            message: 'Book updated successfully!'
        });

    } catch (error) {
        console.error('Error updating book:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not update book.'
        });
    }
});

// ==========================================
// 5. DELETE A BOOK
// ==========================================

router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM books WHERE book_id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found.'
            });
        }

        res.json({
            success: true,
            message: 'Book deleted successfully!'
        });

    } catch (error) {
        console.error('Error deleting book:', error.message);

        res.status(409).json({
            success: false,
            message: 'This book cannot be deleted because it is linked to existing borrowing or reservation records.'
        });
    }
});

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
