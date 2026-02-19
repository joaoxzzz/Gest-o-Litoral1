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
                id SERIAL PRIMARY KEY, tipo VARCHAR(50), status VARCHAR(20) DEFAULT 'Ativo',
                nome VARCHAR(255), documento VARCHAR(50), rg_ie VARCHAR(50),     
                email VARCHAR(255), telefone VARCHAR(50), whatsapp VARCHAR(50),
                endereco VARCHAR(255), cidade VARCHAR(100), estado VARCHAR(50),
                cep VARCHAR(20), observacoes TEXT
            );
            CREATE TABLE IF NOT EXISTS fornecedores (
                id SERIAL PRIMARY KEY, status VARCHAR(20) DEFAULT 'Ativo',
                nome VARCHAR(255), documento VARCHAR(50), email VARCHAR(255), telefone VARCHAR(50), 
                categoria VARCHAR(100), observacoes TEXT
            );
            CREATE TABLE IF NOT EXISTS funcionarios (
                id SERIAL PRIMARY KEY, nome VARCHAR(255) NOT NULL, cpf VARCHAR(50), rg VARCHAR(50),
                data_nascimento DATE, data_admissao DATE, cargo VARCHAR(100), status VARCHAR(20) DEFAULT 'Ativo',
                email VARCHAR(255), telefone VARCHAR(50), endereco VARCHAR(255), cidade VARCHAR(100),
                estado VARCHAR(50), cep VARCHAR(20), salario VARCHAR(50), comissao VARCHAR(50), observacoes TEXT
            );
            CREATE TABLE IF NOT EXISTS produtos (
                id SERIAL PRIMARY KEY, codigo VARCHAR(50), codigo_barras VARCHAR(100),
                nome VARCHAR(255) NOT NULL, descricao TEXT, categoria VARCHAR(100),
                marca VARCHAR(100), unidade VARCHAR(20), preco_custo DECIMAL(10,2),
                preco_venda DECIMAL(10,2), estoque INT DEFAULT 0, estoque_minimo INT DEFAULT 0,
                localizacao VARCHAR(100), imagem_url TEXT, status VARCHAR(20) DEFAULT 'Ativo'
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
    } catch (error) { res.status(500).json({ message: "Erro ao cadastrar. Usuário já existe?" }); }
});

app.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
        if (result.rows.length > 0 && await bcrypt.compare(senha, result.rows[0].senha)) {
            res.json({ nome: result.rows[0].nome, message: "Login autorizado" });
        } else { res.status(401).json({ message: "Usuário ou senha incorretos" }); }
    } catch (error) { res.status(500).json({ message: "Erro interno no servidor" }); }
});

