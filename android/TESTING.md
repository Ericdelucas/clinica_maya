# Teste do aplicativo Android

Este Android é um protótipo local: não utiliza o login Supabase/Firebase da versão web.
Os cadastros e links ficam no armazenamento privado deste aparelho. Não são sincronizados entre celulares.
As senhas locais são dados de demonstração; autenticação de produção exige um backend.

## Perfis de teste

Na tela de login, selecione o perfil desejado:

| Perfil | E-mail | Senha inicial |
| --- | --- | --- |
| Profissional (Eric) | ericdelucass@gmail.com | 1234 |
| Paciente (Eric) | ericdelucass@gmail.com | 1234 |
| Profissional (Maya) | mayayyamamoto@gmail.com | 123 |

A seleção não concede privilégios: o e-mail e a senha precisam existir na lista do perfil selecionado.
Os dois perfis Eric têm identificadores diferentes. Não há cadastro público.

## Roteiro

1. Entre como profissional e abra **Painel → Pacientes → Ver boneco** no paciente Eric.
2. Toque em um ponto vermelho para abrir a edição da articulação. Os links começam vazios.
3. Salve um link HTTPS do YouTube. É possível atualizar ou apagar esse link.
4. Saia pelo menu do perfil e entre como paciente com o mesmo e-mail e senha.
5. Toque na articulação: o link salvo abre pelo aplicativo YouTube ou navegador disponível.
6. Pontos sem link mostram o nome da região selecionada e uma mensagem de vídeo ainda não cadastrado.
7. Como profissional, cadastre outro paciente com nome, e-mail e senha de no mínimo seis caracteres.
8. Feche e reabra o aplicativo: o cadastro e os links devem continuar disponíveis; faça login novamente.

Os links pertencem a cada paciente. O paciente não recebe controles para cadastrar pessoas ou editar vídeos.
Para reinstalar e voltar às contas iniciais, limpe os dados do aplicativo (isso apaga os cadastros e links locais).

## Manequim e calendário

O manequim Android agora usa OpenGL ES 2.0: malhas tridimensionais, iluminação, profundidade e rotação por arraste. O enquadramento inclui cabeça e pés e se adapta à proporção da tela.

Abra **Calendário** na navegação principal. Como profissional, selecione o dia, escolha um paciente cadastrado, toque no horário e salve o agendamento. Horários iguais no mesmo dia são recusados. Como paciente, a agenda mostra somente os horários associados ao seu identificador. Os agendamentos são salvos no mesmo armazenamento local dos cadastros e links.

Existe somente um formulário de login, em `fragment_login.xml`. `activity_main.xml` contém apenas o host de navegação; não representa um segundo login.

## Repaginação e agenda independente

A navegação inferior tem três abas fixas: Manequim 3D, Painel/Minha área e Calendário.
O calendário é uma tela própria, compartilhada pelos dois perfis. Use as setas do mês, selecione um dia ou toque em Hoje. A lista mostra os horários em ordem; abaixo fica o formulário de novo agendamento, exclusivo do profissional.
Para cancelar um horário, entre como profissional, toque em Cancelar agendamento no cartão e confirme. O paciente não tem esse controle. O dia selecionado e a aba ativa são preservados ao girar a tela. Confira também o cabeçalho e seu menu em telas estreitas e com fontes maiores.

## Acesso temporário sem login

Nesta etapa, selecione Paciente ou Profissional e toque em Entrar. E-mail e senha podem ficar vazios; qualquer conteúdo nesses campos é ignorado. O aplicativo abre um perfil local Teste (`teste@example.com`) do tipo escolhido.
Os perfis de teste têm identificadores próprios e não alteram as contas Eric e Maya. O paciente Teste também é preparado ao entrar como profissional e aparece na lista de pacientes, permitindo testar vídeos e agendamentos para ele. Esse acesso temporário substitui a validação de credenciais na tela Android enquanto o aplicativo está sendo montado.
