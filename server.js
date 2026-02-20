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
                id SERIAL PRIMARY KEY, usuario_id INTEGER, tipo VARCHAR(50), status VARCHAR(20) DEFAULT 'Ativo',
                nome VARCHAR(255), documento VARCHAR(50), rg_ie VARCHAR(50),     
                email VARCHAR(255), telefone VARCHAR(50), whatsapp VARCHAR(50),
                endereco VARCHAR(255), cidade VARCHAR(100), estado VARCHAR(50), cep VARCHAR(20), observacoes TEXT
            );
            CREATE TABLE IF NOT EXISTS fornecedores (
                id SERIAL PRIMARY KEY, usuario_id INTEGER, status VARCHAR(20) DEFAULT 'Ativo',
                nome VARCHAR(255), documento VARCHAR(50), email VARCHAR(255), telefone VARCHAR(50), 
                categoria VARCHAR(100), observacoes TEXT
            );
            CREATE TABLE IF NOT EXISTS funcionarios (
                id SERIAL PRIMARY KEY, usuario_id INTEGER, nome VARCHAR(255) NOT NULL, cpf VARCHAR(50), rg VARCHAR(50),
                data_nascimento DATE, data_admissao DATE, cargo VARCHAR(100), status VARCHAR(20) DEFAULT 'Ativo',
                email VARCHAR(255), telefone VARCHAR(50), endereco VARCHAR(255), cidade VARCHAR(100),
                estado VARCHAR(50), cep VARCHAR(20), salario VARCHAR(50), comissao VARCHAR(50), observacoes TEXT
            );
            CREATE TABLE IF NOT EXISTS produtos (
                id SERIAL PRIMARY KEY, usuario_id INTEGER, codigo VARCHAR(50), codigo_barras VARCHAR(100),
                nome VARCHAR(255) NOT NULL, descricao TEXT, categoria VARCHAR(100), marca VARCHAR(100), unidade VARCHAR(20), 
                preco_custo DECIMAL(10,2), preco_venda DECIMAL(10,2), estoque INT DEFAULT 0, estoque_minimo INT DEFAULT 0,
                localizacao VARCHAR(100), imagem_url TEXT, status VARCHAR(20) DEFAULT 'Ativo'
            );
            CREATE TABLE IF NOT EXISTS ordens_servico (
                id SERIAL PRIMARY KEY, usuario_id INTEGER,
                cliente_nome VARCHAR(255), cliente_telefone VARCHAR(50), tecnico_nome VARCHAR(255),
                tipo_servico VARCHAR(100), prioridade VARCHAR(50), status VARCHAR(50) DEFAULT 'Aberta',
                data_agendada VARCHAR(50), endereco_servico VARCHAR(255),
                descricao TEXT, diagnostico TEXT, solucao TEXT, produtos_utilizados TEXT,
                mao_de_obra DECIMAL(10,2) DEFAULT 0, desconto DECIMAL(10,2) DEFAULT 0, total DECIMAL(10,2) DEFAULT 0,
                forma_pagamento VARCHAR(50), observacoes TEXT, data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Banco de Dados Multi-Usuário Conectado!");
    } catch (err) { console.error("❌ Erro no Banco:", err); }
}
iniciarBanco();

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/cadastrar', async (req, res) => {
    const { nome, usuario, senha } = req.body;
    try {
        const hash = await bcrypt.hash(senha, 10);
        await pool.query('INSERT INTO usuarios (nome, usuario, senha) VALUES ($1, $2, $3)', [nome, usuario, hash]);
        res.json({ message: "Conta criada com sucesso!" });
    } catch (error) { res.status(500).json({ message: "Usuário já existe." }); }
});

app.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
        if (result.rows.length > 0 && await bcrypt.compare(senha, result.rows[0].senha)) {
            res.json({ id: result.rows[0].id, nome: result.rows[0].nome, message: "Login autorizado" });
        } else { res.status(401).json({ message: "Usuário ou senha incorretos" }); }
    } catch (error) { res.status(500).json({ message: "Erro no servidor" }); }
});

