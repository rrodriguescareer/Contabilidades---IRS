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

**A instalação existente deve executar `supabase/update-current.sql` do repositório Gestão**, no SQL Editor do Supabase partilhado. O ficheiro aplica apenas as atualizações 005–009 em falta e pode ser repetido sem reiniciar dados. Não repetir a instalação inicial. A nova versão legal é `2026-10-28.1`; os registos anteriores são preservados.

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
npm run test:auth
npm run test:dashboard
npm run test:config
npm run test:legal
npm run test:validation
npm run test:revolut
```

Os testes de RLS, preços, descontos, migrações, convites e pagamentos no banco estão no repositório Gestão. Não existem cenários, contas ou dados fictícios publicados. Sem configuração válida, o acesso fica indisponível. `/teste` e `/demonstracao` apenas redirecionam para `/entrar`.

A navegação carrega apenas os dados do separador aberto. A área Mensagens atualiza as respostas automaticamente, através de Realtime com fallback periódico enquanto está visível. Conta e ano são selecionados sem recarregar o documento inteiro. A cache da sessão dura apenas o pedido atual e não partilha dados entre clientes.

## Administração e campanha IRS 2026

A Gestão tem um layout administrativo próprio e persistente: utilizadores, empresas, acompanhamento IRS, descontos, faturas, pagamentos e configurações. O Portal IRS mantém a experiência do cliente. O registo público nunca atribui funções profissionais; apenas o administrador pode convidar contabilistas e associar utilizadores a empresas. Não existe seleção de ano na interface. A campanha chama-se IRS 2026; o campo técnico de ano de rendimentos mantém-se para integridade dos dados já existentes. Não foi programada qualquer limpeza ou envio de emails para o próximo ano.

Executar a atualização `supabase/update-current.sql` do repositório Gestão no Supabase partilhado. Pode repetir sem apagar dados. A migração 009 prepara a campanha, papéis geridos, configurações e otimiza as políticas de leitura.

Nas DUAS aplicações Vercel, definir `SUPABASE_SECRET_KEY` (ou service role) e a mesma `INTEGRATION_ENCRYPTION_KEY`, privada, de 64 caracteres hexadecimais. Gerar uma vez com `openssl rand -hex 32`, guardar num gestor de segredos e copiar apenas para as variáveis privadas do Vercel; não enviar para o GitHub ou para o chat. Não substituir esta chave depois de guardar credenciais sem uma migração de cifragem. Depois de Redeploy, configurar Merchant key, segredo webhook e versão da API em Gestão → Configurações. Em Empresas, cada empresa permite guardar a sua credencial Cegid própria; a ligação operacional Cegid continua pendente.

A faturação central apresenta os documentos já associados às contas e os pagamentos registados. O módulo Empresas operacional e a emissão automática de faturas Cegid não foram implementados nesta alteração. Não são apresentadas faturas fictícias.

O modal IRS mostra rubricas, desconto e confirmação. O pagamento com cartão decorre no checkout hospedado da Revolut, após confirmação no modal. Não é usado um iframe não verificado para recolher cartões. O retorno mostra de imediato o estado persistido; a consulta externa ocorre depois do carregamento. Só confirmação autenticada do fornecedor permite liquidar a cobrança.

## Desempenho e diagnóstico

O menu persiste durante a navegação; as páginas privadas são dinâmicas e não partilham caches de dados entre utilizadores. A sessão e a navegação do cliente são obtidas numa única RPC autorizada pelo JWT verificado no PostgREST. O conteúdo é carregado por separador. A compatibilidade com instalações antigas verifica explicitamente a identidade no Auth. As listagens calculam as contas autorizadas uma vez por consulta. A pré-carga só ocorre com intenção de navegação (foco ou passagem do ponteiro), evitando descarregar todos os módulos.

Na Gestão → Configurações, «Medir tempo de ligação» mostra o tempo total, a autorização no servidor e a região Vercel. Os logs Vercel `rr_backend_timing` identificam pedidos Supabase acima de 750 ms; `rr_login_timing` mede a etapa de autenticação. Nenhum destes logs inclui emails, senhas, tokens ou parâmetros de consulta. Ainda é necessário medir o serviço remoto antes de afirmar que a latência de produção ficou resolvida. A região Vercel deve ser alinhada com a região real do Supabase após verificar ambas.
