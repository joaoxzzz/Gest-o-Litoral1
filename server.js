const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
});

async function iniciarBanco() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY, nome VARCHAR(255), usuario VARCHAR(255) UNIQUE, senha VARCHAR(255)
            );
            CREATE TABLE IF NOT EXISTS clientes (
                id SERIAL PRIMARY KEY, 
                tipo VARCHAR(50), status VARCHAR(20) DEFAULT 'Ativo',
                nome VARCHAR(255), documento VARCHAR(50), rg_ie VARCHAR(50),     
                email VARCHAR(255), telefone VARCHAR(50), whatsapp VARCHAR(50),
                endereco VARCHAR(255), cidade VARCHAR(100), estado VARCHAR(50),
                cep VARCHAR(20), observacoes TEXT
            );
            CREATE TABLE IF NOT EXISTS fornecedores (
                id SERIAL PRIMARY KEY, 
                status VARCHAR(20) DEFAULT 'Ativo',
                nome VARCHAR(255), documento VARCHAR(50), 
                email VARCHAR(255), telefone VARCHAR(50), 
                categoria VARCHAR(100), observacoes TEXT
            );
            CREATE TABLE IF NOT EXISTS funcionarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                cpf VARCHAR(50),
                rg VARCHAR(50),
                data_nascimento DATE,
                data_admissao DATE,
                cargo VARCHAR(100),
                status VARCHAR(20) DEFAULT 'Ativo',
                email VARCHAR(255),
                telefone VARCHAR(50),
                endereco VARCHAR(255),
                cidade VARCHAR(100),
                estado VARCHAR(50),
                cep VARCHAR(20),
                salario VARCHAR(50),
                comissao VARCHAR(50),
                observacoes TEXT
            );
        `);
        console.log("✅ Banco de Dados Conectado com Sucesso!");
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
    } catch (error) { res.status(500).json({ message: "Erro ao cadastrar." }); }
});

app.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
        if (result.rows.length > 0 && await bcrypt.compare(senha, result.rows[0].senha)) {
            res.json({ nome: result.rows[0].nome, message: "Login autorizado" });
        } else { res.status(401).json({ message: "Acesso negado" }); }
    } catch (error) { res.status(500).json({ message: "Erro interno" }); }
});

// ==========================================
// --- API DE CLIENTES ---
// ==========================================
app.get('/api/clientes', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM clientes ORDER BY id DESC');
        res.json(r.rows);
    } catch (err) { res.status(500).json([]); }
});

app.post('/api/clientes', async (req, res) => {
    const { tipo, status, nome, documento, rg_ie, email, telefone, whatsapp, endereco, cidade, estado, cep, observacoes } = req.body;
    try {
        await pool.query(
            `INSERT INTO clientes (tipo, status, nome, documento, rg_ie, email, telefone, whatsapp, endereco, cidade, estado, cep, observacoes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, 
            [tipo, status, nome, documento, rg_ie, email, telefone, whatsapp, endereco, cidade, estado, cep, observacoes]
        );
        res.json({ message: "Cliente salvo" });
    } catch (err) { res.status(500).json({ message: "Erro ao salvar" }); }
});

app.put('/api/clientes/:id', async (req, res) => {
    const { id } = req.params;
    const { tipo, status, nome, documento, rg_ie, email, telefone, whatsapp, endereco, cidade, estado, cep, observacoes } = req.body;
    try {
        await pool.query(
            `UPDATE clientes SET tipo=$1, status=$2, nome=$3, documento=$4, rg_ie=$5, email=$6, telefone=$7, whatsapp=$8, endereco=$9, cidade=$10, estado=$11, cep=$12, observacoes=$13 WHERE id=$14`, 
            [tipo, status, nome, documento, rg_ie, email, telefone, whatsapp, endereco, cidade, estado, cep, observacoes, id]
        );
        res.json({ message: "Cliente atualizado" });
    } catch (err) { res.status(500).json({ message: "Erro ao atualizar" }); }
});