// --- API CLIENTES ---
app.get('/api/clientes', async (req, res) => { const userId = req.headers['usuario-id']; try { const r = await pool.query('SELECT * FROM clientes WHERE usuario_id = $1 ORDER BY id DESC', [userId]); res.json(r.rows); } catch (err) { res.status(500).json([]); } });
app.post('/api/clientes', async (req, res) => { const userId = req.headers['usuario-id']; const { tipo, status, nome, documento, rg_ie, email, telefone, whatsapp, endereco, cidade, estado, cep, observacoes } = req.body; try { await pool.query(`INSERT INTO clientes (usuario_id, tipo, status, nome, documento, rg_ie, email, telefone, whatsapp, endereco, cidade, estado, cep, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [userId, tipo, status, nome, documento, rg_ie, email, telefone, whatsapp, endereco, cidade, estado, cep, observacoes]); res.json({ message: "Salvo" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });
app.put('/api/clientes/:id', async (req, res) => { const userId = req.headers['usuario-id']; const { id } = req.params; const { tipo, status, nome, documento, rg_ie, email, telefone, whatsapp, endereco, cidade, estado, cep, observacoes } = req.body; try { await pool.query(`UPDATE clientes SET tipo=$1, status=$2, nome=$3, documento=$4, rg_ie=$5, email=$6, telefone=$7, whatsapp=$8, endereco=$9, cidade=$10, estado=$11, cep=$12, observacoes=$13 WHERE id=$14 AND usuario_id = $15`, [tipo, status, nome, documento, rg_ie, email, telefone, whatsapp, endereco, cidade, estado, cep, observacoes, id, userId]); res.json({ message: "Atualizado" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });
app.delete('/api/clientes/:id', async (req, res) => { const userId = req.headers['usuario-id']; try { await pool.query('DELETE FROM clientes WHERE id = $1 AND usuario_id = $2', [req.params.id, userId]); res.json({ message: "Excluído" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });

// --- API FORNECEDORES ---
app.get('/api/fornecedores', async (req, res) => { const userId = req.headers['usuario-id']; try { const r = await pool.query('SELECT * FROM fornecedores WHERE usuario_id = $1 ORDER BY id DESC', [userId]); res.json(r.rows); } catch (err) { res.status(500).json([]); } });
app.post('/api/fornecedores', async (req, res) => { const userId = req.headers['usuario-id']; const { status, nome, documento, email, telefone, categoria, observacoes } = req.body; try { await pool.query(`INSERT INTO fornecedores (usuario_id, status, nome, documento, email, telefone, categoria, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [userId, status, nome, documento, email, telefone, categoria, observacoes]); res.json({ message: "Salvo" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });
app.put('/api/fornecedores/:id', async (req, res) => { const userId = req.headers['usuario-id']; const { id } = req.params; const { status, nome, documento, email, telefone, categoria, observacoes } = req.body; try { await pool.query(`UPDATE fornecedores SET status=$1, nome=$2, documento=$3, email=$4, telefone=$5, categoria=$6, observacoes=$7 WHERE id=$8 AND usuario_id = $9`, [status, nome, documento, email, telefone, categoria, observacoes, id, userId]); res.json({ message: "Atualizado" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });
app.delete('/api/fornecedores/:id', async (req, res) => { const userId = req.headers['usuario-id']; try { await pool.query('DELETE FROM fornecedores WHERE id = $1 AND usuario_id = $2', [req.params.id, userId]); res.json({ message: "Excluído" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });

// --- API FUNCIONARIOS ---
app.get('/api/funcionarios', async (req, res) => { const userId = req.headers['usuario-id']; try { const r = await pool.query('SELECT * FROM funcionarios WHERE usuario_id = $1 ORDER BY id DESC', [userId]); res.json(r.rows); } catch (err) { res.status(500).json([]); } });
app.post('/api/funcionarios', async (req, res) => { const userId = req.headers['usuario-id']; const { nome, cpf, rg, data_nascimento, data_admissao, cargo, status, email, telefone, endereco, cidade, estado, cep, salario, comissao, observacoes } = req.body; try { await pool.query(`INSERT INTO funcionarios (usuario_id, nome, cpf, rg, data_nascimento, data_admissao, cargo, status, email, telefone, endereco, cidade, estado, cep, salario, comissao, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`, [userId, nome, cpf, rg, data_nascimento || null, data_admissao || null, cargo, status, email, telefone, endereco, cidade, estado, cep, salario, comissao, observacoes]); res.json({ message: "Salvo" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });
app.put('/api/funcionarios/:id', async (req, res) => { const userId = req.headers['usuario-id']; const { id } = req.params; const { nome, cpf, rg, data_nascimento, data_admissao, cargo, status, email, telefone, endereco, cidade, estado, cep, salario, comissao, observacoes } = req.body; try { await pool.query(`UPDATE funcionarios SET nome=$1, cpf=$2, rg=$3, data_nascimento=$4, data_admissao=$5, cargo=$6, status=$7, email=$8, telefone=$9, endereco=$10, cidade=$11, estado=$12, cep=$13, salario=$14, comissao=$15, observacoes=$16 WHERE id=$17 AND usuario_id = $18`, [nome, cpf, rg, data_nascimento || null, data_admissao || null, cargo, status, email, telefone, endereco, cidade, estado, cep, salario, comissao, observacoes, id, userId]); res.json({ message: "Atualizado" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });
app.delete('/api/funcionarios/:id', async (req, res) => { const userId = req.headers['usuario-id']; try { await pool.query('DELETE FROM funcionarios WHERE id = $1 AND usuario_id = $2', [req.params.id, userId]); res.json({ message: "Excluído" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });

// --- API PRODUTOS ---
app.get('/api/produtos', async (req, res) => { const userId = req.headers['usuario-id']; try { const r = await pool.query('SELECT * FROM produtos WHERE usuario_id = $1 ORDER BY id DESC', [userId]); res.json(r.rows); } catch (err) { res.status(500).json([]); } });
app.post('/api/produtos', async (req, res) => { const userId = req.headers['usuario-id']; const { codigo, codigo_barras, nome, descricao, categoria, marca, unidade, preco_custo, preco_venda, estoque, estoque_minimo, localizacao, imagem_url, status } = req.body; try { await pool.query(`INSERT INTO produtos (usuario_id, codigo, codigo_barras, nome, descricao, categoria, marca, unidade, preco_custo, preco_venda, estoque, estoque_minimo, localizacao, imagem_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`, [userId, codigo, codigo_barras, nome, descricao, categoria, marca, unidade, preco_custo || 0, preco_venda || 0, estoque || 0, estoque_minimo || 0, localizacao, imagem_url, status]); res.json({ message: "Salvo" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });
app.put('/api/produtos/:id', async (req, res) => { const userId = req.headers['usuario-id']; const { id } = req.params; const { codigo, codigo_barras, nome, descricao, categoria, marca, unidade, preco_custo, preco_venda, estoque, estoque_minimo, localizacao, imagem_url, status } = req.body; try { await pool.query(`UPDATE produtos SET codigo=$1, codigo_barras=$2, nome=$3, descricao=$4, categoria=$5, marca=$6, unidade=$7, preco_custo=$8, preco_venda=$9, estoque=$10, estoque_minimo=$11, localizacao=$12, imagem_url=$13, status=$14 WHERE id=$15 AND usuario_id = $16`, [codigo, codigo_barras, nome, descricao, categoria, marca, unidade, preco_custo, preco_venda, estoque, estoque_minimo, localizacao, imagem_url, status, id, userId]); res.json({ message: "Atualizado" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });
app.delete('/api/produtos/:id', async (req, res) => { const userId = req.headers['usuario-id']; try { await pool.query('DELETE FROM produtos WHERE id = $1 AND usuario_id = $2', [req.params.id, userId]); res.json({ message: "Excluído" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });

// --- API ORDENS DE SERVIÇO (NOVO) ---
app.get('/api/os', async (req, res) => {
    const userId = req.headers['usuario-id']; 
    try { const r = await pool.query('SELECT * FROM ordens_servico WHERE usuario_id = $1 ORDER BY id DESC', [userId]); res.json(r.rows); } 
    catch (err) { res.status(500).json([]); } 
});

app.post('/api/os', async (req, res) => {
    const userId = req.headers['usuario-id']; 
    const { cliente_nome, cliente_telefone, tecnico_nome, tipo_servico, prioridade, status, data_agendada, endereco_servico, descricao, diagnostico, solucao, produtos_utilizados, mao_de_obra, desconto, total, forma_pagamento, observacoes } = req.body;
    try { 
        await pool.query(`INSERT INTO ordens_servico (usuario_id, cliente_nome, cliente_telefone, tecnico_nome, tipo_servico, prioridade, status, data_agendada, endereco_servico, descricao, diagnostico, solucao, produtos_utilizados, mao_de_obra, desconto, total, forma_pagamento, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`, 
        [userId, cliente_nome, cliente_telefone, tecnico_nome, tipo_servico, prioridade, status, data_agendada, endereco_servico, descricao, diagnostico, solucao, produtos_utilizados, mao_de_obra || 0, desconto || 0, total || 0, forma_pagamento, observacoes]); 
        res.json({ message: "OS Criada" }); 
    } catch (err) { res.status(500).json({ message: "Erro" }); } 
});

app.put('/api/os/:id', async (req, res) => {
    const userId = req.headers['usuario-id']; const { id } = req.params;
    const { cliente_nome, cliente_telefone, tecnico_nome, tipo_servico, prioridade, status, data_agendada, endereco_servico, descricao, diagnostico, solucao, produtos_utilizados, mao_de_obra, desconto, total, forma_pagamento, observacoes } = req.body;
    try { 
        await pool.query(`UPDATE ordens_servico SET cliente_nome=$1, cliente_telefone=$2, tecnico_nome=$3, tipo_servico=$4, prioridade=$5, status=$6, data_agendada=$7, endereco_servico=$8, descricao=$9, diagnostico=$10, solucao=$11, produtos_utilizados=$12, mao_de_obra=$13, desconto=$14, total=$15, forma_pagamento=$16, observacoes=$17 WHERE id=$18 AND usuario_id = $19`, 
        [cliente_nome, cliente_telefone, tecnico_nome, tipo_servico, prioridade, status, data_agendada, endereco_servico, descricao, diagnostico, solucao, produtos_utilizados, mao_de_obra, desconto, total, forma_pagamento, observacoes, id, userId]); 
        res.json({ message: "OS Atualizada" }); 
    } catch (err) { res.status(500).json({ message: "Erro" }); } 
});

app.delete('/api/os/:id', async (req, res) => { const userId = req.headers['usuario-id']; try { await pool.query('DELETE FROM ordens_servico WHERE id = $1 AND usuario_id = $2', [req.params.id, userId]); res.json({ message: "OS Excluída" }); } catch (err) { res.status(500).json({ message: "Erro" }); } });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Servidor rodando na porta ${port}`));
