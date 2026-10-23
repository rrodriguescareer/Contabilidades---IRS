# Contabilidades — Portal IRS

Portal privado Next.js + TypeScript para clientes, ligado ao mesmo projeto Supabase da [Gestão de Clientes](https://github.com/rrodriguescareer/Contabilidades---Clientes). O endereço inicial abre a área autenticada; não há cenários, contas fictícias ou modo de demonstração.

## Vercel

Repositório na branch `main`, Framework **Next.js**, diretório raiz, Node.js **24**, build `npm run build`. Definir as variáveis em Settings → Environment Variables e fazer Redeploy:

```text
NEXT_PUBLIC_SUPABASE_URL=https://rllajahyovpzndbbyvcd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key do mesmo Supabase>
NEXT_PUBLIC_SITE_URL=https://<URL-publica-do-IRS>
```

A chave antiga `anon` pode ser utilizada em `NEXT_PUBLIC_SUPABASE_ANON_KEY`. São aceites também os aliases de servidor `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_ANON_KEY`. A Gestão usa a mesma URL/chave e o seu próprio `NEXT_PUBLIC_SITE_URL`. Não é obrigatório associar ambos os projetos pela integração automática do Vercel.

Nunca usar `service_role`, secret key ou password da base de dados no cliente. A variável genérica `SUPABASE_KEY` não é usada. A URL base não inclui `/rest/v1/`. Sem configuração válida, o serviço permanece indisponível e não abre uma sessão fictícia.

## Supabase e autenticação

No projeto partilhado, aplicar as três migrações do repositório Gestão, por ordem e apenas se estiverem pendentes. Não criar uma segunda base nem executar novamente as migrações já aplicadas. A versão dos textos legais atual é `2026-10-23.2`, correspondente à migração `202610230003_production_legal_version.sql`.

Configurar os callbacks `https://URL-IRS/auth/callback` e `https://URL-GESTAO/auth/callback` em Authentication → URL Configuration. Configurar o serviço de email e confirmar que os emails de confirmação e recuperação são entregues. A Gestão explica como autorizar o primeiro profissional.

## Acessos

- `/registar`: dados do titular, palavra-passe da plataforma e aceitação obrigatória dos Termos e da Política de Privacidade. A confirmação é validada no servidor e registada na base de dados com versão e data do servidor.
- `/entrar`: autenticação real. O profissional deve aprovar a conta e o módulo IRS.
- `/aceitar-termos`: confirmação da versão atual para utilizadores autenticados sem aceitação registada. O histórico anterior é preservado.
- `/app`: área privada, com controlo de autorização também no banco.
- `/termos` e `/privacidade`: textos públicos.
- Os antigos `/teste` e `/demonstracao` apenas encaminham para `/entrar`.

## Funcionalidades

Agregado e indicação de 2FA fiscal; rendimentos por pessoa, imóveis para rendas e alienação, despesas por pessoa/agregado; recolha documental ou informação manual descritiva; documentos privados, mensagens persistidas, progresso e envio para revisão; consulta de faturação e movimentos existentes.

O questionário fiscal estruturado completo por classe/ano, os convites de familiares, o cofre fiscal, OCR, notificações/Realtime, anexos no chat, emissão fiscal, pagamentos e plataforma Empresas são desenvolvimentos pendentes. O sistema não submete IRS à AT. Nunca enviar senhas das Finanças ou códigos 2FA no chat ou em documentos.

## Validação e operação

```sh
npm ci
npm run build
npm run typecheck
npm run test:config
npm run test:legal
```

O build, as políticas em PostgreSQL local e as rotas públicas são verificados durante o desenvolvimento. O funcionamento real de Auth, emails e Storage depende das variáveis, das migrações e do projeto remoto; não foi confirmado neste ambiente, que não dispõe dessas credenciais.

Verificar em produção: registo e confirmação, aceitação legal, aprovação pelo profissional, isolamento entre clientes, upload/download, mensagens, progresso e revogação. Configurar retenção e backups antes de receber dados fiscais. Para desenvolvimento local, usar `.env.local` e `npm run dev`; não adicionar segredos ao Git.

## Processos por ano

O profissional abre cada exercício na Gestão de Clientes. O titular pode alternar entre os processos disponíveis no seletor do topo. Um novo ano começa sem rendimentos, imóveis ou documentos anteriores; na área Agregado fiscal, pode associar as pessoas já registadas e confirmar o parentesco para esse ano. Não é criado um novo login para cada familiar. Esta funcionalidade requer a migração `202610230004_annual_cases.sql` do repositório Gestão, aplicada uma única vez ao Supabase partilhado, depois das anteriores.

O registo e a adição de pessoas validam datas reais, datas futuras, formatos e limites de contacto no servidor. A validação de formato do NIF não confirma a identidade nem a titularidade perante a AT. Pode executar `npm run test:validation` para verificar estas regras localmente.
