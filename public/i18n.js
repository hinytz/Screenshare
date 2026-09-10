export const LANG_KEY = 'screenshare.lang';

const strings = {
  en: {
    join: 'Join',
    create: 'Create',
    room: 'Room',
    room_placeholder: 'room#abcd',
    password: 'Password',
    username: 'Username',
    enter: 'Enter',
    continue: 'Continue',
    back: 'Back',
    download_windows: 'Download Windows app',
    create_ttl: 'Rooms are deleted 5 days after the last login.',
    account_ttl: 'Accounts are deleted 30 days after the last login.',
    log_in: 'Log in',
    register: 'Register',
    logout: 'Log out',
    email: 'Email',
    account_password: 'Password',
    guest: 'Continue as guest',
    account: 'Account',
    temporary_room: 'Temporary',
    permanent_room: 'Permanent',
    room_duration: 'Room duration',
    upload_avatar: 'Upload avatar',
    delete_account: 'Delete account',
    delete_account_confirm: 'Delete your account, rooms you own, and saved pins?',
    upload_room_icon: 'Upload room icon',
    crop_image: 'Crop image',
    image_too_big: 'Image is larger than 2000×2000.',
    image_invalid: 'Could not read that image.',
    join_room: 'Join room',
    join_or_create: 'Join or create a room',
    unpin_room: 'Unpin room',
    pin_room: 'Pin room',
    username_hint: 'Letters, numbers, and underscore. 2–32 characters. Must be unique.',
    account_fields: 'Enter a username and password.',
    email_taken: 'Email already registered.',
    account_bad: 'Wrong username or password.',
    captcha_fail: 'Could not verify you are human.',
    auth_required: 'Log in to do that.',
    account_fail: 'Could not create account.',
    you: 'You',
    you_suffix: '(you)',
    people: 'People',
    leave: 'Leave',
    float_cams: 'Pop-out cameras',
    float_cams_close: 'Close camera window',
    pip: 'Picture-in-picture',
    pip_exit: 'Exit picture-in-picture',
    pip_fail: 'Could not open picture-in-picture.',
    change_screen: 'Change screen',
    share_screen: 'Share screen',
    stop_sharing: 'Stop sharing',
    camera: 'Camera',
    chat: 'Chat',
    close: 'Close',
    send: 'Send',
    chat_placeholder: 'Send a message',
    delete_message: 'Delete message',
    microphone: 'Microphone',
    mute: 'Mute',
    unmute: 'Unmute',
    input_volume: 'Input volume',
    voice_activity: 'Voice activity',
    share: 'Share',
    fullscreen: 'Fullscreen',
    show_stream: 'Show this stream',
    reload_stream: 'Reload stream',
    volume: 'Volume',
    cancel: 'Cancel',
    confirm: 'Confirm',
    stream_quality: 'Stream quality',
    share_source: 'Share source',
    windows: 'Windows',
    browsers: 'Browsers',
    not_sharing: 'Not sharing',
    idle: 'Idle',
    live: 'Live',
    remove: 'Remove',
    your_mic: 'Your microphone',
    voice_for: 'Voice for {name}',
    volume_for: 'Volume for {name}',
    room_action: 'Room action',
    language: 'Language',
    copy_room_link: 'Copy room link',
    copied: 'Copied',
    kicked: 'You were removed from the room.',
    enter_fields: 'Enter a room name, password, and username.',
    room_exists: 'Room already exists',
    room_not_found: 'Room not found.',
    room_tag_required: 'Include the room tag, e.g. room#abcd.',
    wrong_password: 'Wrong password.',
    room_full: 'Room is full',
    username_taken: 'Username taken',
    could_not_create: 'Could not create room.',
    could_not_join: 'Could not join room.',
    could_not_enter: 'Could not enter the room.',
    could_not_reach: 'Could not reach the server.',
    kick_forbidden: 'Only the room creator can remove people.',
    kick_self: 'You cannot remove yourself.',
    peer_gone: 'Peer gone',
    fullscreen_fail: 'Could not enter fullscreen.',
    signal_send_fail: 'Could not send signaling data.',
    mic_blocked: 'Microphone was blocked.',
    mic_fail: 'Could not start the microphone.',
    mic_switch_fail: 'Could not switch microphone.',
    share_audio_stopped: 'Share audio stopped. Start again and enable audio in the picker.',
    no_share_audio_desktop: 'No audio on this share. The selected app may be silent, or the loopback helper is missing.',
    no_share_audio_web: 'No audio on this share. Pick a browser tab or the whole screen, and enable audio in the picker. Sharing a window is video only.',
    list_windows_fail: 'Could not list windows.',
    no_sources: 'No windows or screens found.',
    no_browsers: 'No Chrome, Edge, Firefox, or Brave windows are open.',
    no_windows: 'No windows or screens found.',
    native_audio_fail: 'Could not start native audio.',
    share_blocked: 'Screen share was blocked.',
    change_screen_fail: 'Could not change screen.',
    share_fail: 'Could not start screen share.',
    camera_blocked: 'Camera was blocked.',
    camera_fail: 'Could not start camera.',
    camera_window_fail: 'Could not open the camera window.',
    hide_self_cam: 'Hide my camera',
    show_self_cam: 'Show my camera',
    no_cameras: 'No cameras',
    negotiate_fail: 'Could not negotiate the connection.',
    audio_blocked: 'Browser blocked audio. Click the page and try again.',
    signal_fail: 'Signaling failed. Refresh and try again.',
    reconnecting: 'Reconnecting to the room…',
    disconnected: 'Disconnected from the room. Reconnecting…',
    silence: 'No audio captured. Play sound in the selected window, or share the whole screen.',
  },
  pt: {
    join: 'Entrar',
    create: 'Criar',
    room: 'Sala',
    room_placeholder: 'sala#abcd',
    password: 'Senha',
    username: 'Usuário',
    enter: 'Entrar',
    continue: 'Continuar',
    back: 'Voltar',
    download_windows: 'Baixar app para Windows',
    create_ttl: 'As salas são apagadas 5 dias após o último login.',
    account_ttl: 'As contas são apagadas 30 dias após o último login.',
    log_in: 'Entrar',
    register: 'Criar conta',
    logout: 'Sair da conta',
    email: 'E-mail',
    account_password: 'Senha',
    guest: 'Continuar como convidado',
    account: 'Conta',
    temporary_room: 'Temporária',
    permanent_room: 'Permanente',
    room_duration: 'Duração da sala',
    upload_avatar: 'Enviar avatar',
    delete_account: 'Apagar conta',
    delete_account_confirm: 'Apagar sua conta, as salas que você possui e os pins salvos?',
    upload_room_icon: 'Enviar ícone da sala',
    crop_image: 'Recortar imagem',
    image_too_big: 'A imagem é maior que 2000×2000.',
    image_invalid: 'Não foi possível ler essa imagem.',
    join_room: 'Entrar na sala',
    join_or_create: 'Entrar ou criar uma sala',
    unpin_room: 'Desafixar sala',
    pin_room: 'Fixar sala',
    username_hint: 'Letras, números e sublinhado. 2–32 caracteres. Precisa ser único.',
    account_fields: 'Informe usuário e senha.',
    email_taken: 'E-mail já cadastrado.',
    account_bad: 'Usuário ou senha incorretos.',
    captcha_fail: 'Não foi possível verificar que você é humano.',
    auth_required: 'Entre na conta para fazer isso.',
    account_fail: 'Não foi possível criar a conta.',
    you: 'Você',
    you_suffix: '(você)',
    people: 'Pessoas',
    leave: 'Sair',
    float_cams: 'Câmeras em janela',
    float_cams_close: 'Fechar janela das câmeras',
    pip: 'Picture-in-picture',
    pip_exit: 'Sair do picture-in-picture',
    pip_fail: 'Não foi possível abrir o picture-in-picture.',
    change_screen: 'Trocar tela',
    share_screen: 'Compartilhar tela',
    stop_sharing: 'Parar compartilhamento',
    camera: 'Câmera',
    chat: 'Chat',
    close: 'Fechar',
    send: 'Enviar',
    chat_placeholder: 'Enviar mensagem',
    delete_message: 'Apagar mensagem',
    microphone: 'Microfone',
    mute: 'Silenciar',
    unmute: 'Ativar som',
    input_volume: 'Volume de entrada',
    voice_activity: 'Atividade de voz',
    share: 'Compartilhar',
    fullscreen: 'Tela cheia',
    show_stream: 'Mostrar este stream',
    reload_stream: 'Recarregar stream',
    volume: 'Volume',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    stream_quality: 'Qualidade',
    share_source: 'Fonte',
    windows: 'Janelas',
    browsers: 'Navegadores',
    not_sharing: 'Sem compartilhamento',
    idle: 'Ausente',
    live: 'Ao vivo',
    remove: 'Remover',
    your_mic: 'Seu microfone',
    voice_for: 'Voz de {name}',
    volume_for: 'Volume de {name}',
    room_action: 'Ação da sala',
    language: 'Idioma',
    copy_room_link: 'Copiar link da sala',
    copied: 'Copiado',
    kicked: 'Você foi removido da sala.',
    enter_fields: 'Informe nome da sala, senha e usuário.',
    room_exists: 'A sala já existe',
    room_not_found: 'Sala não encontrada.',
    room_tag_required: 'Inclua a tag da sala, por exemplo sala#abcd.',
    wrong_password: 'Senha incorreta.',
    room_full: 'A sala está cheia',
    username_taken: 'Nome de usuário em uso',
    could_not_create: 'Não foi possível criar a sala.',
    could_not_join: 'Não foi possível entrar na sala.',
    could_not_enter: 'Não foi possível entrar na sala.',
    could_not_reach: 'Não foi possível conectar ao servidor.',
    kick_forbidden: 'Só quem criou a sala pode remover pessoas.',
    kick_self: 'Você não pode remover a si mesmo.',
    peer_gone: 'Pessoa saiu',
    fullscreen_fail: 'Não foi possível entrar em tela cheia.',
    signal_send_fail: 'Não foi possível enviar o sinal.',
    mic_blocked: 'O microfone foi bloqueado.',
    mic_fail: 'Não foi possível iniciar o microfone.',
    mic_switch_fail: 'Não foi possível trocar o microfone.',
    share_audio_stopped: 'O áudio do compartilhamento parou. Comece de novo e ative o áudio no seletor.',
    no_share_audio_desktop: 'Sem áudio neste compartilhamento. O app pode estar mudo, ou o auxiliar de loopback está ausente.',
    no_share_audio_web: 'Sem áudio neste compartilhamento. Escolha uma aba ou a tela inteira e ative o áudio no seletor. Janela é só vídeo.',
    list_windows_fail: 'Não foi possível listar as janelas.',
    no_sources: 'Nenhuma janela ou tela encontrada.',
    no_browsers: 'Nenhuma janela do Chrome, Edge, Firefox ou Brave está aberta.',
    no_windows: 'Nenhuma janela ou tela encontrada.',
    native_audio_fail: 'Não foi possível iniciar o áudio nativo.',
    share_blocked: 'O compartilhamento de tela foi bloqueado.',
    change_screen_fail: 'Não foi possível trocar a tela.',
    share_fail: 'Não foi possível iniciar o compartilhamento.',
    camera_blocked: 'A câmera foi bloqueada.',
    camera_fail: 'Não foi possível iniciar a câmera.',
    camera_window_fail: 'Não foi possível abrir a janela da câmera.',
    hide_self_cam: 'Ocultar minha câmera',
    show_self_cam: 'Mostrar minha câmera',
    no_cameras: 'Nenhuma câmera',
    negotiate_fail: 'Não foi possível negociar a conexão.',
    audio_blocked: 'O navegador bloqueou o áudio. Clique na página e tente de novo.',
    signal_fail: 'Falha no sinal. Atualize e tente de novo.',
    reconnecting: 'Reconectando à sala…',
    disconnected: 'Desconectado da sala. Reconectando…',
    silence: 'Nenhum áudio capturado. Reproduza som na janela escolhida ou compartilhe a tela inteira.',
  },
};

let lang = 'en';

export function getLang() {
  return lang;
}

export function t(key, vars) {
  const table = strings[lang] || strings.en;
  let text = table[key] || strings.en[key] || key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function applyI18n(root) {
  const doc = root || (typeof document !== 'undefined' ? document : null);
  if (!doc) return;
  if (doc.documentElement) doc.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  for (const el of doc.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of doc.querySelectorAll('[data-i18n-aria]')) {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  }
  for (const el of doc.querySelectorAll('[data-i18n-placeholder]')) {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  }
  for (const el of doc.querySelectorAll('[data-i18n-title]')) {
    el.setAttribute('title', t(el.dataset.i18nTitle));
  }
}

export function setLang(next) {
  lang = next === 'pt' ? 'pt' : 'en';
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // ignore
  }
  applyI18n();
}

export function initLang() {
  let stored = '';
  try {
    stored = localStorage.getItem(LANG_KEY) || '';
  } catch {
    stored = '';
  }
  if (stored === 'pt' || stored === 'en') {
    lang = stored;
  } else if (typeof navigator !== 'undefined' && /^pt\b/i.test(navigator.language || '')) {
    lang = 'pt';
  } else {
    lang = 'en';
  }
  applyI18n();
  return lang;
}
