// Load environment variables
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');

// Import database connection
const db = require('./config/database');
// Import API routes
const booksRoutes = require('./routes/books');
const membersRoutes = require('./routes/members');
const borrowingsRoutes = require('./routes/borrowings');
const reservationsRoutes = require('./routes/reservations');
const finesRoutes = require('./routes/fines');
const authRoutes = require('./routes/auth');

// Initialise Express
const app = express();

// Define the server port
const PORT = 3000;

// Middleware
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========session configuration=============================

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 2
    }
}));

// Register API routes
app.use('/api/books', booksRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/borrowings', borrowingsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/fines', finesRoutes);
app.use('/api/auth', authRoutes);

// ==============test route ========================

app.get('/', (req, res) => {
    res.json({
        message: 'Wynberg Public Library API is running!'
    });
});

// =======================database connection test==============================

app.get('/api/test-db', async (req, res) => {
    try {
        const [result] = await db.query('SELECT DATABASE() AS databaseName');

        res.json({
            success: true,
            message: 'Successfully connected to MySQL!',
            database: result[0].databaseName
        });

    } catch (error) {
        console.error('Database connection error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not connect to the database.'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
