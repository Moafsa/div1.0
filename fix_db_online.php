<?php
/**
 * Script para corrigir o banco de dados online
 * Conecta diretamente via PDO para aplicar as migrações
 */

// Configurar para mostrar erros
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // Conectar diretamente ao banco usando variáveis de ambiente
    $host = $_ENV['DB_HOST'] ?? 'postgres';
    $dbname = $_ENV['DB_NAME'] ?? 'divino_lanches';
    $user = $_ENV['DB_USER'] ?? 'postgres';
    $password = $_ENV['DB_PASSWORD'] ?? 'postgres';
    
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<h1>🔧 Correção do Banco de Dados Online</h1>";
    echo "<p>✅ Conectado ao banco: $dbname</p>";
    
    // 1. Adicionar colunas faltantes na tabela pedido
    echo "<h2>1. Corrigindo tabela pedido...</h2>";
    
    $alter_pedido = "
    ALTER TABLE pedido 
    ADD COLUMN IF NOT EXISTS status_pagamento VARCHAR(20) DEFAULT 'pendente' 
        CHECK (status_pagamento IN ('pendente', 'pago', 'parcial', 'cancelado', 'estornado', 'quitado')),
    ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(50),
    ADD COLUMN IF NOT EXISTS valor_pago DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP;
    ";
    
    try {
        $pdo->exec($alter_pedido);
        echo "<p>✅ Colunas adicionadas na tabela pedido</p>";
    } catch (Exception $e) {
        echo "<p>⚠️ Aviso: " . $e->getMessage() . "</p>";
    }
    
    // 2. Criar tabelas financeiras
    echo "<h2>2. Criando tabelas financeiras...</h2>";
    
    // Tabela categorias_financeiras
    $create_categorias = "
    CREATE TABLE IF NOT EXISTS categorias_financeiras (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
        cor VARCHAR(7) DEFAULT '#007bff',
        icone VARCHAR(50) DEFAULT 'fas fa-tag',
        tenant_id INTEGER NOT NULL,
        filial_id INTEGER NOT NULL,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ";
    
    try {
        $pdo->exec($create_categorias);
        echo "<p>✅ Tabela categorias_financeiras criada</p>";
    } catch (Exception $e) {
        echo "<p>⚠️ Aviso: " . $e->getMessage() . "</p>";
    }
    
    // Tabela contas_financeiras
    $create_contas = "
    CREATE TABLE IF NOT EXISTS contas_financeiras (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('banco', 'caixa', 'cartao')),
        cor VARCHAR(7) DEFAULT '#28a745',
        icone VARCHAR(50) DEFAULT 'fas fa-wallet',
        tenant_id INTEGER NOT NULL,
        filial_id INTEGER NOT NULL,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ";
    
    try {
        $pdo->exec($create_contas);
        echo "<p>✅ Tabela contas_financeiras criada</p>";
    } catch (Exception $e) {
        echo "<p>⚠️ Aviso: " . $e->getMessage() . "</p>";
    }
    
    // Tabela lancamentos_financeiros
    $create_lancamentos = "
    CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
        id SERIAL PRIMARY KEY,
        descricao VARCHAR(255) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
        categoria_id INTEGER REFERENCES categorias_financeiras(id),
        conta_id INTEGER REFERENCES contas_financeiras(id),
        pedido_id INTEGER REFERENCES pedido(idpedido),
        usuario_id INTEGER,
        tenant_id INTEGER NOT NULL,
        filial_id INTEGER NOT NULL,
        data_lancamento DATE NOT NULL,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ";
    
    try {
        $pdo->exec($create_lancamentos);
        echo "<p>✅ Tabela lancamentos_financeiros criada</p>";
    } catch (Exception $e) {
        echo "<p>⚠️ Aviso: " . $e->getMessage() . "</p>";
    }
    
    // Tabela relatorios_financeiros
    $create_relatorios = "
    CREATE TABLE IF NOT EXISTS relatorios_financeiros (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        parametros JSONB,
        tenant_id INTEGER NOT NULL,
        filial_id INTEGER NOT NULL,
        usuario_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ";
    
    try {
        $pdo->exec($create_relatorios);
        echo "<p>✅ Tabela relatorios_financeiros criada</p>";
    } catch (Exception $e) {
        echo "<p>⚠️ Aviso: " . $e->getMessage() . "</p>";
    }
    
    // 3. Inserir dados iniciais
    echo "<h2>3. Inserindo dados iniciais...</h2>";
    
    // Categorias padrão
    $categorias = [
        ['Vendas', 'receita', '#28a745', 'fas fa-shopping-cart'],
        ['Taxa de entrega', 'receita', '#17a2b8', 'fas fa-truck'],
        ['Ingredientes', 'despesa', '#dc3545', 'fas fa-apple-alt'],
        ['Salários', 'despesa', '#fd7e14', 'fas fa-users'],
        ['Aluguel', 'despesa', '#6f42c1', 'fas fa-building'],
        ['Energia elétrica', 'despesa', '#ffc107', 'fas fa-bolt'],
        ['Água', 'despesa', '#20c997', 'fas fa-tint'],
        ['Internet', 'despesa', '#6c757d', 'fas fa-wifi'],
        ['Marketing', 'despesa', '#e83e8c', 'fas fa-bullhorn'],
        ['Manutenção', 'despesa', '#fd7e14', 'fas fa-tools']
    ];
    
    $stmt_cat = $pdo->prepare("INSERT INTO categorias_financeiras (nome, tipo, cor, icone, tenant_id, filial_id) VALUES (?, ?, ?, ?, 1, 1) ON CONFLICT DO NOTHING");
    
    foreach ($categorias as $cat) {
        try {
            $stmt_cat->execute($cat);
            echo "<p>✅ Categoria '{$cat[0]}' inserida</p>";
        } catch (Exception $e) {
            echo "<p>⚠️ Aviso: " . $e->getMessage() . "</p>";
        }
    }
    
    // Contas padrão
    $contas = [
        ['Caixa Principal', 'caixa', '#28a745', 'fas fa-cash-register'],
        ['Banco do Brasil', 'banco', '#007bff', 'fas fa-university'],
        ['Cartão de Crédito', 'cartao', '#dc3545', 'fas fa-credit-card']
    ];
    
    $stmt_conta = $pdo->prepare("INSERT INTO contas_financeiras (nome, tipo, cor, icone, tenant_id, filial_id) VALUES (?, ?, ?, ?, 1, 1) ON CONFLICT DO NOTHING");
    
    foreach ($contas as $conta) {
        try {
            $stmt_conta->execute($conta);
            echo "<p>✅ Conta '{$conta[0]}' inserida</p>";
        } catch (Exception $e) {
            echo "<p>⚠️ Aviso: " . $e->getMessage() . "</p>";
        }
    }
    
    // 4. Verificar resultado
    echo "<h2>4. Verificando resultado...</h2>";
    
    $tabelas = ['categorias_financeiras', 'contas_financeiras', 'lancamentos_financeiros', 'relatorios_financeiros'];
    
    foreach ($tabelas as $tabela) {
        try {
            $count = $pdo->query("SELECT COUNT(*) FROM $tabela")->fetchColumn();
            echo "<p>📊 Tabela $tabela: $count registros</p>";
        } catch (Exception $e) {
            echo "<p>❌ Erro na tabela $tabela: " . $e->getMessage() . "</p>";
        }
    }
    
    echo "<h2>✅ Correção concluída com sucesso!</h2>";
    echo "<p><a href='index.php'>Voltar ao sistema</a></p>";
    
} catch (Exception $e) {
    echo "<h2>❌ Erro na conexão:</h2>";
    echo "<p style='color: red;'>" . $e->getMessage() . "</p>";
    echo "<p>Verifique as variáveis de ambiente do banco de dados.</p>";
}
?>
