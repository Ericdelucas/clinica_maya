# Onde mexer no aplicativo Android

Os layouts ficam em `app/src/main/res/layout/` e as classes em `app/src/main/java/com/example/appdamaya/`.

| Parte do aplicativo | Layout | Classe que controla |
| --- | --- | --- |
| Janela e navegação inicial | `tela_principal.xml` | `AtividadePrincipal.java` |
| Entrada e escolha do perfil | `tela_login.xml` | `TelaLoginFragment.java` |
| Abas principais e troca das telas | `tela_painel.xml` | `TelaPainelFragment.java` |
| Manequim 3D e seus controles | `tela_boneco_3d.xml` | `Boneco3DView.java` e `TelaPainelFragment.java` |
| Cadastro, pacientes e edição de vídeos | `painel_profissional.xml` | `TelaPainelFragment.java` |
| Ficha clínica e área do paciente | `painel_paciente.xml` | `TelaPainelFragment.java` |
| Calendário e agendamento | `tela_calendario.xml` | `TelaPainelFragment.java` |
| Cabeçalho e menu do perfil | `componente_cabecalho.xml` | `TelaPainelFragment.java` |
| Alterar e-mail e senha | `dialogo_alterar_acesso.xml` | `TelaPainelFragment.java` |
| Campos da ficha clínica | `formulario_ficha_clinica.xml` | `TelaPainelFragment.java` |

`AtividadePrincipal` é o contêiner: o formulário de entrada está somente em `tela_login.xml`.
O grafo de navegação fica em `res/navigation/mapa_navegacao.xml`.

## Dados e listas

- `DadosClinica.java`: cadastros, pacientes de exemplo, vídeos por paciente, agenda e gravação local.
- `SessaoUsuario.java`: dados e tipo de perfil do usuário.
- `PontoDor.java`: nomes, lados e posições das regiões clicáveis do corpo.
- `AgendamentoConsulta.java`: dados de um horário agendado.
- `AdaptadorPacientes.java` + `item_paciente.xml`: cartões da lista de pacientes.
- `AdaptadorAgendamentos.java` + `item_agendamento.xml`: cartões dos horários.
- `item_regiao_corpo.xml`: item da lista de regiões no editor de vídeos.

## Funções para procurar

| O que você quer alterar | Função |
| --- | --- |
| Acesso sem senha para testes | `entrarNoAplicativo` em `TelaLoginFragment` |
| Escolher o paciente dos vídeos | `selecionarPacienteDosVideos` |
| Ação ao tocar em um ponto do boneco | `aoTocarNaRegiao` |
| Mostrar a região no editor | `selecionarRegiao` |
| Salvar ou apagar o link pelo painel | `salvarVideoDaRegiao` / `removerVideoDaRegiao` |
| Guardar ou consultar o link de um paciente | `salvarLinkDaRegiao` / `obterLinkDaRegiao` em `DadosClinica` |
| Abrir calendário e configurar controles | `mostrarCalendario` / `configurarCalendario` |
| Marcar ou cancelar consulta | `agendarConsulta` / `cancelarAgendamento` |
| Persistir os dados do aparelho | `salvarDadosNoAparelho` |

Métodos definidos pelo Android, como `onCreate`, `onViewCreated` e `onResume`, mantêm os nomes exigidos pelo framework. As classes `*Binding` são geradas a partir dos layouts e não devem ser editadas manualmente.

Os nomes das chaves dos dados já salvos foram mantidos para permitir que os cadastros e links existentes continuem sendo carregados.