app.delete('/api/clientes/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
        res.json({ message: "Cliente excluído" });
    } catch (err) { res.status(500).json({ message: "Erro ao excluir" }); }
});

// ==========================================
// --- API DE FORNECEDORES ---
// ==========================================
app.get('/api/fornecedores', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM fornecedores ORDER BY id DESC');
        res.json(r.rows);
    } catch (err) { res.status(500).json([]); }
});

app.post('/api/fornecedores', async (req, res) => {
    const { status, nome, documento, email, telefone, categoria, observacoes } = req.body;
    try {
        await pool.query(
            `INSERT INTO fornecedores (status, nome, documento, email, telefone, categoria, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7)`, 
            [status, nome, documento, email, telefone, categoria, observacoes]
        );
        res.json({ message: "Fornecedor salvo" });
    } catch (err) { res.status(500).json({ message: "Erro ao salvar" }); }
});

app.put('/api/fornecedores/:id', async (req, res) => {
    const { id } = req.params;
    const { status, nome, documento, email, telefone, categoria, observacoes } = req.body;
    try {
        await pool.query(
            `UPDATE fornecedores SET status=$1, nome=$2, documento=$3, email=$4, telefone=$5, categoria=$6, observacoes=$7 WHERE id=$8`, 
            [status, nome, documento, email, telefone, categoria, observacoes, id]
        );
        res.json({ message: "Fornecedor atualizado" });
    } catch (err) { res.status(500).json({ message: "Erro ao atualizar" }); }
});

app.delete('/api/fornecedores/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM fornecedores WHERE id = $1', [req.params.id]);
        res.json({ message: "Fornecedor excluído" });
    } catch (err) { res.status(500).json({ message: "Erro ao excluir" }); }
});

// ==========================================
// --- API DE FUNCIONÁRIOS ---
// ==========================================
app.get('/api/funcionarios', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM funcionarios ORDER BY id DESC');
        res.json(r.rows);
    } catch (err) { res.status(500).json([]); }
});

app.post('/api/funcionarios', async (req, res) => {
    const { nome, cpf, rg, data_nascimento, data_admissao, cargo, status, email, telefone, endereco, cidade, estado, cep, salario, comissao, observacoes } = req.body;
    try {
        await pool.query(
            `INSERT INTO funcionarios (nome, cpf, rg, data_nascimento, data_admissao, cargo, status, email, telefone, endereco, cidade, estado, cep, salario, comissao, observacoes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`, 
            [nome, cpf, rg, data_nascimento || null, data_admissao || null, cargo, status, email, telefone, endereco, cidade, estado, cep, salario, comissao, observacoes]
        );
        res.json({ message: "Funcionário salvo" });
    } catch (err) { console.error(err); res.status(500).json({ message: "Erro ao salvar funcionário" }); }
});

app.put('/api/funcionarios/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, cpf, rg, data_nascimento, data_admissao, cargo, status, email, telefone, endereco, cidade, estado, cep, salario, comissao, observacoes } = req.body;
    try {
        await pool.query(
            `UPDATE funcionarios SET nome=$1, cpf=$2, rg=$3, data_nascimento=$4, data_admissao=$5, cargo=$6, status=$7, email=$8, telefone=$9, endereco=$10, cidade=$11, estado=$12, cep=$13, salario=$14, comissao=$15, observacoes=$16 WHERE id=$17`, 
            [nome, cpf, rg, data_nascimento || null, data_admissao || null, cargo, status, email, telefone, endereco, cidade, estado, cep, salario, comissao, observacoes, id]
        );
        res.json({ message: "Funcionário atualizado" });
    } catch (err) { console.error(err); res.status(500).json({ message: "Erro ao atualizar" }); }
});

app.delete('/api/funcionarios/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM funcionarios WHERE id = $1', [req.params.id]);
        res.json({ message: "Funcionário excluído" });
    } catch (err) { res.status(500).json({ message: "Erro ao excluir" }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Servidor rodando na porta ${port}`));
