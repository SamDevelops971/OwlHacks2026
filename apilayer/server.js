require ('dotenv').config();
const express = require ('express');
const cors = require('cors');
const cookieParser = require ('cookie-parser');
const morgan = require ('morgan');
const rateLimit = require ('express-rate-limit');

const authRoutes = require ('./routes/auth.routes');
const usreRoutes = require('./routes/user.routes');
const postRoutes = require ('./routes/post.routes');
const { errorHandler } = require ('./middleware/errorHandler');

const app = express();
app.use(cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
}))

app.use(cookieParser());
app.use(express.json());
app.use(morgan('dev'));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {data: null, error: {message: 'Too many requests, slow down.', status: 429}},

});

app.use(globalLimiter);

// Routes

app.get('/heath', (req, res) => res.json ({status: 'ok'}));

app.use('/auth', authRoutes);
app.use('/users', usreRoutes);
app.use ('/post', postRoutes);

app.use ((req, res) =>
{
    res.status(404).json ({data: null, error: {message: 'Route not found', status: 404}});

});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen (PORT, () => {
    console.log (`Social API running on https://tu-flock.onrender.com/`);
});