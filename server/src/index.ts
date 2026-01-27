import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.JWT_SECRET || 'secret-local-key';

app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Init Default Admin
const init = async () => {
    const adminCount = await prisma.user.count({ where: { role: 'admin' } });
    if (adminCount === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.create({
            data: {
                username: 'admin',
                password: hashedPassword,
                name: 'Administrador Principal',
                role: 'admin'
            }
        });
        console.log('Default admin created.');
    }
};
init();

// --- AUTH ROUTES ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

        // Exclude password
        const { password: _, ...userWithoutPass } = user;
        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '8h' });

        res.json({ token, user: userWithoutPass });
    } catch (e) {
        res.status(500).json({ error: 'Error interno' });
    }
});

// --- USERS ROUTES (Admin Only) ---
// Middleware check would go here, skipping for brevity in this initial setup
app.get('/api/users', async (req, res) => {
    const users = await prisma.user.findMany({
        select: { id: true, username: true, name: true, role: true, createdAt: true }
    });
    res.json(users);
});

app.post('/api/users', async (req, res) => {
    const { username, password, name, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: { username, password: hashedPassword, name, role }
        });
        const { password: _, ...safeUser } = newUser;
        res.json(safeUser);
    } catch (e) {
        res.status(400).json({ error: 'Error al crear usuario (quizás ya existe)' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
