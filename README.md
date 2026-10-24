# Contabilidades — Portal IRS

Portal privado Next.js/TypeScript para clientes IRS, ligado ao mesmo Supabase que a [Gestão de Clientes](https://github.com/rrodriguescareer/Contabilidades---Clientes).

## Percurso do cliente

1. Criar conta com email, palavra-passe e aceitação dos termos/privacidade.
2. Confirmar o email e preencher nome, NIF, nascimento, telemóvel e morada (rua/número, código postal e localidade).
3. A conta e o primeiro processo anual são abertos automaticamente, sem aprovação manual.
4. Criar o agregado, adicionar rendimentos e documentos e enviar convites aos familiares.
5. Consultar as rubricas do preço com IVA, aplicar desconto e confirmar **Pagar e Submeter**. O processo segue para revisão profissional após confirmação do pagamento, sem submissão automática à AT.

O nome não é obtido automaticamente pelo NIF. Em **A minha conta**, o cliente altera os dados pessoais, email (mediante confirmação) e palavra-passe (mediante reautenticação). Os convites têm validade de sete dias e os seus estados são visíveis nos cartões dos membros. Aceitar confirma a associação, sem acesso aos dados fiscais dos restantes familiares.

A conta confirmada do contabilista é encaminhada para a Gestão quando `NEXT_PUBLIC_GESTAO_URL` está configurado. Os módulos profissionais ficam nessa aplicação.

## Ativação

**A instalação existente 001–004 precisa da atualização `supabase/upgrade-005-007.sql` do repositório Gestão**, executada uma vez no SQL Editor do Supabase partilhado. Não repetir a instalação inicial. A nova versão legal é `2026-10-23.3`; os registos anteriores são preservados.

Consultar o [guia completo de ativação](https://github.com/rrodriguescareer/Contabilidades---Clientes/blob/main/docs/ativacao.md) para configurar o remetente RR, templates de email, conta do contabilista, convites e Revolut. O template de confirmação tem assunto **RR - IRS - Ativação da Sua Conta**, mas assunto/remetente/SMTP exigem configuração no Supabase e no fornecedor de envio. O código não altera remotamente essas configurações.

No Vercel: importar `main`, **Next.js**, raiz, Node.js **24**, `npm run build`. Usar `.env.example`; variáveis básicas:

- `NEXT_PUBLIC_SUPABASE_URL=https://rllajahyovpzndbbyvcd.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`: URL deste IRS
- `NEXT_PUBLIC_GESTAO_URL`: URL da Gestão

Também são aceites `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_ANON_KEY`. As chaves privadas administrativas e Merchant nunca podem ter prefixo `NEXT_PUBLIC_`.

## Cobrança e documentos

O checkout calcula em cêntimos no banco, guarda um orçamento imutável e confirma a ordem no servidor por ID/referência/valor/moeda. Gratuidade e códigos obrigatórios definidos pelo contabilista são aplicados automaticamente. Utilizações de descontos são reservadas por tentativas pendentes. Um cliente gratuito pode submeter sem Revolut.

A cobrança real usa Revolut Merchant e permanece desativada até serem fornecidas as credenciais privadas e validada a API/assinatura do webhook na conta Merchant. A documentação oficial foi bloqueada pela rede deste ambiente; a integração não foi validada com o fornecedor real. Não existe simulação de pagamentos publicada. A integração Cegid para emitir/enviar/anexar faturas é posterior.

Os ficheiros ficam em Storage privado, com metadados e SHA-256 em Postgres; documentos idênticos no mesmo processo reutilizam o objeto. Os originais são preservados. PDF/JPEG/PNG até 10 MB; links assinados de 60 segundos. Não existe cofre de senhas das Finanças, OCR, antivírus automático ou submissão de declarações à AT. Não carregar credenciais fiscais em ficheiros ou mensagens.

## Verificação

```sh
npm ci
npm run typecheck
npm run build
npm run test:config
npm run test:legal
npm run test:validation
npm run test:revolut
```

Os testes de RLS, preços, descontos, migrações, convites e pagamentos no banco estão no repositório Gestão. Não existem cenários, contas ou dados fictícios publicados. Sem configuração válida, o acesso fica indisponível. `/teste` e `/demonstracao` apenas redirecionam para `/entrar`.
