import LegalPage from '@/components/legal-page';
export const metadata={title:'Política de Privacidade · Portal IRS'};

const EMAIL = 'contabilidade.rubenrodrigues@gmail.com';

export default function Privacy() {
  return (
    <LegalPage title="Política de Privacidade">
      <section>
        <h2>Responsável pelo tratamento</h2>
        <p>
          Rúben Miguel da Silva Duarte Meirinho Rodrigues, Contabilista Certificado, cédula n.º 145854. Domicílio
          profissional: Rua Augusto Simões 845 4470-147 Maia. Para questões sobre dados pessoais,
          contacte <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>Dados e finalidades</h2>
        <p>
          A criação da conta recolhe email e palavra-passe. Depois da confirmação do email, são recolhidos nome,
          nascimento, NIF, telemóvel e morada, separada em rua e número, código postal e localidade. O processo IRS pode
          incluir dados de familiares, informação fiscal e financeira, rendimentos, despesas, documentos, mensagens e
          histórico de progresso. A palavra-passe da plataforma é tratada pelo serviço de autenticação e não é
          disponibilizada ao profissional.
        </p>
        <p>
          Os dados são tratados para gerir o acesso, responder ao pedido e executar diligências pré-contratuais ou
          serviços contratados, cumprir obrigações legais e manter a segurança da plataforma, conforme a base jurídica
          aplicável a cada operação. A aceitação desta política não é consentimento genérico para publicidade ou para
          qualquer tratamento.
        </p>
        <p>
          Alguns comprovativos podem conter informação especialmente protegida, como dados de saúde. Apenas devem ser
          fornecidos os elementos necessários e legitimamente tratados no âmbito do serviço, com o fundamento legal e as
          autorizações que forem aplicáveis. O profissional pode indicar um canal apropriado para elementos que exijam
          tratamento específico.
        </p>
      </section>

      <section>
        <h2>Senhas do Portal das Finanças</h2>
        <p>
          A senha de acesso ao Portal das Finanças de cada membro do agregado é necessária para preparar e entregar a
          declaração. É guardada cifrada, separada dos restantes dados, e só o profissional a pode consultar. Cada
          consulta fica registada, com data e hora, e é visível ao titular no Acompanhamento. O titular pode alterá-la
          a qualquer momento, e a senha é apagada com a eliminação da conta.
        </p>
        <p>
          Os códigos temporários de autenticação em dois fatores não são pedidos nem devem ser enviados pela
          plataforma. A indicação de que um membro tem esse fator ativo gera uma tarefa de acompanhamento para o
          profissional.
        </p>
      </section>

      <section>
        <h2>Dados de familiares e convites</h2>
        <p>
          O titular deve estar legitimado para fornecer os dados de cada membro do agregado e representar quem não
          possa agir por si. O email de um familiar é opcional e o convite não lhe atribui acesso ao restante agregado
          por defeito. Os convites podem ser enviados por email ou partilhados por ligação. O sistema regista o estado,
          a validade e a identidade que aceitou o convite, após confirmar o email convidado. A aceitação confirma a
          associação ao agregado, sem conceder acesso aos dados fiscais dos restantes membros.
        </p>
      </section>

      <section>
        <h2>Fornecedores e segurança</h2>
        <p>
          A plataforma utiliza os seguintes prestadores, que tratam dados por conta do responsável:
        </p>
        <ul>
          <li><strong>Vercel</strong> — alojamento da aplicação.</li>
          <li><strong>Supabase</strong> — autenticação, base de dados e armazenamento dos documentos.</li>
          <li><strong>Resend</strong> — envio de emails da plataforma, como confirmações e convites.</li>
          <li>
            <strong>Stripe</strong> — processamento dos pagamentos. A Stripe recebe os dados de pagamento diretamente;
            a plataforma não recebe nem guarda dados de cartões e conserva apenas as referências, os valores e os
            estados necessários para gerir e comprovar o pagamento.
          </li>
          <li>
            <strong>Cegid Business</strong> — programa de faturação certificado, onde são registados o nome, o NIF, o
            email, o telefone, a data de nascimento, a residência fiscal e a morada do titular, para a emissão da
            fatura-recibo.
          </li>
        </ul>
        <p>
          Os documentos originais ficam em armazenamento privado; a base de dados conserva os metadados e um resumo
          SHA-256 para evitar guardar cópias idênticas no mesmo processo. O acesso é limitado por conta e função; os
          ficheiros são privados e disponibilizados através de ligações temporárias, e cada abertura pelo profissional
          fica registada e visível ao titular. As condições, localizações e eventuais transferências internacionais
          dos fornecedores correspondem à configuração contratada para o serviço.
        </p>
      </section>

      <section>
        <h2>Registo de atividade</h2>
        <p>
          Para segurança e para prova das operações, o sistema regista as ações relevantes — registo, entradas na
          conta, submissões, aceitações dos Termos e da Política, pagamentos, consultas de senhas e de documentos, e
          as operações de faturação — com data e hora geradas no servidor, endereço IP e identificação do navegador.
          O fundamento é o interesse legítimo do responsável na segurança da plataforma e na defesa dos seus direitos,
          incluindo a resposta a contestações de pagamentos junto da Stripe.
        </p>
        <p>
          O sistema regista também o utilizador, a versão dos textos aceites e a data de cada aceitação. A aceitação
          legal não atribui, por si só, acesso a processos ou empresas.
        </p>
      </section>

      <section>
        <h2>Conservação</h2>
        <p>
          Os dados são conservados pelo tempo necessário ao pedido e à prestação do serviço e durante os prazos de
          conservação e de defesa de direitos aplicáveis, incluindo o prazo em que um pagamento pode ser contestado. O
          bloqueio impede novas leituras, mesmo com uma sessão existente. A eliminação da conta apaga os processos, os
          documentos, as senhas e as mensagens associados, sem prejuízo dos elementos que a lei obrigue a conservar,
          como os documentos de faturação.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          A autenticação utiliza cookies de sessão necessários ao funcionamento da conta, e a entrada utiliza um cookie
          técnico de 30 segundos, sem dados pessoais, para a transição de boas-vindas. O formulário de pagamento da
          Stripe utiliza cookies próprios, necessários à prevenção de fraude. A preferência de idioma fica guardada
          apenas no navegador. Não são utilizadas ferramentas de publicidade ou de análise de visitas.
        </p>
        <p>O alojamento pode tratar registos técnicos necessários à disponibilização e segurança do serviço.</p>
      </section>

      <section>
        <h2>Os seus direitos</h2>
        <p>
          Pode solicitar acesso, retificação, apagamento, limitação, portabilidade ou oposição ao tratamento, nos casos
          previstos na lei, através do contacto indicado. Quando uma operação depender de consentimento, pode
          retirá-lo, sem afetar a licitude do tratamento anterior. Pode apresentar reclamação à Comissão Nacional de
          Proteção de Dados (CNPD).
        </p>
      </section>
    </LegalPage>
  );
}
