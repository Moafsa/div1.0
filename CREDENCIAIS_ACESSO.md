# 🔐 Credenciais de Acesso - Divino Lanches

## 📱 Sistema Principal (PDV)

### 🌐 URLs de Acesso
- **Sistema Online**: `https://divinosys.conext.click`
- **Login Admin**: `https://divinosys.conext.click/index.php?view=login_admin`

### 👤 Credenciais Padrão
```
Usuário: admin
Senha: admin123
```

*Nota: A senha está criptografada com bcrypt. Se não funcionar, o problema pode ser:*
1. **Tabela não criada**: Script de inicialização não executou
2. **Dados não inseridos**: Falha na inserção dos dados padrão
3. **Banco inconsistente**: Volumes persistentes com dados antigos

---

## 📱 WuzAPI (WhatsApp)

### 🌐 URLs de Acesso
- **Frontend (Interface Web)**: `https://divinosys.conext.click:3001`
- **Backend API**: `https://divinosys.conext.click:8081`
- **API Documentation**: `https://divinosys.conext.click:8081/api`
- **QR Code Login**: `https://divinosys.conext.click:3001/login?token=admin123456`

### 🔑 Credenciais WuzAPI
```
Token Admin: admin123456
```

### 📖 Como usar:
1. Acesse `https://divinosys.conext.click:3001/login?token=admin123456`
2. Escaneie o QR Code com seu WhatsApp
3. Pronto! Seu WhatsApp estará conectado à API

---

## 🗄️ Banco de Dados

### PostgreSQL
```
Host: postgres (interno) / localhost (externo)
Port: 5432
Database: divino_lanches (principal) / wuzapi (WhatsApp)
User: postgres / wuzapi
Password: divino_password / wuzapi
```

### Redis
```
Host: redis (interno) / localhost (externo)  
Port: 6379
```

---

## 🔧 Status dos Serviços

✅ **PostgreSQL**: Funcionando - WuzAPI conectado com sucesso
✅ **Redis**: Funcionando
✅ **App PHP**: Funcionando - Apache iniciado
✅ **WuzAPI Backend**: Funcionando - Porta 8081
✅ **WuzAPI Frontend**: Funcionando - Porta 3001
❌ **Sistema Login**: Erro "Usuário não encontrado" - Tabela usuarios não criada

---

## 📝 Logs Importantes

- **PostgreSQL**: Inicialização forçada funcionando
- **WuzAPI**: Migrações executadas com sucesso
- **Sistema**: ❌ Falha na inserção de dados padrão
- **Erro Principal**: `ERROR: relation "users" does not exist` (confusão entre bancos)
- **Timeouts**: Configurados para 600s (10 minutos)

## 🚨 Problema Identificado

**Erro**: `ERROR: relation "users" does not exist` + `Data insertion failed: Database query failed`
**Causa**: Scripts de inicialização com ordem incorreta e definições duplicadas de tabelas
**Solução**: Reorganização completa dos scripts de inicialização do banco de dados

---

## 🚀 Próximos Passos

1. **Aguardar Deploy**: O fix foi aplicado - aguarde o redeploy automático
2. **Verificar Logs**: Monitorar se as tabelas são criadas corretamente
3. **Testar Login**: Tentar novamente com admin/admin123 após o deploy
4. **Conectar WhatsApp**: Use o QR Code da WuzAPI
5. **Configurar Produtos**: Verificar se os produtos padrão foram criados

## 🔄 Solução Aplicada

1. ✅ **Removido script conflitante**: `00_force_wuzapi_setup.sql`
2. ✅ **WuzAPI setup isolado**: Agora feito apenas via coolify.yml
3. ✅ **Scripts reorganizados**:
   - `00_init_database.sql`: Tabelas básicas (tenants, planos, filiais, usuarios)
   - `01_insert_essential_data.sql`: Dados essenciais (admin user para login)
   - `02_create_full_schema.sql`: Tabelas adicionais
   - `03_insert_default_data.sql`: Dados completos
4. ✅ **Definições duplicadas removidas**: Evita conflitos de criação
5. ✅ **Deploy enviado**: Aguardando aplicação automática

---

*Última atualização: 01/10/2025 - 15:45*
