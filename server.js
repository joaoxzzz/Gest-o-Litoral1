const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve os arquivos HTML/CSS/JS

// Configuração do Banco de Dados (PostgreSQL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
});

// Inicializa Tabelas se não existirem
async function iniciarBanco() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY, nome VARCHAR(255), usuario VARCHAR(255) UNIQUE, senha VARCHAR(255)
            );
            CREATE TABLE IF NOT EXISTS clientes (
                id SERIAL PRIMARY KEY, tipo VARCHAR(20), nome VARCHAR(255), documento VARCHAR(50), 
                telefone VARCHAR(50), email VARCHAR(255), cidade VARCHAR(100), status VARCHAR(20) DEFAULT 'Ativo'
            );
        `);
        console.log("✅ Banco de Dados Conectado e Pronto");
    } catch (err) { console.error("❌ Erro no Banco:", err); }
}
iniciarBanco();

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/cadastrar', async (req, res) => {
    const { nome, usuario, senha } = req.body;
    try {
        const hash = await bcrypt.hash(senha, 10);
        await pool.query('INSERT INTO usuarios (nome, usuario, senha) VALUES ($1, $2, $3)', [nome, usuario, hash]);
        res.json({ message: "Usuário criado com sucesso!" });
    } catch (error) {
        res.status(500).json({ message: "Erro ao cadastrar. Usuário já existe?" });
    }
});

app.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
        if (result.rows.length > 0 && await bcrypt.compare(senha, result.rows[0].senha)) {
            res.json({ nome: result.rows[0].nome, message: "Login autorizado" });
        } else {
            res.status(401).json({ message: "Usuário ou senha incorretos" });
        }
    } catch (error) {
        res.status(500).json({ message: "Erro no servidor" });
    }
});

// --- API DE CLIENTES ---
app.get('/api/clientes', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM clientes ORDER BY id DESC');
        res.json(r.rows);
    } catch (err) { res.status(500).json([]); }
});

app.post('/api/clientes', async (req, res) => {
    const { tipo, nome, documento, telefone, email, cidade } = req.body;
    try {
        await pool.query('INSERT INTO clientes (tipo, nome, documento, telefone, email, cidade) VALUES ($1, $2, $3, $4, $5, $6)', 
        [tipo, nome, documento, telefone, email, cidade]);
        res.json({ message: "Cliente salvo" });
    } catch (err) { res.status(500).json({ message: "Erro ao salvar" }); }
});

app.delete('/api/clientes/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
        res.json({ message: "Cliente excluído" });
    } catch (err) { res.status(500).json({ message: "Erro ao excluir" }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Servidor rodando na porta ${port}`));
