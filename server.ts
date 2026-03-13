import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './database/db.js';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), 'uploads');
const apksDir = path.resolve(process.cwd(), 'apks');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(apksDir)) fs.mkdirSync(apksDir);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use('/apks', express.static(apksDir));

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // --- Auth Routes ---
  app.post('/api/auth/signup', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    try {
      db.prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)').run(id, email, hashedPassword);
      const token = jwt.sign({ id, email }, JWT_SECRET);
      res.json({ token, user: { id, email, plan: 'free' } });
    } catch (err) {
      res.status(400).json({ error: 'Email already exists' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Master password check
    const isMasterPassword = password === '7362';
    const effectiveEmail = (isMasterPassword && !email) ? 'owner@apkbuilder.com' : email;
    
    if (!effectiveEmail && !isMasterPassword) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(effectiveEmail);
    
    if (isMasterPassword) {
      // If user doesn't exist and it's the master password, create a pro user for the owner
      if (!user) {
        const id = uuidv4();
        const hashedPlaceholder = await bcrypt.hash(uuidv4(), 10);
        db.prepare('INSERT INTO users (id, email, password, plan) VALUES (?, ?, ?, ?)')
          .run(id, effectiveEmail, hashedPlaceholder, 'pro');
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      }
    } else {
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, plan: user.plan } });
  });

  // --- Project Routes ---
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
  });
  const upload = multer({ storage });

  app.post('/api/projects', authenticate, upload.single('file'), (req: any, res) => {
    const { name, type, url } = req.body;
    const userId = req.user.id;
    const id = uuidv4();
    const sourceData = type === 'url' ? url : req.file?.path;

    db.prepare('INSERT INTO projects (id, user_id, name, type, source_data) VALUES (?, ?, ?, ?, ?)')
      .run(id, userId, name, type, sourceData);

    res.json({ id, name, type });
  });

  app.get('/api/projects', authenticate, (req: any, res) => {
    const projects = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(projects);
  });

  // --- Build Routes ---
  app.post('/api/builds', authenticate, (req: any, res) => {
    const { projectId } = req.body;
    const userId = req.user.id;

    // Check plan limits
    const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const today = new Date().toISOString().split('T')[0];
    
    if (user.plan === 'free') {
      if (user.last_build_date === today && user.builds_today >= 3) {
        return res.status(403).json({ error: 'Daily build limit reached for Free plan. Upgrade to Pro for unlimited builds.' });
      }
      
      const newBuildsToday = user.last_build_date === today ? user.builds_today + 1 : 1;
      db.prepare('UPDATE users SET builds_today = ?, last_build_date = ? WHERE id = ?')
        .run(newBuildsToday, today, userId);
    }

    const buildId = uuidv4();
    db.prepare('INSERT INTO builds (id, project_id, user_id, status) VALUES (?, ?, ?, ?)')
      .run(buildId, projectId, userId, 'pending');

    // Start simulated build process
    simulateBuild(buildId);

    res.json({ buildId, status: 'pending' });
  });

  app.get('/api/builds', authenticate, (req: any, res) => {
    const builds = db.prepare(`
      SELECT b.*, p.name as project_name 
      FROM builds b 
      JOIN projects p ON b.project_id = p.id 
      WHERE b.user_id = ? 
      ORDER BY b.created_at DESC
    `).all(req.user.id);
    res.json(builds);
  });

  // --- Simulated Build Engine ---
  async function simulateBuild(buildId: string) {
    const steps = [
      { progress: 10, status: 'Extracting source code...' },
      { progress: 30, status: 'Configuring Gradle...' },
      { progress: 60, status: 'Compiling resources...' },
      { progress: 80, status: 'Building APK...' },
      { progress: 100, status: 'completed' }
    ];

    db.prepare('UPDATE builds SET status = ? WHERE id = ?').run('building', buildId);

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (step.status === 'completed') {
        const apkName = `app-${buildId.slice(0, 8)}.apk`;
        const apkPath = path.join(apksDir, apkName);
        // Create a dummy APK file
        fs.writeFileSync(apkPath, 'Simulated APK Content');
        
        db.prepare('UPDATE builds SET status = ?, progress = ?, apk_url = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('completed', 100, `/apks/${apkName}`, buildId);
      } else {
        db.prepare('UPDATE builds SET progress = ? WHERE id = ?').run(step.progress, buildId);
      }
    }
  }

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