// --- API CLIENTES ---
app.get('/api/clientes', async (req, res) => { try { const r = await pool.query('SELECT * FROM clientes ORDER BY id DESC'); res.json(r.rows); } catch (err) { res.status(500).json([]); } });
app.post('/api/clientes', async (req, res) => {
    const { tipo, status, nome, documento, rg_ie, email, telefone, whatsapp, endereco, cidade, estado, cep, observacoes } = req.body;
    try { await pool.query(`INSERT INTO clientes (tipo, status, nome, documento, rg_ie, email, telefone, whatsapp, endereco, cidade, estado, cep, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [tipo, status, nome, documento, rg_ie, email, telefone, whatsapp, endereco, cidade, estado, cep, observacoes]); res.json({ message: "Salvo" }); } catch (err) { res.status(500).json({ message: "Erro" }); }
});
app.put('/api/clientes/:id', async (req, res) => {
    const { id } = req.params; const { tipo, status, nome, documento, rg_ie, email, telefone, whatsapp, endereco, cidade, estado, cep, observacoes } = req.body;
    try { await pool.query(`UPDATE clientes SET tipo=$1, status=$2, nome=$3, documento=$4, rg_ie=$5, email=$6, telefone=$7, whatsapp=$8, endereco=$9, cidade=$10, estado=$11, cep=$12, observacoes=$13 WHERE id=$14`, [tipo, status, nome, documento, rg_ie, email, telefone, whatsapp, endereco, cidade, estado, cep, observacoes, id]); res.json({ message: "Atualizado" }); } catch (err) { res.status(500).json({ message: "Erro" }); }
});
app.delete('/api/clientes/:id', async (req, res) => { try { await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]); res.json({ message: "Excluído" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });

// --- API FORNECEDORES ---
app.get('/api/fornecedores', async (req, res) => { try { const r = await pool.query('SELECT * FROM fornecedores ORDER BY id DESC'); res.json(r.rows); } catch (err) { res.status(500).json([]); } });
app.post('/api/fornecedores', async (req, res) => {
    const { status, nome, documento, email, telefone, categoria, observacoes } = req.body;
    try { await pool.query(`INSERT INTO fornecedores (status, nome, documento, email, telefone, categoria, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [status, nome, documento, email, telefone, categoria, observacoes]); res.json({ message: "Salvo" }); } catch (err) { res.status(500).json({ message: "Erro" }); }
});
app.put('/api/fornecedores/:id', async (req, res) => {
    const { id } = req.params; const { status, nome, documento, email, telefone, categoria, observacoes } = req.body;
    try { await pool.query(`UPDATE fornecedores SET status=$1, nome=$2, documento=$3, email=$4, telefone=$5, categoria=$6, observacoes=$7 WHERE id=$8`, [status, nome, documento, email, telefone, categoria, observacoes, id]); res.json({ message: "Atualizado" }); } catch (err) { res.status(500).json({ message: "Erro" }); }
});
app.delete('/api/fornecedores/:id', async (req, res) => { try { await pool.query('DELETE FROM fornecedores WHERE id = $1', [req.params.id]); res.json({ message: "Excluído" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });

// --- API FUNCIONARIOS ---
app.get('/api/funcionarios', async (req, res) => { try { const r = await pool.query('SELECT * FROM funcionarios ORDER BY id DESC'); res.json(r.rows); } catch (err) { res.status(500).json([]); } });
app.post('/api/funcionarios', async (req, res) => {
    const { nome, cpf, rg, data_nascimento, data_admissao, cargo, status, email, telefone, endereco, cidade, estado, cep, salario, comissao, observacoes } = req.body;
    try { await pool.query(`INSERT INTO funcionarios (nome, cpf, rg, data_nascimento, data_admissao, cargo, status, email, telefone, endereco, cidade, estado, cep, salario, comissao, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`, [nome, cpf, rg, data_nascimento || null, data_admissao || null, cargo, status, email, telefone, endereco, cidade, estado, cep, salario, comissao, observacoes]); res.json({ message: "Salvo" }); } catch (err) { res.status(500).json({ message: "Erro" }); }
});
app.put('/api/funcionarios/:id', async (req, res) => {
    const { id } = req.params; const { nome, cpf, rg, data_nascimento, data_admissao, cargo, status, email, telefone, endereco, cidade, estado, cep, salario, comissao, observacoes } = req.body;
    try { await pool.query(`UPDATE funcionarios SET nome=$1, cpf=$2, rg=$3, data_nascimento=$4, data_admissao=$5, cargo=$6, status=$7, email=$8, telefone=$9, endereco=$10, cidade=$11, estado=$12, cep=$13, salario=$14, comissao=$15, observacoes=$16 WHERE id=$17`, [nome, cpf, rg, data_nascimento || null, data_admissao || null, cargo, status, email, telefone, endereco, cidade, estado, cep, salario, comissao, observacoes, id]); res.json({ message: "Atualizado" }); } catch (err) { res.status(500).json({ message: "Erro" }); }
});
app.delete('/api/funcionarios/:id', async (req, res) => { try { await pool.query('DELETE FROM funcionarios WHERE id = $1', [req.params.id]); res.json({ message: "Excluído" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });

// --- API PRODUTOS ---
app.get('/api/produtos', async (req, res) => { try { const r = await pool.query('SELECT * FROM produtos ORDER BY id DESC'); res.json(r.rows); } catch (err) { res.status(500).json([]); } });
app.post('/api/produtos', async (req, res) => {
    const { codigo, codigo_barras, nome, descricao, categoria, marca, unidade, preco_custo, preco_venda, estoque, estoque_minimo, localizacao, imagem_url, status } = req.body;
    try { await pool.query(`INSERT INTO produtos (codigo, codigo_barras, nome, descricao, categoria, marca, unidade, preco_custo, preco_venda, estoque, estoque_minimo, localizacao, imagem_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [codigo, codigo_barras, nome, descricao, categoria, marca, unidade, preco_custo || 0, preco_venda || 0, estoque || 0, estoque_minimo || 0, localizacao, imagem_url, status]); res.json({ message: "Salvo" }); } catch (err) { res.status(500).json({ message: "Erro" }); }
});
app.put('/api/produtos/:id', async (req, res) => {
    const { id } = req.params; const { codigo, codigo_barras, nome, descricao, categoria, marca, unidade, preco_custo, preco_venda, estoque, estoque_minimo, localizacao, imagem_url, status } = req.body;
    try { await pool.query(`UPDATE produtos SET codigo=$1, codigo_barras=$2, nome=$3, descricao=$4, categoria=$5, marca=$6, unidade=$7, preco_custo=$8, preco_venda=$9, estoque=$10, estoque_minimo=$11, localizacao=$12, imagem_url=$13, status=$14 WHERE id=$15`, [codigo, codigo_barras, nome, descricao, categoria, marca, unidade, preco_custo, preco_venda, estoque, estoque_minimo, localizacao, imagem_url, status, id]); res.json({ message: "Atualizado" }); } catch (err) { res.status(500).json({ message: "Erro" }); }
});
app.delete('/api/produtos/:id', async (req, res) => { try { await pool.query('DELETE FROM produtos WHERE id = $1', [req.params.id]); res.json({ message: "Excluído" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Servidor rodando na porta ${port}`));
