# Contabilidades — Portal IRS

Next.js 16 + TypeScript, com autenticação Supabase e interface própria de clientes. A gestão de acessos está no repositório [Contabilidades---Clientes](https://github.com/rrodriguescareer/Contabilidades---Clientes).

## Configurar no Vercel

Framework: **Next.js**. Diretório raiz. Node.js 24. Definir em Settings → Environment Variables e fazer Redeploy:

```text
NEXT_PUBLIC_SUPABASE_URL=https://rllajahyovpzndbbyvcd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<chave publishable do mesmo projeto>
NEXT_PUBLIC_SITE_URL=https://<endereco-publico-deste-portal>
```

Se usar a chave antiga `anon`, utilizar `NEXT_PUBLIC_SUPABASE_ANON_KEY` em alternativa. Não usar `service_role` ou secret key. A URL base não inclui `/rest/v1/`. Sem configuração, é apresentada uma explicação; não existem contas ou dados fictícios a substituir uma ligação real.

## Base central e profissional

Antes de utilizar, aplicar **uma única vez** a migração do repositório de Gestão de Clientes ao Supabase partilhado. O README desse repositório explica o SQL Editor, a criação do profissional e os callbacks de autenticação. Não criar um segundo esquema ou outro projeto Supabase para esta aplicação.

## Funcionalidades desta primeira versão

- Registo do titular: nome, email, password da plataforma, telemóvel, morada, NIF e nascimento; confirmação por email. O profissional deve aprovar o acesso.
- Login, saída e recuperação. A mesma identidade pode ser usada na Gestão, mas só profissionais autorizados entram nessa aplicação.
- Conta e processo anual; agregado e indicação de 2FA fiscal (alerta para o profissional).
- Rendimentos por pessoa, imóveis para alienação/rendas e despesas por pessoa/agregado.
- Modo documental ou informação manual descritiva; o questionário fiscal estruturado completo será desenvolvido por classe/ano.
- Upload privado de PDF/JPEG/PNG, campos documentais específicos e «Outros», consulta/download de documentos.
- Mensagens persistidas no processo, progresso publicado pelo profissional e envio para revisão.
- Consulta de faturas e movimentos existentes, sem emissão ou cobrança.

Os pedidos de convite de familiares ficam registados, mas ainda não enviam emails nem concedem acesso. O cofre de senhas das Finanças não está implementado: não recolher senhas nem códigos 2FA. Anexos dentro do chat, Realtime, notificações, pagamentos, OCR e a plataforma Empresas são fases posteriores. O módulo Empresas é identificado como indisponível, sem encaminhar para uma plataforma inexistente.

## Executar

```sh
npm ci
cp .env.example .env.local
# Configurar o Supabase de desenvolvimento e o URL deste portal.
npm run dev
npm run typecheck
npm run build
```

## Validação

O build de produção e os tipos foram verificados localmente. As rotas públicas sem configuração, a proteção da área privada, os callbacks inválidos, a ausência de indexação e a apresentação responsiva são verificados no navegador. As políticas do banco são testadas no repositório de gestão com PostgreSQL em memória. Login real, confirmação/recuperação por email e Storage remoto precisam de validação depois de configurar as variáveis e aplicar a migração.

## Explorar sem configurar Supabase

A rota `/demonstracao` funciona sem variáveis de ambiente ou base de dados. Sem configuração, o endereço inicial abre automaticamente essa demonstração. A entrada real continua em `/entrar`, com ligação de volta ao exemplo. Depois de configurar o Supabase, o endereço inicial passa para a área autenticada.

A demonstração identifica claramente dados fictícios em memória: agregado, rendimentos, imóveis, documentos simulados, mensagens e progresso. Na Gestão também permite simular concessões de módulos e acompanhar alertas. Não tem uploads reais, emails, passwords ou persistência; recarregar repõe os exemplos. As duas aplicações não sincronizam estes dados entre si. A demonstração não abre ou contorna os dados protegidos em `/app`.

### Integração automática Vercel / Supabase

Uma integração automática num projeto Vercel não é necessária no segundo. O segundo projeto pode usar os mesmos valores públicos de URL e chave do primeiro, mantendo o seu próprio `NEXT_PUBLIC_SITE_URL`. O código também aceita os aliases de servidor `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_ANON_KEY`, frequentemente disponibilizados por integrações. Nunca usa a variável genérica `SUPABASE_KEY`, porque o seu tipo seria ambíguo. Chaves `sb_secret_` e JWT com papel diferente de `anon` são recusados por esta configuração.
