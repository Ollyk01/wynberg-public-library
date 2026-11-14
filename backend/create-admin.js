
// ==========================================
// WYNBERG PUBLIC LIBRARY - CREATE ADMIN
// ==========================================

require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('./config/database');

// ==========================================
// ADMINISTRATOR DETAILS
// Change these details before running.
// ==========================================

const adminName = 'Olly Smith';
const adminEmail = 'admin@wynberglibrary.co.za';
const adminPassword = 'Jackie014!';

// ==========================================
// CREATE ADMINISTRATOR
// ==========================================

async function createAdmin() {
    try {

        // Check whether the email already exists
        const [existing] = await db.query(
            'SELECT admin_id FROM admins WHERE email = ?',
            [adminEmail]
        );

        if (existing.length > 0) {
            console.log('An administrator with this email already exists.');
            return;
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(adminPassword, 12);

        // Save administrator in MySQL
        await db.query(
            `INSERT INTO admins
            (full_name, email, password_hash)
            VALUES (?, ?, ?)`,
            [adminName, adminEmail, passwordHash]
        );

        console.log('Administrator account created successfully!');
        console.log('Email:', adminEmail);

    } catch (error) {
        console.error('Error creating administrator:', error.message);

    } finally {
        await db.end();
    }
}

createAdmin();
