# 🏗️ Estrutura do Sistema SaaS - Divino Lanches

## 📊 Hierarquia do Sistema

```
┌─────────────────────────────────────────────────┐
│          SUPERADMIN (Nível 999)                 │
│  Gerencia todo o sistema                        │
│  • Estabelecimentos                             │
│  • Planos                                       │
│  • Assinaturas                                  │
│  • Pagamentos                                   │
└─────────────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────┐
│          TENANT (Estabelecimento)               │
│  Rede de Lanchonetes                            │
│  • Dados do negócio                             │
│  • Assinatura e plano                           │
│  • Configurações gerais                         │
└─────────────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────┐
│          FILIAIS                                │
│  Unidades do estabelecimento                    │
│  • Filial Centro                                │
│  • Filial Zona Sul                              │
│  • Filial Shopping                              │
└─────────────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────┐
│          USUÁRIOS                               │
│  Funcionários                                   │
│  • Administrador (Nível 1)                      │
│  • Operador (Nível 0)                           │
└─────────────────────────────────────────────────┘
```

---

## 🗄️ Estrutura do Banco de Dados

```sql
┌──────────────────────────────────────────────────────────┐
│  TABELAS PRINCIPAIS                                       │
└──────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   tenants   │────▶│   planos    │     │  filiais    │
│             │     │             │     │             │
│ • id        │     │ • id        │     │ • id        │
│ • nome      │     │ • nome      │◀────│ • tenant_id │
│ • subdomain │     │ • preco     │     │ • nome      │
│ • status    │     │ • limites   │     │ • status    │
│ • plano_id  │────▶│ • recursos  │     └─────────────┘
└─────────────┘     └─────────────┘            │
       │                   │                   │
       │                   │                   ↓
       │                   │            ┌─────────────┐
       │                   │            │  usuarios   │
       │                   │            │             │
       │                   │            │ • id        │
       │                   │            │ • login     │
       │                   │            │ • nivel     │
       │                   │            │ • tenant_id │
       │                   │            │ • filial_id │
       │                   │            └─────────────┘
       │                   │
       ↓                   ↓
┌─────────────┐     ┌─────────────┐
│assinaturas  │     │ pagamentos  │
│             │     │             │
│ • id        │────▶│ • id        │
│ • tenant_id │     │ • assin_id  │
│ • plano_id  │     │ • valor     │
│ • status    │     │ • status    │
│ • valor     │     │ • data_venc │
│ • trial_ate │     └─────────────┘
└─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│uso_recursos │     │ audit_logs  │     │notificacoes │
│             │     │             │     │             │
│ • tenant_id │     │ • tenant_id │     │ • tenant_id │
│ • mes_ref   │     │ • usuario_id│     │ • usuario_id│
│ • mesas_usa │     │ • acao      │     │ • tipo      │
│ • users_usa │     │ • dados     │     │ • mensagem  │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 📁 Estrutura de Arquivos

```
divino-lanches/
│
├── 📂 database/
│   └── 📂 init/
│       └── 📄 10_create_saas_tables.sql ✅
│
├── 📂 mvc/
│   │
│   ├── 📂 model/
│   │   ├── 📄 Tenant.php ✅
│   │   ├── 📄 Plan.php ✅
│   │   ├── 📄 Subscription.php ✅
│   │   └── 📄 Payment.php ✅
│   │
│   ├── 📂 controller/
│   │   ├── 📄 SuperAdminController.php ✅
│   │   ├── 📄 TenantController.php ✅
│   │   └── 📄 OnboardingController.php ✅
│   │
│   ├── 📂 middleware/
│   │   └── 📄 SubscriptionMiddleware.php ✅
│   │
│   ├── 📂 views/
│   │   ├── 📄 superadmin_dashboard.php ✅
│   │   ├── 📄 tenant_dashboard.php ✅
│   │   ├── 📄 onboarding.php ✅
│   │   ├── 📄 login_admin.php ✅
│   │   └── 📄 subscription_expired.php ✅
│   │
│   └── 📂 config/
│       └── 📄 views.php ✅
│
├── 📂 system/
│   └── 📄 Database.php ✅
│
└── 📂 Documentação/
    ├── 📄 SISTEMA_SAAS_DOCUMENTACAO.md ✅
    ├── 📄 INSTALL_SAAS.md ✅
    ├── 📄 RESUMO_IMPLEMENTACAO_SAAS.md ✅
    ├── 📄 EXECUTAR_PRIMEIRO.md ✅
    └── 📄 ESTRUTURA_SAAS.md (este arquivo) ✅
