const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

let mainWindow;
let db;

const dbPath = path.join(app.getPath('userData'), 'kwitariusz.db');

function initializeDatabase() {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Database error:', err);
    } else {
      console.log('✅ Database connected');
      createTables();
    }
  });
}

function createTables() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS parents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      groupName TEXT NOT NULL,
      birthDate TEXT NOT NULL,
      parentId INTEGER NOT NULL,
      FOREIGN KEY (parentId) REFERENCES parents(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      childId INTEGER NOT NULL,
      parentId INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (childId) REFERENCES children(id),
      FOREIGN KEY (parentId) REFERENCES parents(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      childId INTEGER NOT NULL,
      date TEXT NOT NULL,
      present INTEGER DEFAULT 1,
      FOREIGN KEY (childId) REFERENCES children(id)
    )`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();
}

app.on('ready', () => {
  initializeDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (db) {
    db.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-parents', () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM parents', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
});

ipcMain.handle('add-parent', (event, parent) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO parents (firstName, lastName, email, phone) VALUES (?, ?, ?, ?)',
      [parent.firstName, parent.lastName, parent.email, parent.phone],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...parent });
      }
    );
  });
});

ipcMain.handle('get-children', () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM children', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
});

ipcMain.handle('add-child', (event, child) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO children (firstName, lastName, groupName, birthDate, parentId) VALUES (?, ?, ?, ?, ?)',
      [child.firstName, child.lastName, child.groupName, child.birthDate, child.parentId],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...child });
      }
    );
  });
});

ipcMain.handle('send-email', async (event, { to, subject, html, config }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.sender,
        pass: config.password
      }
    });

    const result = await transporter.sendMail({
      from: config.sender,
      to: to,
      subject: subject,
      html: html
    });

    return { success: true, message: 'Email sent' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup-data', async (event, data) => {
  try {
    const fileName = `backup-kwitariusz-${new Date().toISOString().split('T')[0]}.json`;
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: fileName,
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return { success: true, message: 'Backup saved' };
    }
    return { success: false, message: 'Cancelled' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
