import Link from 'next/link';
import LegalPage from '@/components/legal-page';
export const metadata={title:'Termos e Condições · Portal IRS'};

const EMAIL = 'contabilidade.rubenrodrigues@gmail.com';

export default function Terms() {
  return (
    <LegalPage title="Termos e Condições">
      <section>
        <h2>1. Responsável e contacto</h2>
        <p>
          O Portal IRS é disponibilizado por Rúben Miguel da Silva Duarte Meirinho Rodrigues, Contabilista Certificado
          com a cédula n.º 145854, com domicílio profissional na Rua Augusto Simões 845 4470-147 Maia.
          Contacto: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>2. Finalidade e serviços</h2>
        <p>
          A plataforma permite reunir os dados e os documentos do agregado, comunicar com o profissional e acompanhar a
          preparação e a entrega da declaração de IRS. O registo não contrata automaticamente um serviço: o serviço é
          contratado quando o titular submete o processo ou paga a preparação, depois de lhe ser apresentado o
          orçamento discriminado, com IVA incluído.
        </p>
        <p>
          O carregamento de elementos, o indicador de progresso ou a submissão do processo na plataforma não equivalem
          à entrega da declaração à Autoridade Tributária (AT). A informação é revista pelo profissional, que só entrega
          a declaração depois dessa revisão e com as autorizações aplicáveis.
        </p>
      </section>

      <section>
        <h2>3. Conta e acesso</h2>
        <p>
          O titular deve fornecer informação correta, proteger a sua palavra-passe e comunicar acessos indevidos.
          Depois de confirmar o email e completar os dados pessoais, o cliente pode iniciar o processo IRS sem aprovação
          manual. Os acessos a empresas são geridos pelo profissional. Uma pessoa do agregado não recebe acesso aos
          restantes familiares apenas por constar do processo.
        </p>
        <p>
          Deve existir autorização adequada para facultar e gerir dados de terceiros, incluindo a representação de
          menores. Não partilhe as credenciais de entrada na plataforma.
        </p>
      </section>

      <section>
        <h2>4. Senhas do Portal das Finanças</h2>
        <p>
          Para preparar e entregar a declaração, a plataforma pede a senha de acesso ao Portal das Finanças de cada
          membro do agregado. A senha é guardada cifrada e só o profissional a pode consultar. Cada consulta fica
          registada, com data e hora, e é visível ao titular no Acompanhamento. O titular pode alterar a senha na
          plataforma a qualquer momento e deve atualizá-la se a mudar no Portal das Finanças.
        </p>
        <p>
          Os códigos temporários de autenticação em dois fatores não devem ser enviados por mensagem nem em
          documentos. Quando um membro do agregado tiver esse fator ativo, o profissional combina com o titular o
          momento da entrega.
        </p>
      </section>

      <section>
        <h2>5. Dados e documentos</h2>
        <p>
          Os elementos são utilizados para tratar o pedido e prestar os serviços acordados. O titular deve confirmar a
          informação e responder aos pedidos de esclarecimento. O titular pode abrir e descarregar, a qualquer momento,
          os documentos que enviou. A forma de tratamento dos dados pessoais consta da{' '}
          <Link href="/privacidade">Política de Privacidade</Link>.
        </p>
        <p>
          Os documentos não devem conter conteúdos ilícitos ou destinados a comprometer os sistemas. O sistema pode
          limitar formatos e tamanhos e bloquear a recolha enquanto decorre a revisão.
        </p>
      </section>

      <section>
        <h2>6. Submissão, pagamento e faturação</h2>
        <p>
          O processo é submetido para revisão de uma de duas formas: pagando e submetendo no mesmo passo, ou submetendo
          primeiro e pagando depois. Antes de pagar ou de submeter, o titular confirma os dados, os documentos e o valor,
          e aceita estes Termos e a Política de Privacidade.
        </p>
        <p>
          O pagamento é processado pela Stripe, com os métodos disponíveis no momento (por exemplo, cartão, MB WAY ou
          Multibanco). A plataforma não recebe nem guarda dados de cartões; conserva as referências, os valores e os
          estados necessários para gerir e comprovar o pagamento. A confirmação é verificada no servidor junto da
          Stripe: um pagamento pendente ou falhado não equivale a pagamento recebido. Quando o processo é submetido sem
          pagamento, o pagamento continua disponível na plataforma até ao fecho do processo, e o profissional pode
          condicionar a entrega da declaração à AT à confirmação do pagamento.
        </p>
        <p>
          A fatura-recibo é emitida pelo profissional, em nome do titular, através de programa de faturação
          certificado, e enviada para o email da conta. A plataforma não emite documentos fiscais.
        </p>
      </section>

      <section>
        <h2>7. Início do serviço e direito de livre resolução</h2>
        <p>
          O titular que contrate como consumidor pode resolver o contrato no prazo de 14 dias, sem indicar motivo, nos
          termos do Decreto-Lei n.º 24/2014, de 14 de fevereiro, comunicando-o para{' '}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
        </p>
        <p>
          Ao pagar ou submeter o processo, o titular pede expressamente que a prestação do serviço se inicie antes de
          decorrido esse prazo. Se resolver o contrato depois de o serviço ter começado, paga o montante proporcional ao
          serviço prestado até à comunicação da resolução, sendo-lhe devolvido o restante. Depois de o serviço estar
          integralmente prestado, com a entrega da declaração, deixa de haver direito de livre resolução.
        </p>
      </section>

      <section>
        <h2>8. Registo de atividade</h2>
        <p>
          Para segurança e para prova das operações, a plataforma regista as ações relevantes — entradas na conta,
          submissões, aceitações, pagamentos e consultas de senhas e de documentos — com data, hora, endereço IP e
          identificação do navegador. Estes registos podem ser utilizados para responder a pedidos do titular, a
          contestações de pagamentos e a obrigações legais, nos termos da Política de Privacidade.
        </p>
      </section>

      <section>
        <h2>9. Disponibilidade e direitos</h2>
        <p>
          Podem ocorrer atualizações ou interrupções. Para assuntos com prazo ou urgência, confirme a receção com o
          profissional pelos contactos indicados. Os elementos do portal estão sujeitos aos direitos aplicáveis dos
          respetivos titulares.
        </p>
        <p>
          Estes termos regem-se pela lei portuguesa, sem prejuízo dos direitos imperativos aplicáveis, incluindo os dos
          consumidores. A aceitação não constitui renúncia a direitos legais nem uma autorização de publicidade.
        </p>
      </section>

      <section>
        <h2>10. Versão e aceitação</h2>
        <p>
          A aceitação identifica a versão dos Termos e da Política de Privacidade em vigor. Alterações que exijam nova
          aceitação são apresentadas ao titular na entrada seguinte. O registo da aceitação não elimina direitos legais
          do consumidor. Para cancelamentos ou reembolsos, contacte o responsável; aplicam-se os direitos legais e as
          condições acordadas para o serviço.
        </p>
      </section>
    </LegalPage>
  );
}
