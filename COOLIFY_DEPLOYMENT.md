# Deploy no Coolify - Divino Lanches

## 🚀 Configuração do Ambiente

### Variáveis de Ambiente Necessárias

Configure as seguintes variáveis de ambiente no Coolify:

#### Para o serviço `app`:
```
DB_NAME=divino_lanches
DB_USER=postgres
DB_PASSWORD=divino_password
APP_URL=https://seu-dominio.com
N8N_WEBHOOK_URL=https://seu-webhook.com
```

#### Para o serviço `postgres`:
```
POSTGRES_DB=divino_lanches
POSTGRES_USER=postgres
POSTGRES_PASSWORD=divino_password
```

#### Para o serviço `wuzapi`:
```
DB_HOST=postgres
DB_PORT=5432
DB_NAME=wuzapi
DB_USER=wuzapi
DB_PASSWORD=wuzapi
WUZAPI_URL=http://wuzapi:8080
WEBHOOK_URL=http://app:80/webhook/wuzapi.php
WUZAPI_ADMIN_TOKEN=admin123456
```

## 🗄️ Inicialização do Banco de Dados

O sistema inclui scripts de inicialização automática que:

1. **Criam o usuário `wuzapi`** com senha `wuzapi`
2. **Criam o banco `wuzapi`** para o serviço WuzAPI
3. **Concedem privilégios** necessários para o usuário wuzapi

**⚠️ CRÍTICO:** Se você já tem um volume de dados persistente para o PostgreSQL no Coolify, ele **não** executará os scripts de inicialização. Para garantir que os usuários e bancos sejam criados, você deve:

1. **Ir no Coolify → Storage → Persistent Volumes**
2. **Excluir o volume** `divino_postgres_data` (ou similar)
3. **Fazer um novo deploy**. Isso forçará o PostgreSQL a iniciar com um volume vazio e executar os scripts de inicialização.

**Se não remover o volume persistente, o PostgreSQL não criará o usuário `wuzapi` e o banco `wuzapi`, causando os erros de autenticação.**

## 📋 Ordem de Execução dos Scripts

Os scripts são executados automaticamente na seguinte ordem:

1. `00_create_wuzapi_user.sql` - Cria usuário e banco wuzapi
2. `01_create_schema.sql` - Cria esquemas do sistema
3. `02_insert_default_data.sql` - Insere dados padrão
5. `03_update_categories_products.sql` - Atualiza categorias e produtos
6. `04_update_mesa_pedidos.sql` - Atualiza mesas e pedidos
7. `04_usuarios_sistema.sql` - Cria usuários do sistema
8. `05_create_usuarios_globais.sql` - Cria usuários globais
9. `05_usuarios_flexiveis.sql` - Cria usuários flexíveis
10. `06_create_whatsapp_tables.sql` - Cria tabelas do WhatsApp
11. `07_create_chatwoot_tables.sql` - Cria tabelas do Chatwoot (legado)
12. `08_add_chatwoot_columns.sql` - Adiciona colunas do Chatwoot (legado)
13. `09_cleanup_chatwoot_columns.sql` - Remove colunas do Chatwoot

## 🔧 Troubleshooting

### Erro: "Database connection failed"

Se você receber este erro, verifique:

1. **Variáveis de ambiente** estão configuradas corretamente
2. **Usuários do PostgreSQL** foram criados (verificar logs do postgres)
3. **Senhas** estão corretas
4. **Rede interna** entre containers está funcionando

### Logs Importantes

- **PostgreSQL**: Verificar se usuários foram criados
- **App**: Verificar conexão com banco principal
- **WuzAPI**: Verificar conexão com banco wuzapi

### Reset do Banco de Dados

Se necessário, você pode resetar o banco:

1. Pare todos os serviços
2. Remova o volume `postgres_data`
3. Reinicie os serviços

## ✅ Verificação Pós-Deploy

Após o deploy, verifique:

1. **Login administrativo** funciona
2. **Página de configurações** carrega
3. **WuzAPI** está acessível
4. **Instâncias WhatsApp** podem ser criadas
5. **QR codes** são gerados
6. **Mensagens** podem ser enviadas

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs de todos os serviços
2. Confirme as variáveis de ambiente
3. Teste a conectividade entre containers
4. Verifique se os scripts de inicialização foram executados
