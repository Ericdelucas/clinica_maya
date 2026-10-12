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

Abra **Calendário** na navegação principal. Como profissional, selecione o dia, escolha um paciente cadastrado, toque no horário e salve o agendamento. Horários iguais no mesmo dia são recusados. O calendário é exclusivo do profissional; o paciente não vê essa aba. Os agendamentos são salvos no mesmo armazenamento local dos cadastros e links.

Existe somente um formulário de login, em `tela_login.xml`. `tela_principal.xml` contém apenas o host de navegação; não representa um segundo login.

## Repaginação e agenda independente

A navegação inferior do profissional tem Manequim 3D, Painel e Calendário. Para o paciente, aparecem apenas Manequim 3D e Minha área.
O calendário é uma tela própria, exclusiva do profissional. Use as setas do mês, selecione um dia ou toque em Hoje. A lista mostra os horários em ordem; abaixo fica o formulário de novo agendamento, exclusivo do profissional.
Para cancelar um horário, entre como profissional, toque em Cancelar agendamento no cartão e confirme. O paciente não tem esse controle. O dia selecionado e a aba ativa são preservados ao girar a tela. Confira também o cabeçalho e seu menu em telas estreitas e com fontes maiores.

## Acesso temporário sem login

Nesta etapa, selecione Paciente ou Profissional e toque em Entrar. E-mail e senha podem ficar vazios; qualquer conteúdo nesses campos é ignorado. O aplicativo abre um perfil local Teste (`teste@example.com`) do tipo escolhido.
Os perfis de teste têm identificadores próprios e não alteram as contas Eric e Maya. O paciente Teste também é preparado ao entrar como profissional e aparece na lista de pacientes, permitindo testar vídeos e agendamentos para ele. Esse acesso temporário substitui a validação de credenciais na tela Android enquanto o aplicativo está sendo montado.

## Links por região

Como profissional, abra Pacientes → Ver boneco. Use Frente ou Costas para orientar o manequim e toque no ponto desejado. A edição abre diretamente na região selecionada, com nome do paciente, nome da articulação e lado anatômico. Direito e esquerdo sempre se referem ao paciente: de frente, o ombro direito está à esquerda da tela.
Salve um link diferente para cada ombro e confira como paciente: cada ponto abre seu próprio vídeo diretamente. A edição e seus botões não são disponibilizados ao paciente. Pontos sem link mostram uma mensagem em vez de abrir uma página vazia. Ao mudar de paciente, a seleção é limpa e os controles de edição ficam desativados até selecionar outra região.

## Vídeos diferentes para pacientes diferentes

Abra Painel → Articulações e escolha o paciente no seletor Vídeos para qual paciente?. Selecione Cervical e salve um vídeo. Troque para outro paciente e salve um vídeo diferente na mesma região. Ao trocar, o campo carrega o vídeo do novo paciente; alterações ainda não salvas no campo são descartadas. Use Ver boneco e vídeos deste paciente para tocar nos pontos e conferir os links atribuídos, sem entrar na edição. Voltar à edição de vídeos retorna ao painel profissional.
Os links são armazenados por identificador do paciente e identificador da região. Alterar ou apagar o vídeo cervical de um paciente não altera o de outro. A leitura dos links de outro identificador fica bloqueada durante uma sessão de paciente. O acesso sem credenciais continua abrindo o paciente Teste; a prévia profissional permite conferir os demais sem mudar esse acesso temporário.

## Pacientes fictícios prontos para comparar

| Paciente | E-mail de exemplo | Cervical | Ombro direito |
| --- | --- | --- | --- |
| Ana Souza | ana.souza@example.com | Big Buck Bunny | Tears of Steel |
| Bruno Lima | bruno.lima@example.com | Tears of Steel | Big Buck Bunny |

Links de demonstração, sem prescrição de exercícios:
- Big Buck Bunny: https://www.youtube.com/watch?v=aqz-KE-bpKQ
- Tears of Steel: https://www.youtube.com/watch?v=OHOpb2fS-cM

Ao atualizar o APK, estes exemplos são acrescentados aos dados existentes; cadastros e links já editados são preservados. Os demais pontos começam sem vídeo.

1. Entre como Profissional com os campos vazios. Em Painel → Articulações escolha Ana e depois Bruno; selecione Cervical para comparar os links.
2. Use Ver boneco e vídeos deste paciente para testar a abertura. Cervical fica nas costas: use o botão Costas.
3. Saia, selecione Paciente e escolha Ana no novo seletor. Entre sem senha e toque na cervical ou no ombro direito.
4. Repita com Bruno. A mesma região abre o outro vídeo.
5. Altere um vídeo de Ana como profissional e confira que o vídeo de Bruno permanece igual.

O seletor de acesso é temporário para demonstração, assim como a entrada sem credenciais solicitada nesta etapa.

Verificação de acesso: entre como Ana ou Bruno e confirme que Calendário não aparece; entre como profissional e confira que a aba e seus controles continuam disponíveis.