```

---

## 🔄 Fluxo de Onboarding

```
┌──────────────────┐
│  Novo Cliente    │
│  Acessa Site     │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  PASSO 1         │
│  Dados Básicos   │
│  • Nome          │
│  • Subdomain     │
│  • Email         │
│  • Admin Login   │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  PASSO 2         │
│  Escolha Plano   │
│  • Starter       │
│  • Professional  │
│  • Business      │
│  • Enterprise    │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  PASSO 3         │
│  Configurações   │
│  • Nº de mesas   │
│  • Cor sistema   │
│  • Tipos atend.  │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  PASSO 4         │
│  ✅ Finalizar    │
│                  │
│  Criação Auto:   │
│  • Tenant        │
│  • Admin user    │
│  • Assinatura    │
│  • Categorias    │
│  • Mesas         │
│  • Config        │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  ✨ Pronto!      │
│  Trial 14 dias   │
│  Pode usar       │
└──────────────────┘
```

---

## 🔐 Fluxo de Autenticação

```
┌──────────────────────────────────────────────┐
│          Login Administrativo                │
│      (login_admin.php)                       │
└────────────┬─────────────────────────────────┘
             │
             ↓
    ┌────────────────┐
    │ Validar Usuário│
    │ e Senha        │
    └────────┬───────┘
             │
             ↓
    ┌────────────────┐
    │ Verificar Nível│
    └────────┬───────┘
             │
     ┌───────┴────────┐
     │                │
     ↓                ↓
┌─────────┐      ┌─────────┐
│Nível 999│      │Nível 1/0│
│SuperAdmin│      │ Admin/  │
│         │      │Operador │
└────┬────┘      └────┬────┘
     │                │
     ↓                ↓
┌─────────┐      ┌─────────┐
│Dashboard│      │Dashboard│
│SuperAdmin│      │Principal│
└─────────┘      └─────────┘
```

---

## 💳 Fluxo de Assinatura

```
┌──────────────────┐
│  Cliente Cria    │
│  Conta (Trial)   │
└────────┬─────────┘
         │
         ↓ 14 dias grátis
┌──────────────────┐
│  Usando Sistema  │
│  Trial Ativo     │
└────────┬─────────┘
         │
         ↓ Fim do trial
┌──────────────────┐
│  Gerar Cobrança  │
│  Status: Pendente│
└────────┬─────────┘
         │
     ┌───┴────┐
     │        │
     ↓        ↓
┌─────────┐  ┌─────────┐
│  Pago   │  │ Vencido │
│Status:  │  │Status:  │
│Ativa    │  │Inadimp. │
└────┬────┘  └────┬────┘
     │            │
     ↓            ↓
┌─────────┐  ┌─────────┐
│Renovar  │  │Bloquear │
│Próx.Mês │  │ Acesso  │
└─────────┘  └─────────┘
```

---

## 🎯 Funcionalidades por Tela

### Dashboard SuperAdmin

```
┌─────────────────────────────────────────────┐
│  📊 DASHBOARD SUPERADMIN                    │
├─────────────────────────────────────────────┤
│                                             │
│  📈 Estatísticas                            │
│  ├─ Total Estabelecimentos: 10              │
│  ├─ Assinaturas Ativas: 8                   │
│  ├─ Receita Mensal: R$ 1.200,00             │
│  └─ Contas Trial: 2                         │
│                                             │
│  🏢 Estabelecimentos Recentes               │
│  ├─ Lanchonete Central                      │
│  ├─ Burguer House                           │
│  └─ Pizza Express                           │
│                                             │
│  ⚠️ Alertas                                 │
│  ├─ 3 pagamentos vencidos                   │
│  └─ 2 trials expirando                      │
│                                             │
│  🔧 Menu                                    │
│  ├─ Estabelecimentos                        │
│  ├─ Planos                                  │
│  ├─ Assinaturas                             │
│  ├─ Pagamentos                              │
│  └─ Análises                                │
│                                             │
└─────────────────────────────────────────────┘
```

### Dashboard Estabelecimento

```
┌─────────────────────────────────────────────┐
│  🏪 DASHBOARD ESTABELECIMENTO               │
├─────────────────────────────────────────────┤
│                                             │
│  📋 Minha Conta                             │
│  ├─ Nome: Lanchonete Central                │
│  ├─ Subdomain: central.divino.com.br        │
│  ├─ Plano: Professional                     │
│  └─ Status: ✅ Ativa                        │
│                                             │
│  💰 Assinatura                              │
│  ├─ Valor: R$ 149,90/mês                    │
│  ├─ Próxima cobrança: 15/11/2025            │
│  └─ [Fazer Upgrade] [Ver Faturas]           │
│                                             │
│  📊 Uso de Recursos                         │
│  ├─ Mesas: ████████░░ 8/15 (53%)           │
│  ├─ Usuários: ███░░░░░░░ 3/5 (60%)         │
│  ├─ Produtos: ████░░░░░░ 80/200 (40%)      │
│  └─ Pedidos: ███████░░░ 1400/2000 (70%)    │
│                                             │
│  🏢 Minhas Filiais (3)                      │
│  ├─ Filial Centro - ✅ Ativa                │
│  ├─ Filial Zona Sul - ✅ Ativa              │
│  └─ Filial Shopping - ✅ Ativa              │
│     [+ Nova Filial]                         │
│                                             │
└─────────────────────────────────────────────┘
```

### Onboarding

```
┌─────────────────────────────────────────────┐
│  🚀 BEM-VINDO AO DIVINO LANCHES             │
├─────────────────────────────────────────────┤
│                                             │
│  Progresso: ●━━━○━━━○━━━○                   │
│            1   2   3   4                    │
│                                             │
│  PASSO 1: Dados Básicos                     │
│                                             │
│  Nome do Estabelecimento: [_____________]   │
│  Subdomain: [_______].divinolanches.com.br  │
│  CNPJ: [__.__._____/____-__]                │
│  Telefone: [(__) _____-____]                │
│  Email: [___________________]               │
│                                             │
│  Login Admin: [_____________]               │
│  Senha: [_____________]                     │
│                                             │
│          [Voltar]    [Próximo →]            │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔄 APIs Disponíveis

