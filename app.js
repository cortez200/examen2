const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs'); // Añadido para manejar carpetas
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ASEGURAR QUE LA CARPETA UPLOADS EXISTA
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

db.connect(err => {
    if (err) { console.error('Error:', err.message); return; }
    console.log('✅ Conectado a Aiven MySQL');
    
    db.query(`CREATE TABLE IF NOT EXISTS Tiendas (
        id_tienda INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        direccion VARCHAR(255)
    )`);
    db.query(`CREATE TABLE IF NOT EXISTS Productos (
        id_producto INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        precio DECIMAL(10,2) NOT NULL,
        imagen VARCHAR(255),
        id_tienda INT,
        FOREIGN KEY (id_tienda) REFERENCES Tiendas(id_tienda)
    )`);
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'public/uploads'); },
    filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage: storage });

app.get('/api/tiendas', (req, res) => {
    db.query('SELECT * FROM Tiendas', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/tiendas', (req, res) => {
    const { nombre, direccion } = req.body;
    db.query('INSERT INTO Tiendas (nombre, direccion) VALUES (?, ?)', [nombre, direccion], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'OK' });
    });
});

app.get('/api/productos', (req, res) => {
    const query = `SELECT p.*, t.nombre AS tienda FROM Productos p JOIN Tiendas t ON p.id_tienda = t.id_tienda`;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/productos', upload.single('imagen'), (req, res) => {
    const { nombre, precio, id_tienda } = req.body;
    const imagen = req.file ? `/uploads/${req.file.filename}` : null;
    
    // Si id_tienda llega vacío desde el index, esto fallará con error 500
    if (!id_tienda) return res.status(400).json({ error: "Falta seleccionar tienda" });

    db.query('INSERT INTO Productos (nombre, precio, imagen, id_tienda) VALUES (?, ?, ?, ?)', 
    [nombre, precio, imagen, id_tienda], (err) => {
        if (err) {
            console.error("Error al insertar producto:", err);
            return res.status(500).json(err);
        }
        res.json({ message: 'OK' });
    });
});

app.delete('/api/productos/:id', (req, res) => {
    db.query('DELETE FROM Productos WHERE id_producto = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'OK' });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Port: ${PORT}`); });