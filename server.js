const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// Configurações
app.use(cors());
app.use(express.json());
// Esta linha faz o servidor entregar seu HTML/CSS (Front-end)
app.use(express.static(__dirname));

// --- CONEXÃO COM O NEON (POSTGRES) ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// --- CRIAÇÃO AUTOMÁTICA DAS TABELAS ---
// Isso roda assim que o servidor liga para garantir que o banco existe
async function iniciarBanco() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255),
                usuario VARCHAR(255) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL
            );
            CREATE TABLE IF NOT EXISTS clientes (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255),
                documento VARCHAR(50),
                telefone VARCHAR(50),
                email VARCHAR(255),
                endereco VARCHAR(255),
                cidade VARCHAR(100),
                cep VARCHAR(20),
                tipo VARCHAR(20),
                status VARCHAR(20) DEFAULT 'Ativo'
            );
        `);
        console.log("✅ Banco de Dados conectado e tabelas verificadas!");
    } catch (error) {
        console.error("❌ Erro ao conectar no banco:", error);
    }
}
iniciarBanco();

// ================= ROTAS =================

// --- ROTA DE CADASTRO (Cria usuário no Banco) ---
app.post('/cadastrar', async (req, res) => {
    const { nome, usuario, senha } = req.body;
    try {
        // Verifica se já existe
        const userCheck = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: "Usuário já existe" });
        }

        // Criptografa a senha (Segurança)
        const senhaHash = await bcrypt.hash(senha, 10);
        
        await pool.query(
            'INSERT INTO usuarios (nome, usuario, senha) VALUES ($1, $2, $3)',
            [nome, usuario, senhaHash]
        );
        res.status(201).json({ message: "Usuário criado com sucesso!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erro ao cadastrar" });
    }
});

// --- ROTA DE LOGIN (Verifica no Banco) ---
app.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;
    try {
        const resultado = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
        
        if (resultado.rows.length === 0) {
            return res.status(400).json({ message: "Usuário não encontrado" });
        }

        const user = resultado.rows[0];
        const senhaValida = await bcrypt.compare(senha, user.senha);

        if (!senhaValida) {
            return res.status(400).json({ message: "Senha incorreta" });
        }

        res.status(200).json({ message: "Login realizado com sucesso!", nome: user.nome });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erro no servidor" });
    }
});

// --- ROTA: LISTAR CLIENTES ---
app.get('/api/clientes', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM clientes ORDER BY id DESC');
        res.json(resultado.rows);
    } catch (err) {
        res.status(500).json({ error: "Erro ao buscar clientes" });
    }
});

// --- ROTA: SALVAR CLIENTE ---
app.post('/api/clientes', async (req, res) => {
    const { nome, documento, telefone, email, endereco, cidade, cep, tipo } = req.body;
    try {
        await pool.query(
            `INSERT INTO clientes (nome, documento, telefone, email, endereco, cidade, cep, tipo) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [nome, documento, telefone, email, endereco, cidade, cep, tipo]
        );
        res.status(201).json({ message: "Cliente salvo!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao salvar cliente" });
    }
});

// --- ROTA: DELETAR CLIENTE ---
app.delete('/api/clientes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM clientes WHERE id = $1', [id]);
        res.status(200).json({ message: "Cliente excluído" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao excluir" });
    }
});

// --- ROTA: EDITAR CLIENTE ---
app.put('/api/clientes/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, documento, telefone, email, cidade } = req.body;
    try {
        await pool.query(
            `UPDATE clientes SET nome=$1, documento=$2, telefone=$3, email=$4, cidade=$5 
             WHERE id=$6`,
            [nome, documento, telefone, email, cidade, id]
        );
        res.status(200).json({ message: "Cliente atualizado" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao atualizar" });
    }
});

// Iniciar Servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});