```
📡 SuperAdminController
├── GET    /getDashboardStats
├── GET    /listTenants
├── POST   /createTenant
├── PUT    /updateTenant
├── POST   /toggleTenantStatus
├── GET    /listPlans
├── POST   /createPlan
├── PUT    /updatePlan
├── DELETE /deletePlan
├── GET    /listPayments
└── POST   /markPaymentAsPaid

📡 TenantController
├── GET    /getTenantInfo
├── POST   /updateTenantInfo
├── GET    /listFiliais
├── POST   /createFilial
├── POST   /updateFilial
├── DELETE /deleteFilial
├── GET    /getPaymentHistory
└── GET    /checkSubscriptionStatus

📡 OnboardingController
├── POST   / (createEstablishment)
└── GET    /checkSubdomain
```

---

## 📊 Planos Visuais

```
┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│   STARTER      │  │ PROFESSIONAL   │  │   BUSINESS     │  │  ENTERPRISE    │
├────────────────┤  ├────────────────┤  ├────────────────┤  ├────────────────┤
│  R$ 49,90/mês  │  │ R$ 149,90/mês  │  │ R$ 299,90/mês  │  │ R$ 999,90/mês  │
├────────────────┤  ├────────────────┤  ├────────────────┤  ├────────────────┤
│ ✓ 5 mesas      │  │ ✓ 15 mesas     │  │ ✓ 30 mesas     │  │ ✓ ∞ mesas      │
│ ✓ 2 usuários   │  │ ✓ 5 usuários   │  │ ✓ 10 usuários  │  │ ✓ ∞ usuários   │
│ ✓ 50 produtos  │  │ ✓ 200 produtos │  │ ✓ 500 produtos │  │ ✓ ∞ produtos   │
│ ✓ 500 pedidos  │  │ ✓ 2000 pedidos │  │ ✓ 5000 pedidos │  │ ✓ ∞ pedidos    │
│ ✓ Rel. básicos │  │ ✓ Rel. avanç.  │  │ ✓ Rel. custom  │  │ ✓ White label  │
│ ✓ Email        │  │ ✓ WhatsApp     │  │ ✓ Telefone     │  │ ✓ Dedicado     │
└────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘
```

---

## 🎨 Paleta de Cores

```
Primária:    #667eea (Azul-roxo)    ████████
Secundária:  #764ba2 (Roxo)         ████████
Sucesso:     #28a745 (Verde)        ████████
Aviso:       #ffc107 (Amarelo)      ████████
Erro:        #dc3545 (Vermelho)     ████████
Info:        #17a2b8 (Azul)         ████████
Dark:        #2d3748 (Cinza escuro) ████████
```

---

## ✨ Estado Final

```
    🎉 SISTEMA 100% FUNCIONAL! 🎉
    
    ✅ 9 Tabelas criadas
    ✅ 4 Models implementados
    ✅ 3 Controllers funcionais
    ✅ 1 Middleware robusto
    ✅ 5 Views profissionais
    ✅ 4 Planos configurados
    ✅ 1 SuperAdmin criado
    ✅ Onboarding completo
    ✅ Autenticação multi-nível
    ✅ Auditoria completa
    ✅ Documentação detalhada
    
    📚 Documentação:
    - SISTEMA_SAAS_DOCUMENTACAO.md
    - INSTALL_SAAS.md
    - RESUMO_IMPLEMENTACAO_SAAS.md
    - EXECUTAR_PRIMEIRO.md
    - ESTRUTURA_SAAS.md
    
    🚀 Pronto para uso!
```

---

**Divino Lanches SaaS v1.0**
Sistema Multi-Tenant Completo
© 2025 Todos os direitos reservados

