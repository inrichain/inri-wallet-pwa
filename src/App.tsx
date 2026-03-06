import React, { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import QRCode from "react-qr-code";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  Home,
  Send,
  QrCode,
  History,
  Coins,
  Settings,
  Copy,
  ExternalLink,
  RefreshCcw,
  Lock,
  Trash2,
  Camera,
  Wallet,
  Shuffle,
  ArrowLeftRight,
  User,
  Plus,
} from "lucide-react";

import { INRI } from "./lib/inri";
import { createMnemonic12, isValidMnemonic } from "./lib/mnemonic";
import {
  clearVault,
  decryptMnemonicFromVault,
  encryptMnemonicToVault,
  loadVault,
  saveVault,
} from "./lib/cryptoVault";
import { deriveAddressesFromMnemonic, walletFromMnemonicIndex } from "./lib/walletDerive";

const ASSET_BASE = import.meta.env.BASE_URL;

function assetUrl(file: string) {
  return `${ASSET_BASE}${file}`;
}

type Lang =
  | "en"
  | "pt"
  | "es"
  | "fr"
  | "de"
  | "ru"
  | "tr"
  | "ar"
  | "hi"
  | "id"
  | "vi"
  | "th"
  | "zh"
  | "ja"
  | "ko";

type View = "welcome" | "unlock" | "wallet";
type ThemeMode = "dark" | "silver";
type Tab =
  | "dashboard"
  | "send"
  | "receive"
  | "tokens"
  | "activity"
  | "swap"
  | "bridge"
  | "settings";

type Token = {
  symbol: string;
  address: string;
  decimals: number;
  logo?: string;
};

type LocalTx = {
  hash: string;
  from?: string;
  to: string;
  symbol: string;
  amount: string;
  createdAt: string;
  source: "local";
};

const SESSION_KEY = "inri_session_mnemonic";
const AVATAR_KEY = "inri_avatar";
const LANG_KEY = "inri_lang";
const TOKENS_KEY = "inri_custom_tokens";
const TXS_KEY = "inri_local_txs_v2";
const THEME_KEY = "inri_theme_mode";

const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ru", label: "Русский" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "th", label: "ไทย" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

const KEYS = [
  "dashboard",
  "send",
  "receive",
  "tokens",
  "activity",
  "swap",
  "bridge",
  "settings",
  "create",
  "import",
  "unlock",
  "password",
  "confirm",
  "seed_new",
  "seed_import",
  "secure_enter",
  "generate",
  "copied",
  "scan_qr",
  "keep_session",
  "logout",
  "total_balance",
  "refresh_tokens",
  "refresh_activity",
  "send_token",
  "token",
  "to",
  "amount",
  "sending",
  "need_gas",
  "your_address",
  "explorer",
  "add_token",
  "custom_tokens",
  "token_symbol",
  "token_decimals",
  "token_address",
  "token_logo",
  "token_added",
  "avatar",
  "change_avatar",
  "remove_avatar",
  "coming_soon",
  "delete_vault_confirm",
  "wrong_password",
  "no_vault",
  "invalid_seed",
  "pw_min",
  "pw_match",
  "invalid_addr",
  "invalid_amount",
  "amount_gt0",
  "camera_fail",
  "qr_ok",
  "create_account",
  "account_switcher",
  "open",
  "buy",
  "balance",
  "estimated_fee",
  "fee_pending",
  "history_empty",
  "from",
  "to_network",
  "from_network",
  "estimated_receive",
  "preview_quote",
  "session",
  "security",
  "vault",
  "language",
  "global",
  "local",
  "native_coin",
  "use_my_address",
  "network",
] as const;

type UIKey = (typeof KEYS)[number];

const PT: Record<UIKey, string> = {
  dashboard: "Dashboard",
  send: "Enviar",
  receive: "Receber",
  tokens: "Tokens",
  activity: "Atividade",
  swap: "Swap",
  bridge: "Bridge",
  settings: "Configurações",
  create: "Criar",
  import: "Importar",
  unlock: "Desbloquear",
  password: "Senha",
  confirm: "Confirmar",
  seed_new: "Nova seed (12 palavras)",
  seed_import: "Seed phrase",
  secure_enter: "Proteger & Entrar",
  generate: "Gerar",
  copied: "Copiado.",
  scan_qr: "Ler QR",
  keep_session: "Manter logado nesta sessão",
  logout: "Travar",
  total_balance: "Saldo total",
  refresh_tokens: "Atualizar Tokens",
  refresh_activity: "Atualizar Atividade",
  send_token: "Enviar Ativo",
  token: "Ativo",
  to: "Para",
  amount: "Valor",
  sending: "Enviando...",
  need_gas: "Precisa de INRI para gas.",
  your_address: "Seu endereço",
  explorer: "Explorer",
  add_token: "Adicionar token",
  custom_tokens: "Tokens manuais",
  token_symbol: "Símbolo",
  token_decimals: "Decimais",
  token_address: "Endereço do token",
  token_logo: "Logo (opcional)",
  token_added: "Token adicionado.",
  avatar: "Avatar",
  change_avatar: "Trocar avatar",
  remove_avatar: "Remover avatar",
  coming_soon: "Em breve (tela pronta).",
  delete_vault_confirm: "Apagar vault local? Você precisa da seed para restaurar.",
  wrong_password: "Senha incorreta.",
  no_vault: "Nenhum vault local encontrado.",
  invalid_seed: "Seed inválida.",
  pw_min: "Senha precisa ter pelo menos 8 caracteres.",
  pw_match: "As senhas não conferem.",
  invalid_addr: "Endereço inválido.",
  invalid_amount: "Valor inválido.",
  amount_gt0: "O valor deve ser maior que 0.",
  camera_fail: "Não foi possível usar a câmera.",
  qr_ok: "QR capturado.",
  create_account: "Criar Conta",
  account_switcher: "Trocar conta",
  open: "Abrir",
  buy: "Comprar",
  balance: "Saldo",
  estimated_fee: "Taxa estimada",
  fee_pending: "A prévia da taxa aparece após informar destino e valor.",
  history_empty: "Nenhuma transação carregada.",
  from: "De",
  to_network: "Rede de destino",
  from_network: "Rede de origem",
  estimated_receive: "Recebimento estimado",
  preview_quote: "Cotação prévia",
  session: "Sessão",
  security: "Segurança",
  vault: "Vault",
  language: "Idioma",
  global: "Global",
  local: "Local",
  native_coin: "moeda nativa",
  use_my_address: "Usar meu endereço",
  network: "Rede",
};

const EN: Record<UIKey, string> = {
  dashboard: "Dashboard",
  send: "Send",
  receive: "Receive",
  tokens: "Tokens",
  activity: "Activity",
  swap: "Swap",
  bridge: "Bridge",
  settings: "Settings",
  create: "Create",
  import: "Import",
  unlock: "Unlock",
  password: "Password",
  confirm: "Confirm",
  seed_new: "New seed phrase (12 words)",
  seed_import: "Seed phrase",
  secure_enter: "Secure & Enter",
  generate: "Generate",
  copied: "Copied.",
  scan_qr: "Scan QR",
  keep_session: "Keep unlocked in this session",
  logout: "Lock",
  total_balance: "Total balance",
  refresh_tokens: "Refresh Tokens",
  refresh_activity: "Refresh Activity",
  send_token: "Send Asset",
  token: "Asset",
  to: "To",
  amount: "Amount",
  sending: "Sending...",
  need_gas: "Need INRI for gas.",
  your_address: "Your address",
  explorer: "Explorer",
  add_token: "Add token",
  custom_tokens: "Custom tokens",
  token_symbol: "Symbol",
  token_decimals: "Decimals",
  token_address: "Token address",
  token_logo: "Logo (optional)",
  token_added: "Token added.",
  avatar: "Avatar",
  change_avatar: "Change avatar",
  remove_avatar: "Remove avatar",
  coming_soon: "Coming soon (UI ready).",
  delete_vault_confirm: "Delete local vault? You must have the seed phrase to restore.",
  wrong_password: "Wrong password.",
  no_vault: "No local vault found.",
  invalid_seed: "Invalid seed phrase.",
  pw_min: "Password must be at least 8 chars.",
  pw_match: "Passwords do not match.",
  invalid_addr: "Invalid recipient address.",
  invalid_amount: "Invalid amount.",
  amount_gt0: "Amount must be greater than 0.",
  camera_fail: "Camera scan not supported.",
  qr_ok: "QR captured.",
  create_account: "Create Account",
  account_switcher: "Account switcher",
  open: "Open",
  buy: "Buy",
  balance: "Balance",
  estimated_fee: "Estimated fee",
  fee_pending: "Fee preview appears after entering destination and amount.",
  history_empty: "No transactions loaded.",
  from: "From",
  to_network: "To network",
  from_network: "From network",
  estimated_receive: "Estimated receive",
  preview_quote: "Preview quote",
  session: "Session",
  security: "Security",
  vault: "Vault",
  language: "Language",
  global: "Global",
  local: "Local",
  native_coin: "native coin",
  use_my_address: "Use my address",
  network: "Network",
};

const makeLocale = (overrides: Partial<Record<UIKey, string>>): Record<UIKey, string> => ({
  ...EN,
  ...overrides,
});

const TRANSLATIONS: Record<Lang, Record<UIKey, string>> = {
  pt: PT,
  en: EN,
  es: makeLocale({ dashboard:"Panel", send:"Enviar", receive:"Recibir", tokens:"Tokens", activity:"Actividad", swap:"Swap", bridge:"Bridge", settings:"Configuración", create:"Crear", import:"Importar", unlock:"Desbloquear", password:"Contraseña", confirm:"Confirmar", seed_new:"Nueva frase semilla (12 palabras)", seed_import:"Frase semilla", secure_enter:"Proteger y entrar", generate:"Generar", copied:"Copiado.", scan_qr:"Escanear QR", keep_session:"Mantener desbloqueado en esta sesión", logout:"Bloquear", total_balance:"Balance total", refresh_tokens:"Actualizar tokens", refresh_activity:"Actualizar actividad", send_token:"Enviar activo", token:"Activo", to:"Para", amount:"Cantidad", sending:"Enviando...", need_gas:"Necesita INRI para gas.", your_address:"Tu dirección", explorer:"Explorador", add_token:"Agregar token", custom_tokens:"Tokens personalizados", token_symbol:"Símbolo", token_decimals:"Decimales", token_address:"Dirección del token", token_logo:"Logo (opcional)", token_added:"Token agregado.", avatar:"Avatar", change_avatar:"Cambiar avatar", remove_avatar:"Eliminar avatar", delete_vault_confirm:"¿Eliminar el vault local? Debes tener la semilla para restaurar.", wrong_password:"Contraseña incorrecta.", no_vault:"No se encontró un vault local.", invalid_seed:"Frase semilla inválida.", pw_min:"La contraseña debe tener al menos 8 caracteres.", pw_match:"Las contraseñas no coinciden.", invalid_addr:"Dirección inválida.", invalid_amount:"Cantidad inválida.", amount_gt0:"La cantidad debe ser mayor que 0.", camera_fail:"No se pudo usar la cámara.", qr_ok:"QR capturado.", create_account:"Crear cuenta", account_switcher:"Cambiar cuenta", balance:"Balance", estimated_fee:"Tarifa estimada", fee_pending:"La vista previa de la tarifa aparece después de ingresar destino y cantidad.", history_empty:"No hay transacciones cargadas.", from:"Desde", to_network:"Red de destino", from_network:"Red de origen", estimated_receive:"Recepción estimada", preview_quote:"Vista previa", session:"Sesión", security:"Seguridad", vault:"Vault", language:"Idioma", global:"Global", local:"Local", native_coin:"moneda nativa", use_my_address:"Usar mi dirección", network:"Red" }),
  fr: makeLocale({ dashboard:"Tableau", send:"Envoyer", receive:"Recevoir", tokens:"Tokens", activity:"Activité", swap:"Swap", bridge:"Bridge", settings:"Paramètres", create:"Créer", import:"Importer", unlock:"Déverrouiller", password:"Mot de passe", confirm:"Confirmer", seed_new:"Nouvelle phrase secrète (12 mots)", seed_import:"Phrase secrète", secure_enter:"Sécuriser et entrer", generate:"Générer", copied:"Copié.", scan_qr:"Scanner QR", keep_session:"Rester déverrouillé pendant cette session", logout:"Verrouiller", total_balance:"Solde total", refresh_tokens:"Actualiser les tokens", refresh_activity:"Actualiser l’activité", send_token:"Envoyer un actif", token:"Actif", to:"Vers", amount:"Montant", sending:"Envoi...", need_gas:"INRI requis pour le gas.", your_address:"Votre adresse", explorer:"Explorateur", add_token:"Ajouter un token", custom_tokens:"Tokens personnalisés", token_symbol:"Symbole", token_decimals:"Décimales", token_address:"Adresse du token", token_logo:"Logo (optionnel)", token_added:"Token ajouté.", avatar:"Avatar", change_avatar:"Changer l’avatar", remove_avatar:"Supprimer l’avatar", delete_vault_confirm:"Supprimer le vault local ? Vous devez avoir la phrase secrète pour restaurer.", wrong_password:"Mot de passe incorrect.", no_vault:"Aucun vault local trouvé.", invalid_seed:"Phrase secrète invalide.", pw_min:"Le mot de passe doit contenir au moins 8 caractères.", pw_match:"Les mots de passe ne correspondent pas.", invalid_addr:"Adresse invalide.", invalid_amount:"Montant invalide.", amount_gt0:"Le montant doit être supérieur à 0.", camera_fail:"Impossible d’utiliser la caméra.", qr_ok:"QR capturé.", create_account:"Créer un compte", account_switcher:"Changer de compte", balance:"Solde", estimated_fee:"Frais estimés", fee_pending:"L’aperçu des frais apparaît après avoir saisi la destination et le montant.", history_empty:"Aucune transaction chargée.", from:"De", to_network:"Réseau de destination", from_network:"Réseau d’origine", estimated_receive:"Réception estimée", preview_quote:"Aperçu", session:"Session", security:"Sécurité", vault:"Vault", language:"Langue", global:"Global", local:"Local", native_coin:"monnaie native", use_my_address:"Utiliser mon adresse", network:"Réseau" }),
  de: makeLocale({ dashboard:"Dashboard", send:"Senden", receive:"Empfangen", tokens:"Tokens", activity:"Aktivität", swap:"Swap", bridge:"Bridge", settings:"Einstellungen", create:"Erstellen", import:"Importieren", unlock:"Entsperren", password:"Passwort", confirm:"Bestätigen", seed_new:"Neue Seed-Phrase (12 Wörter)", seed_import:"Seed-Phrase", secure_enter:"Sichern & öffnen", generate:"Generieren", copied:"Kopiert.", scan_qr:"QR scannen", keep_session:"In dieser Sitzung entsperrt bleiben", logout:"Sperren", total_balance:"Gesamtsaldo", refresh_tokens:"Tokens aktualisieren", refresh_activity:"Aktivität aktualisieren", send_token:"Asset senden", token:"Asset", to:"An", amount:"Betrag", sending:"Wird gesendet...", need_gas:"INRI für Gas erforderlich.", your_address:"Ihre Adresse", explorer:"Explorer", add_token:"Token hinzufügen", custom_tokens:"Benutzerdefinierte Tokens", token_symbol:"Symbol", token_decimals:"Dezimalstellen", token_address:"Token-Adresse", token_logo:"Logo (optional)", token_added:"Token hinzugefügt.", avatar:"Avatar", change_avatar:"Avatar ändern", remove_avatar:"Avatar entfernen", delete_vault_confirm:"Lokalen Vault löschen? Sie benötigen die Seed-Phrase zur Wiederherstellung.", wrong_password:"Falsches Passwort.", no_vault:"Kein lokaler Vault gefunden.", invalid_seed:"Ungültige Seed-Phrase.", pw_min:"Passwort muss mindestens 8 Zeichen haben.", pw_match:"Passwörter stimmen nicht überein.", invalid_addr:"Ungültige Adresse.", invalid_amount:"Ungültiger Betrag.", amount_gt0:"Der Betrag muss größer als 0 sein.", camera_fail:"Kamera konnte nicht verwendet werden.", qr_ok:"QR erfasst.", create_account:"Konto erstellen", account_switcher:"Konto wechseln", balance:"Saldo", estimated_fee:"Geschätzte Gebühr", fee_pending:"Die Gebührenvorschau erscheint nach Eingabe von Ziel und Betrag.", history_empty:"Keine Transaktionen geladen.", from:"Von", to_network:"Zielnetzwerk", from_network:"Quellnetzwerk", estimated_receive:"Geschätzter Erhalt", preview_quote:"Vorschau", session:"Sitzung", security:"Sicherheit", vault:"Vault", language:"Sprache", global:"Global", local:"Lokal", native_coin:"native coin", use_my_address:"Meine Adresse verwenden", network:"Netzwerk" }),
  ru: makeLocale({ dashboard:"Панель", send:"Отправить", receive:"Получить", tokens:"Токены", activity:"Активность", swap:"Swap", bridge:"Bridge", settings:"Настройки", create:"Создать", import:"Импорт", unlock:"Разблокировать", password:"Пароль", confirm:"Подтвердить", seed_new:"Новая seed-фраза (12 слов)", seed_import:"Seed-фраза", secure_enter:"Защитить и войти", generate:"Создать", copied:"Скопировано.", scan_qr:"Сканировать QR", keep_session:"Оставаться разблокированным в этой сессии", logout:"Заблокировать", total_balance:"Общий баланс", refresh_tokens:"Обновить токены", refresh_activity:"Обновить активность", send_token:"Отправить актив", token:"Актив", to:"Кому", amount:"Сумма", sending:"Отправка...", need_gas:"Нужен INRI для gas.", your_address:"Ваш адрес", explorer:"Эксплорер", add_token:"Добавить токен", custom_tokens:"Пользовательские токены", token_symbol:"Символ", token_decimals:"Десятичные", token_address:"Адрес токена", token_logo:"Логотип (необязательно)", token_added:"Токен добавлен.", avatar:"Аватар", change_avatar:"Изменить аватар", remove_avatar:"Удалить аватар", balance:"Баланс", estimated_fee:"Комиссия", fee_pending:"Предпросмотр комиссии появится после ввода адреса и суммы.", history_empty:"Нет загруженных транзакций.", from:"От", to_network:"Сеть назначения", from_network:"Исходная сеть", estimated_receive:"Ожидаемое получение", preview_quote:"Предпросмотр", session:"Сессия", security:"Безопасность", vault:"Vault", language:"Язык", global:"Глобально", local:"Локально", native_coin:"нативная монета", use_my_address:"Использовать мой адрес", network:"Сеть", create_account:"Создать аккаунт", account_switcher:"Переключение аккаунта" }),
  tr: makeLocale({ dashboard:"Panel", send:"Gönder", receive:"Al", tokens:"Tokenlar", activity:"Aktivite", swap:"Swap", bridge:"Bridge", settings:"Ayarlar", create:"Oluştur", import:"İçe aktar", unlock:"Kilidi aç", password:"Şifre", confirm:"Onayla", secure_enter:"Koru ve gir", generate:"Oluştur", scan_qr:"QR Tara", logout:"Kilitle", total_balance:"Toplam bakiye", refresh_tokens:"Tokenları yenile", refresh_activity:"Aktiviteyi yenile", send_token:"Varlık gönder", token:"Varlık", to:"Alıcı", amount:"Miktar", your_address:"Adresin", explorer:"Explorer", add_token:"Token ekle", custom_tokens:"Özel tokenlar", token_symbol:"Sembol", token_decimals:"Ondalık", token_address:"Token adresi", token_logo:"Logo (isteğe bağlı)", token_added:"Token eklendi.", avatar:"Avatar", change_avatar:"Avatarı değiştir", remove_avatar:"Avatarı kaldır", balance:"Bakiye", estimated_fee:"Tahmini ücret", history_empty:"İşlem yok.", from:"Kimden", to_network:"Hedef ağ", from_network:"Kaynak ağ", estimated_receive:"Tahmini alım", session:"Oturum", security:"Güvenlik", vault:"Vault", language:"Dil", native_coin:"yerel coin", use_my_address:"Adresimi kullan", create_account:"Hesap oluştur", account_switcher:"Hesap değiştir" }),
  ar: makeLocale({ dashboard:"الواجهة", send:"إرسال", receive:"استلام", tokens:"الرموز", activity:"النشاط", swap:"Swap", bridge:"Bridge", settings:"الإعدادات", create:"إنشاء", import:"استيراد", unlock:"فتح", password:"كلمة المرور", confirm:"تأكيد", secure_enter:"تأمين ودخول", generate:"إنشاء", scan_qr:"مسح QR", logout:"قفل", total_balance:"إجمالي الرصيد", refresh_tokens:"تحديث الرموز", refresh_activity:"تحديث النشاط", send_token:"إرسال أصل", token:"الأصل", to:"إلى", amount:"الكمية", your_address:"عنوانك", explorer:"المستكشف", add_token:"إضافة رمز", custom_tokens:"رموز مخصصة", token_symbol:"الرمز", token_decimals:"الكسور", token_address:"عنوان الرمز", token_logo:"الشعار (اختياري)", avatar:"الصورة", change_avatar:"تغيير الصورة", remove_avatar:"إزالة الصورة", balance:"الرصيد", estimated_fee:"الرسوم التقديرية", history_empty:"لا توجد معاملات.", from:"من", to_network:"شبكة الوجهة", from_network:"شبكة المصدر", estimated_receive:"الاستلام التقديري", session:"الجلسة", security:"الأمان", vault:"Vault", language:"اللغة", native_coin:"عملة أصلية", use_my_address:"استخدام عنواني", create_account:"إنشاء حساب", account_switcher:"تبديل الحساب" }),
  hi: makeLocale({ dashboard:"डैशबोर्ड", send:"भेजें", receive:"प्राप्त करें", tokens:"टोकन", activity:"गतिविधि", swap:"Swap", bridge:"Bridge", settings:"सेटिंग्स", create:"बनाएं", import:"इम्पोर्ट", unlock:"अनलॉक", password:"पासवर्ड", confirm:"पुष्टि", secure_enter:"सुरक्षित करें और प्रवेश करें", generate:"जेनरेट", scan_qr:"QR स्कैन", logout:"लॉक", total_balance:"कुल बैलेंस", refresh_tokens:"टोकन रीफ्रेश", refresh_activity:"गतिविधि रीफ्रेश", send_token:"एसेट भेजें", token:"एसेट", to:"को", amount:"राशि", your_address:"आपका पता", explorer:"एक्सप्लोरर", add_token:"टोकन जोड़ें", custom_tokens:"कस्टम टोकन", token_symbol:"सिंबल", token_decimals:"डेसिमल", token_address:"टोकन पता", token_logo:"लोगो (वैकल्पिक)", avatar:"अवतार", change_avatar:"अवतार बदलें", remove_avatar:"अवतार हटाएं", balance:"बैलेंस", estimated_fee:"अनुमानित शुल्क", history_empty:"कोई ट्रांजैक्शन नहीं.", from:"से", to_network:"गंतव्य नेटवर्क", from_network:"स्रोत नेटवर्क", estimated_receive:"अनुमानित प्राप्ति", session:"सेशन", security:"सुरक्षा", vault:"Vault", language:"भाषा", native_coin:"नेटिव कॉइन", use_my_address:"मेरा पता उपयोग करें", create_account:"अकाउंट बनाएं", account_switcher:"अकाउंट स्विचर" }),
  id: makeLocale({ dashboard:"Dasbor", send:"Kirim", receive:"Terima", tokens:"Token", activity:"Aktivitas", swap:"Swap", bridge:"Bridge", settings:"Pengaturan", create:"Buat", import:"Impor", unlock:"Buka", password:"Kata sandi", confirm:"Konfirmasi", secure_enter:"Amankan & Masuk", generate:"Buat", scan_qr:"Pindai QR", logout:"Kunci", total_balance:"Saldo total", refresh_tokens:"Segarkan token", refresh_activity:"Segarkan aktivitas", send_token:"Kirim aset", token:"Aset", to:"Ke", amount:"Jumlah", your_address:"Alamat Anda", explorer:"Explorer", add_token:"Tambah token", custom_tokens:"Token kustom", token_symbol:"Simbol", token_decimals:"Desimal", token_address:"Alamat token", token_logo:"Logo (opsional)", avatar:"Avatar", change_avatar:"Ganti avatar", remove_avatar:"Hapus avatar", balance:"Saldo", estimated_fee:"Biaya estimasi", history_empty:"Belum ada transaksi.", from:"Dari", to_network:"Jaringan tujuan", from_network:"Jaringan asal", estimated_receive:"Perkiraan diterima", session:"Sesi", security:"Keamanan", vault:"Vault", language:"Bahasa", native_coin:"koin native", use_my_address:"Gunakan alamat saya", create_account:"Buat akun", account_switcher:"Pengalih akun" }),
  vi: makeLocale({ dashboard:"Bảng điều khiển", send:"Gửi", receive:"Nhận", tokens:"Token", activity:"Hoạt động", swap:"Swap", bridge:"Bridge", settings:"Cài đặt", create:"Tạo", import:"Nhập", unlock:"Mở khóa", password:"Mật khẩu", confirm:"Xác nhận", secure_enter:"Bảo vệ & vào", generate:"Tạo", scan_qr:"Quét QR", logout:"Khóa", total_balance:"Tổng số dư", refresh_tokens:"Làm mới token", refresh_activity:"Làm mới hoạt động", send_token:"Gửi tài sản", token:"Tài sản", to:"Đến", amount:"Số lượng", your_address:"Địa chỉ của bạn", explorer:"Explorer", add_token:"Thêm token", custom_tokens:"Token tùy chỉnh", token_symbol:"Ký hiệu", token_decimals:"Số thập phân", token_address:"Địa chỉ token", token_logo:"Logo (tùy chọn)", avatar:"Avatar", change_avatar:"Đổi avatar", remove_avatar:"Xóa avatar", balance:"Số dư", estimated_fee:"Phí ước tính", history_empty:"Chưa có giao dịch.", from:"Từ", to_network:"Mạng đích", from_network:"Mạng nguồn", estimated_receive:"Nhận ước tính", session:"Phiên", security:"Bảo mật", vault:"Vault", language:"Ngôn ngữ", native_coin:"coin gốc", use_my_address:"Dùng địa chỉ của tôi", create_account:"Tạo tài khoản", account_switcher:"Chuyển tài khoản" }),
  th: makeLocale({ dashboard:"แดชบอร์ด", send:"ส่ง", receive:"รับ", tokens:"โทเค็น", activity:"กิจกรรม", swap:"Swap", bridge:"Bridge", settings:"การตั้งค่า", create:"สร้าง", import:"นำเข้า", unlock:"ปลดล็อก", password:"รหัสผ่าน", confirm:"ยืนยัน", secure_enter:"ป้องกันและเข้า", generate:"สร้าง", scan_qr:"สแกน QR", logout:"ล็อก", total_balance:"ยอดคงเหลือรวม", refresh_tokens:"รีเฟรชโทเค็น", refresh_activity:"รีเฟรชกิจกรรม", send_token:"ส่งสินทรัพย์", token:"สินทรัพย์", to:"ถึง", amount:"จำนวน", your_address:"ที่อยู่ของคุณ", explorer:"Explorer", add_token:"เพิ่มโทเค็น", custom_tokens:"โทเค็นกำหนดเอง", token_symbol:"สัญลักษณ์", token_decimals:"ทศนิยม", token_address:"ที่อยู่โทเค็น", token_logo:"โลโก้ (ไม่บังคับ)", token_added:"เพิ่มโทเค็นแล้ว", avatar:"อวตาร", change_avatar:"เปลี่ยนอวตาร", remove_avatar:"ลบอวตาร", balance:"ยอดคงเหลือ", estimated_fee:"ค่าธรรมเนียมโดยประมาณ", history_empty:"ยังไม่มีธุรกรรม", from:"จาก", to_network:"เครือข่ายปลายทาง", from_network:"เครือข่ายต้นทาง", estimated_receive:"จำนวนที่จะได้รับ", preview_quote:"ตัวอย่างราคา", session:"เซสชัน", security:"ความปลอดภัย", vault:"Vault", language:"ภาษา", global:"ทั่วไป", local:"ภายในเครื่อง", native_coin:"เหรียญหลัก", use_my_address:"ใช้ที่อยู่ของฉัน", network:"เครือข่าย", create_account:"สร้างบัญชี", account_switcher:"สลับบัญชี" }),
  zh: makeLocale({ dashboard:"仪表盘", send:"发送", receive:"接收", tokens:"代币", activity:"活动", swap:"Swap", bridge:"Bridge", settings:"设置", create:"创建", import:"导入", unlock:"解锁", password:"密码", confirm:"确认", secure_enter:"保护并进入", generate:"生成", scan_qr:"扫描二维码", logout:"锁定", total_balance:"总余额", refresh_tokens:"刷新代币", refresh_activity:"刷新活动", send_token:"发送资产", token:"资产", to:"到", amount:"数量", your_address:"你的地址", explorer:"浏览器", add_token:"添加代币", custom_tokens:"自定义代币", token_symbol:"符号", token_decimals:"小数位", token_address:"代币地址", token_logo:"Logo（可选）", avatar:"头像", change_avatar:"更改头像", remove_avatar:"删除头像", balance:"余额", estimated_fee:"预估费用", history_empty:"暂无交易。", from:"从", to_network:"目标网络", from_network:"来源网络", estimated_receive:"预计收到", session:"会话", security:"安全", vault:"Vault", language:"语言", native_coin:"原生代币", use_my_address:"使用我的地址", create_account:"创建账户", account_switcher:"账户切换" }),
  ja: makeLocale({ dashboard:"ダッシュボード", send:"送金", receive:"受取", tokens:"トークン", activity:"アクティビティ", swap:"Swap", bridge:"Bridge", settings:"設定", create:"作成", import:"インポート", unlock:"ロック解除", password:"パスワード", confirm:"確認", secure_enter:"保護して入る", generate:"生成", scan_qr:"QRをスキャン", logout:"ロック", total_balance:"合計残高", refresh_tokens:"トークン更新", refresh_activity:"アクティビティ更新", send_token:"資産を送る", token:"資産", to:"宛先", amount:"数量", your_address:"あなたのアドレス", explorer:"エクスプローラー", add_token:"トークン追加", custom_tokens:"カスタムトークン", token_symbol:"シンボル", token_decimals:"小数", token_address:"トークンアドレス", token_logo:"ロゴ（任意）", avatar:"アバター", change_avatar:"アバター変更", remove_avatar:"アバター削除", balance:"残高", estimated_fee:"推定手数料", history_empty:"取引はありません。", from:"送信元", to_network:"送信先ネットワーク", from_network:"送信元ネットワーク", estimated_receive:"推定受取額", session:"セッション", security:"セキュリティ", vault:"Vault", language:"言語", native_coin:"ネイティブコイン", use_my_address:"自分のアドレスを使う", create_account:"アカウント作成", account_switcher:"アカウント切替" }),
  ko: makeLocale({ dashboard:"대시보드", send:"보내기", receive:"받기", tokens:"토큰", activity:"활동", swap:"Swap", bridge:"Bridge", settings:"설정", create:"생성", import:"가져오기", unlock:"잠금 해제", password:"비밀번호", confirm:"확인", secure_enter:"보호 후 진입", generate:"생성", scan_qr:"QR 스캔", logout:"잠금", total_balance:"총 잔액", refresh_tokens:"토큰 새로고침", refresh_activity:"활동 새로고침", send_token:"자산 보내기", token:"자산", to:"받는 주소", amount:"수량", your_address:"내 주소", explorer:"탐색기", add_token:"토큰 추가", custom_tokens:"사용자 지정 토큰", token_symbol:"심볼", token_decimals:"소수점", token_address:"토큰 주소", token_logo:"로고 (선택)", avatar:"아바타", change_avatar:"아바타 변경", remove_avatar:"아바타 삭제", balance:"잔액", estimated_fee:"예상 수수료", history_empty:"거래가 없습니다.", from:"보내는 쪽", to_network:"대상 네트워크", from_network:"출발 네트워크", estimated_receive:"예상 수령", session:"세션", security:"보안", vault:"Vault", language:"언어", native_coin:"네이티브 코인", use_my_address:"내 주소 사용", create_account:"계정 만들기", account_switcher:"계정 전환" }),
};

function tr(lang: Lang, key: UIKey) {
  return TRANSLATIONS[lang]?.[key] ?? PT[key] ?? EN[key] ?? key;
}

const DEFAULT_TOKENS: Token[] = [
  {
    symbol: "iUSD",
    address: "0x116b2fF23e062A52E2c0ea12dF7e2638b62Fa0FC",
    decimals: 6,
    logo: assetUrl("token-iusd.png"),
  },
  {
    symbol: "WINRI",
    address: "0x8731F1709745173470821eAeEd9BC600EEC9A3D1",
    decimals: 18,
    logo: assetUrl("token-winri.png"),
  },
  {
    symbol: "DNR",
    address: "0xDa9541bB01d9EC1991328516C71B0E539a97d27f",
    decimals: 18,
    logo: assetUrl("token-dnr.png"),
  },
];

const PREVIEW_PRICES: Record<string, number> = {
  INRI: 1,
  iUSD: 1,
  WINRI: 1,
  DNR: 1,
};

function shortAddr(a: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

function getAssetLogo(symbol: string) {
  const s = symbol.toUpperCase();
  if (s === "INRI") return assetUrl("token-inri.png");
  if (s === "IUSD") return assetUrl("token-iusd.png");
  if (s === "WINRI") return assetUrl("token-winri.png");
  if (s === "DNR") return assetUrl("token-dnr.png");
  return "";
}

function getTokenInitials(symbol: string) {
  const clean = (symbol || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!clean) return "??";
  return clean.slice(0, Math.min(4, clean.length));
}

function getAssetMeta(symbol: string, tokens: Token[]) {
  if (symbol.toUpperCase() === "INRI") {
    return { symbol: "INRI", logo: assetUrl("token-inri.png") };
  }
  const found = tokens.find((t) => t.symbol === symbol);
  return { symbol, logo: found?.logo || getAssetLogo(symbol) || "" };
}

function getExtraCopy(lang: Lang) {
  const copy = {
    en: {
      scanner_hint: "Point the camera at a QR code. The wallet address will fill automatically.",
      online: "Online",
      offline: "Offline",
      official_pwa: "Official PWA • INRI CHAIN",
      wallet: "Wallet",
      not_unlocked: "Not unlocked",
      live_balances: "Auto balances (ERC-20)",
      tip_decimals: "Tip: iUSD = 6 decimals. WINRI/DNR = 18.",
      new_account_created: "New account created.",
      symbol_required: "Symbol required.",
      invalid_token_address: "Invalid token address.",
      invalid_decimals: "Invalid decimals.",
      reset: "Reset",
      preview_contracts: "Fee and final quote will update when real swap contracts are connected.",
      preview_bridge: "Final bridge fee and route will update when bridge contracts are connected.",
      bridge_preview: "Bridge preview",
      bridge_fee_note: "Preview uses your bridge fee of 0.2%.",
      path: "Path",
      launch: "Launch",
      rpc_issue: "RPC issue",
      keep_session_hint: "When you close the app, it will ask for your password again.",
      backup_seed: "{copy2.backup_seed}",
      stored_local: "{copy2.stored_local}",
      stored_local_short: "Seed is encrypted on your device.",
      password_placeholder: "password...",
      amount_paid_note: "Amount paid to process the transaction on network.",
      appearance: "Appearance",
      dark_mode: "Dark mode",
      silver_mode: "Silver mode",
      remove: "Remove",
      remove_token: "Remove token",
      custom_token_list: "Custom token list",
      remove_token_confirm: "Remove this custom token?",
      token_removed: "Token removed.",
    },
    pt: {
      scanner_hint: "Aponte a câmera para um QR code. O endereço será preenchido automaticamente.",
      online: "Online",
      offline: "Offline",
      official_pwa: "PWA oficial • INRI CHAIN",
      wallet: "Carteira",
      not_unlocked: "Bloqueada",
      live_balances: "Saldos automáticos (ERC-20)",
      tip_decimals: "Dica: iUSD = 6 decimais. WINRI/DNR = 18.",
      new_account_created: "Nova conta criada.",
      symbol_required: "Símbolo obrigatório.",
      invalid_token_address: "Endereço do token inválido.",
      invalid_decimals: "Decimais inválidos.",
      reset: "Resetar",
      preview_contracts: "Taxa e cotação final serão atualizadas quando os contratos reais de swap forem conectados.",
      preview_bridge: "Taxa final e rota da bridge serão atualizadas quando os contratos da bridge forem conectados.",
      bridge_preview: "Prévia da bridge",
      bridge_fee_note: "A prévia usa a sua taxa de bridge de 0,2%.",
      path: "Caminho",
      launch: "Abrir",
      rpc_issue: "Problema no RPC",
      keep_session_hint: "Ao fechar o app, ele volta a pedir sua senha.",
      backup_seed: "Guarde sua seed offline. Ninguém pode recuperar seus fundos.",
      stored_local: "Esta carteira guarda sua seed criptografada localmente (PWA).",
      stored_local_short: "A seed fica criptografada no seu dispositivo.",
      password_placeholder: "senha...",
      amount_paid_note: "Valor pago para processar a transação na rede.",
      appearance: "Aparência",
      dark_mode: "Modo escuro",
      silver_mode: "Modo prata",
      remove: "Remover",
      remove_token: "Remover token",
      custom_token_list: "Lista de tokens manuais",
      remove_token_confirm: "Remover este token manual?",
      token_removed: "Token removido.",
    },
    es: {
      scanner_hint: "Apunta la cámara al código QR. La dirección se completará automáticamente.",
      online: "En línea", offline: "Sin conexión", official_pwa: "PWA oficial • INRI CHAIN", wallet: "Billetera", not_unlocked: "Bloqueada", live_balances: "Saldos automáticos (ERC-20)", tip_decimals: "Consejo: iUSD = 6 decimales. WINRI/DNR = 18.", new_account_created: "Nueva cuenta creada.", symbol_required: "Símbolo obligatorio.", invalid_token_address: "Dirección de token inválida.", invalid_decimals: "Decimales inválidos.", reset: "Restablecer", preview_contracts: "La tarifa y la cotización final se actualizarán cuando los contratos reales de swap estén conectados.", preview_bridge: "La tarifa final y la ruta del bridge se actualizarán cuando los contratos del bridge estén conectados.", bridge_preview: "Vista previa del bridge", bridge_fee_note: "La vista previa usa tu tarifa de bridge del 0,2%.", path: "Ruta"
    },
    fr: {scanner_hint:"Pointez la caméra vers un QR code. L’adresse sera remplie automatiquement.",online:"En ligne",offline:"Hors ligne",official_pwa:"PWA officiel • INRI CHAIN",wallet:"Portefeuille",not_unlocked:"Verrouillé",live_balances:"Soldes automatiques (ERC-20)",tip_decimals:"Astuce : iUSD = 6 décimales. WINRI/DNR = 18.",new_account_created:"Nouveau compte créé.",symbol_required:"Symbole requis.",invalid_token_address:"Adresse du token invalide.",invalid_decimals:"Décimales invalides.",reset:"Réinitialiser",preview_contracts:"Les frais et le devis final seront mis à jour lorsque les vrais contrats de swap seront connectés.",preview_bridge:"Les frais finaux et l’itinéraire du bridge seront mis à jour lorsque les contrats du bridge seront connectés.",bridge_preview:"Aperçu du bridge",bridge_fee_note:"L’aperçu utilise vos frais de bridge de 0,2 %.",path:"Chemin"},
    de: {scanner_hint:"Richte die Kamera auf einen QR-Code. Die Adresse wird automatisch ausgefüllt.",online:"Online",offline:"Offline",official_pwa:"Offizielle PWA • INRI CHAIN",wallet:"Wallet",not_unlocked:"Gesperrt",live_balances:"Automatische Guthaben (ERC-20)",tip_decimals:"Hinweis: iUSD = 6 Dezimalstellen. WINRI/DNR = 18.",new_account_created:"Neues Konto erstellt.",symbol_required:"Symbol erforderlich.",invalid_token_address:"Ungültige Token-Adresse.",invalid_decimals:"Ungültige Dezimalstellen.",reset:"Zurücksetzen",preview_contracts:"Gebühr und endgültiges Angebot werden aktualisiert, wenn echte Swap-Verträge verbunden sind.",preview_bridge:"Endgültige Bridge-Gebühr und Route werden aktualisiert, wenn die Bridge-Verträge verbunden sind.",bridge_preview:"Bridge-Vorschau",bridge_fee_note:"Die Vorschau verwendet Ihre Bridge-Gebühr von 0,2 %.",path:"Pfad"},
    ru: {scanner_hint:"Наведите камеру на QR-код. Адрес заполнится автоматически.",online:"Онлайн",offline:"Офлайн",official_pwa:"Официальный PWA • INRI CHAIN",wallet:"Кошелек",not_unlocked:"Заблокирован",live_balances:"Автобалансы (ERC-20)",tip_decimals:"Подсказка: iUSD = 6 знаков. WINRI/DNR = 18.",new_account_created:"Новый аккаунт создан.",symbol_required:"Требуется символ.",invalid_token_address:"Неверный адрес токена.",invalid_decimals:"Неверные десятичные знаки.",reset:"Сброс",preview_contracts:"Комиссия и финальная котировка обновятся после подключения реальных swap-контрактов.",preview_bridge:"Финальная комиссия и маршрут bridge обновятся после подключения bridge-контрактов.",bridge_preview:"Предпросмотр bridge",bridge_fee_note:"Предпросмотр использует вашу комиссию bridge 0,2 %.",path:"Путь"},
    tr: {scanner_hint:"Kamerayı QR koda doğrultun. Cüzdan adresi otomatik doldurulur.",online:"Çevrimiçi",offline:"Çevrimdışı",official_pwa:"Resmi PWA • INRI CHAIN",wallet:"Cüzdan",not_unlocked:"Kilitli",live_balances:"Otomatik bakiyeler (ERC-20)",tip_decimals:"İpucu: iUSD = 6 ondalık. WINRI/DNR = 18.",new_account_created:"Yeni hesap oluşturuldu.",symbol_required:"Sembol gerekli.",invalid_token_address:"Geçersiz token adresi.",invalid_decimals:"Geçersiz ondalık.",reset:"Sıfırla",preview_contracts:"Gerçek swap sözleşmeleri bağlandığında ücret ve nihai teklif güncellenecek.",preview_bridge:"Gerçek bridge sözleşmeleri bağlandığında nihai bridge ücreti ve rota güncellenecek.",bridge_preview:"Bridge önizleme",bridge_fee_note:"Önizleme, %0,2 bridge ücretinizi kullanır.",path:"Yol"},
    ar: {scanner_hint:"وجّه الكاميرا إلى رمز QR وسيتم تعبئة العنوان تلقائيًا.",online:"متصل",offline:"غير متصل",official_pwa:"تطبيق PWA الرسمي • INRI CHAIN",wallet:"المحفظة",not_unlocked:"مقفلة",live_balances:"الأرصدة التلقائية (ERC-20)",tip_decimals:"ملاحظة: iUSD = 6 منازل عشرية. WINRI/DNR = 18.",new_account_created:"تم إنشاء حساب جديد.",symbol_required:"الرمز مطلوب.",invalid_token_address:"عنوان التوكن غير صالح.",invalid_decimals:"المنازل العشرية غير صالحة.",reset:"إعادة تعيين",preview_contracts:"سيتم تحديث الرسوم والسعر النهائي عند ربط عقود المبادلة الحقيقية.",preview_bridge:"سيتم تحديث رسوم الجسر النهائية والمسار عند ربط عقود الجسر.",bridge_preview:"معاينة الجسر",bridge_fee_note:"تستخدم المعاينة رسوم الجسر الخاصة بك 0.2٪.",path:"المسار"},
    hi: {scanner_hint:"कैमरा QR कोड पर रखें। वॉलेट पता अपने आप भर जाएगा।",online:"ऑनलाइन",offline:"ऑफ़लाइन",official_pwa:"आधिकारिक PWA • INRI CHAIN",wallet:"वॉलेट",not_unlocked:"लॉक",live_balances:"ऑटो बैलेंस (ERC-20)",tip_decimals:"टिप: iUSD = 6 दशमलव। WINRI/DNR = 18.",new_account_created:"नया खाता बनाया गया।",symbol_required:"सिंबल आवश्यक है।",invalid_token_address:"अमान्य टोकन पता।",invalid_decimals:"अमान्य दशमलव।",reset:"रीसेट",preview_contracts:"जब वास्तविक swap कॉन्ट्रैक्ट जुड़ेंगे तब शुल्क और अंतिम quote अपडेट होगा।",preview_bridge:"जब bridge कॉन्ट्रैक्ट जुड़ेंगे तब अंतिम bridge शुल्क और route अपडेट होगा।",bridge_preview:"Bridge प्रीव्यू",bridge_fee_note:"प्रीव्यू आपकी 0.2% bridge फीस का उपयोग करता है।",path:"पाथ"},
    id: {scanner_hint:"Arahkan kamera ke kode QR. Alamat dompet akan terisi otomatis.",online:"Online",offline:"Offline",official_pwa:"PWA resmi • INRI CHAIN",wallet:"Dompet",not_unlocked:"Terkunci",live_balances:"Saldo otomatis (ERC-20)",tip_decimals:"Tip: iUSD = 6 desimal. WINRI/DNR = 18.",new_account_created:"Akun baru dibuat.",symbol_required:"Simbol wajib diisi.",invalid_token_address:"Alamat token tidak valid.",invalid_decimals:"Desimal tidak valid.",reset:"Reset",preview_contracts:"Biaya dan kuotasi akhir akan diperbarui saat kontrak swap nyata terhubung.",preview_bridge:"Biaya bridge akhir dan rute akan diperbarui saat kontrak bridge terhubung.",bridge_preview:"Pratinjau bridge",bridge_fee_note:"Pratinjau menggunakan biaya bridge 0,2% Anda.",path:"Path"},
    vi: {scanner_hint:"Hướng camera vào mã QR. Địa chỉ ví sẽ được điền tự động.",online:"Trực tuyến",offline:"Ngoại tuyến",official_pwa:"PWA chính thức • INRI CHAIN",wallet:"Ví",not_unlocked:"Đã khóa",live_balances:"Số dư tự động (ERC-20)",tip_decimals:"Mẹo: iUSD = 6 số thập phân. WINRI/DNR = 18.",new_account_created:"Đã tạo tài khoản mới.",symbol_required:"Cần ký hiệu.",invalid_token_address:"Địa chỉ token không hợp lệ.",invalid_decimals:"Số thập phân không hợp lệ.",reset:"Đặt lại",preview_contracts:"Phí và báo giá cuối cùng sẽ cập nhật khi các hợp đồng swap thật được kết nối.",preview_bridge:"Phí bridge cuối cùng và tuyến sẽ cập nhật khi các hợp đồng bridge được kết nối.",bridge_preview:"Xem trước bridge",bridge_fee_note:"Bản xem trước dùng phí bridge 0,2% của bạn.",path:"Đường dẫn"},
    th: {scanner_hint:"หันกล้องไปที่คิวอาร์โค้ด ระบบจะกรอกที่อยู่ให้อัตโนมัติ",online:"ออนไลน์",offline:"ออฟไลน์",official_pwa:"PWA อย่างเป็นทางการ • INRI CHAIN",wallet:"กระเป๋า",not_unlocked:"ล็อกอยู่",live_balances:"ยอดคงเหลืออัตโนมัติ (ERC-20)",tip_decimals:"เคล็ดลับ: iUSD = 6 ตำแหน่งทศนิยม WINRI/DNR = 18",new_account_created:"สร้างบัญชีใหม่แล้ว",symbol_required:"ต้องใส่สัญลักษณ์",invalid_token_address:"ที่อยู่โทเคนไม่ถูกต้อง",invalid_decimals:"จำนวนทศนิยมไม่ถูกต้อง",reset:"รีเซ็ต",preview_contracts:"ค่าธรรมเนียมและราคาสุดท้ายจะอัปเดตเมื่อเชื่อมต่อสัญญา swap จริง",preview_bridge:"ค่าธรรมเนียม bridge และเส้นทางสุดท้ายจะอัปเดตเมื่อเชื่อมต่อสัญญา bridge",bridge_preview:"พรีวิว bridge",bridge_fee_note:"พรีวิวนี้ใช้ค่าธรรมเนียม bridge ของคุณ 0.2%",path:"พาธ"},
    zh: {scanner_hint:"将相机对准二维码，钱包地址会自动填入。",online:"在线",offline:"离线",official_pwa:"官方 PWA • INRI CHAIN",wallet:"钱包",not_unlocked:"未解锁",live_balances:"自动余额（ERC-20）",tip_decimals:"提示：iUSD = 6 位小数。WINRI/DNR = 18。",new_account_created:"新账户已创建。",symbol_required:"必须填写符号。",invalid_token_address:"无效的代币地址。",invalid_decimals:"无效的小数位。",reset:"重置",preview_contracts:"连接真实的 swap 合约后，费用和最终报价会更新。",preview_bridge:"连接 bridge 合约后，最终 bridge 费用和路由会更新。",bridge_preview:"Bridge 预览",bridge_fee_note:"预览使用你的 0.2% bridge 费率。",path:"路径"},
    ja: {scanner_hint:"カメラをQRコードに向けると、ウォレットアドレスが自動入力されます。",online:"オンライン",offline:"オフライン",official_pwa:"公式PWA • INRI CHAIN",wallet:"ウォレット",not_unlocked:"未解除",live_balances:"自動残高 (ERC-20)",tip_decimals:"ヒント: iUSD = 6桁。WINRI/DNR = 18。",new_account_created:"新しいアカウントを作成しました。",symbol_required:"シンボルは必須です。",invalid_token_address:"無効なトークンアドレスです。",invalid_decimals:"無効な小数桁です。",reset:"リセット",preview_contracts:"実際のswapコントラクトが接続されると、手数料と最終見積もりが更新されます。",preview_bridge:"bridgeコントラクトが接続されると、最終bridge手数料とルートが更新されます。",bridge_preview:"Bridgeプレビュー",bridge_fee_note:"プレビューでは0.2%のbridge手数料を使用します。",path:"パス"},
    ko: {scanner_hint:"카메라를 QR 코드에 맞추면 지갑 주소가 자동으로 입력됩니다.",online:"온라인",offline:"오프라인",official_pwa:"공식 PWA • INRI CHAIN",wallet:"지갑",not_unlocked:"잠김",live_balances:"자동 잔액 (ERC-20)",tip_decimals:"팁: iUSD = 소수점 6자리, WINRI/DNR = 18자리입니다.",new_account_created:"새 계정이 생성되었습니다.",symbol_required:"심볼이 필요합니다.",invalid_token_address:"잘못된 토큰 주소입니다.",invalid_decimals:"잘못된 소수 자릿수입니다.",reset:"재설정",preview_contracts:"실제 swap 계약이 연결되면 수수료와 최종 견적이 업데이트됩니다.",preview_bridge:"bridge 계약이 연결되면 최종 bridge 수수료와 경로가 업데이트됩니다.",bridge_preview:"Bridge 미리보기",bridge_fee_note:"미리보기에는 0.2% bridge 수수료가 적용됩니다.",path:"경로"},
  } as const;
  return { ...copy.en, ...(copy[lang] ?? {}) };
}

function loadLocalTxs(): LocalTx[] {
  try {
    return JSON.parse(localStorage.getItem(TXS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalTxs(next: LocalTx[]) {
  localStorage.setItem(TXS_KEY, JSON.stringify(next));
}

function addLocalTx(tx: LocalTx) {
  const current = loadLocalTxs();
  saveLocalTxs([tx, ...current]);
}

async function fetchERC20Balance(provider: ethers.JsonRpcProvider, token: Token, owner: string) {
  const abi = ["function balanceOf(address) view returns (uint256)"];
  const c = new ethers.Contract(token.address, abi, provider);
  const raw: bigint = await c.balanceOf(owner);
  return ethers.formatUnits(raw, token.decimals);
}

async function sendERC20(
  provider: ethers.JsonRpcProvider,
  mnemonic: string,
  index: number,
  token: Token,
  to: string,
  amount: string
) {
  const abi = ["function transfer(address to, uint256 amount) returns (bool)"];
  const wallet = walletFromMnemonicIndex(mnemonic, index).connect(provider);
  const c = new ethers.Contract(token.address, abi, wallet);
  const value = ethers.parseUnits(amount, token.decimals);
  return c.transfer(to, value);
}

function computePreviewReceive(fromSymbol: string, toSymbol: string, amount: string, feeBps = 30) {
  const num = Number(amount || "0");
  if (!Number.isFinite(num) || num <= 0) return "0.000000";
  const fromP = PREVIEW_PRICES[fromSymbol] ?? 1;
  const toP = PREVIEW_PRICES[toSymbol] ?? 1;
  const gross = (num * fromP) / toP;
  const net = gross * (1 - feeBps / 10000);
  return net.toFixed(6);
}

function computeBridgeReceive(amount: string, feeBps = 20) {
  const num = Number(amount || "0");
  if (!Number.isFinite(num) || num <= 0) return "0.000000";
  return (num * (1 - feeBps / 10000)).toFixed(6);
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) as Lang) || "en");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => (localStorage.getItem(THEME_KEY) as ThemeMode) || "dark");

  const [view, setView] = useState<View>(loadVault() ? "unlock" : "welcome");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [toast, setToast] = useState("");

  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [networkOk, setNetworkOk] = useState(false);

  const [mnemonic, setMnemonic] = useState("");
  const [newMnemonic, setNewMnemonic] = useState("");
  const [importMnemonic, setImportMnemonic] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [unlockPw, setUnlockPw] = useState("");

  const [keepSession, setKeepSession] = useState(true);

  const [accountCount, setAccountCount] = useState(5);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [balance, setBalance] = useState("0.0");

  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [sendAsset, setSendAsset] = useState<string>("INRI");
  const [estimatedGasFee, setEstimatedGasFee] = useState<string>("");

  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [txs, setTxs] = useState<any[]>([]);
  const [loadingTxs] = useState(false);

  const [customTokens, setCustomTokens] = useState<Token[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(TOKENS_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const [avatar, setAvatar] = useState<string>(() => localStorage.getItem(AVATAR_KEY) || "");

  const [scanOpen, setScanOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const [tokSymbol, setTokSymbol] = useState("");
  const [tokAddr, setTokAddr] = useState("");
  const [tokDec, setTokDec] = useState("18");
  const [tokLogo, setTokLogo] = useState("");

  const [swapFromAsset, setSwapFromAsset] = useState("INRI");
  const [swapToAsset, setSwapToAsset] = useState("WINRI");
  const [swapAmount, setSwapAmount] = useState("");

  const [bridgeFromNetwork, setBridgeFromNetwork] = useState("INRI CHAIN");
  const [bridgeToNetwork, setBridgeToNetwork] = useState("Polygon");
  const [bridgeAsset, setBridgeAsset] = useState("iUSD");
  const [bridgeAmount, setBridgeAmount] = useState("");

  const TOKENS = useMemo(() => {
    const merged = [...DEFAULT_TOKENS, ...customTokens];
    const seen = new Set<string>();
    return merged.filter((t) => {
      const key = `${t.symbol.toLowerCase()}_${t.address.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [customTokens]);

  const accounts = useMemo(
    () => (mnemonic ? deriveAddressesFromMnemonic(mnemonic, accountCount) : []),
    [mnemonic, accountCount]
  );

  const selected = accounts.find((a) => a.index === selectedIndex)?.address || "";

  const swapReceivePreview = useMemo(
    () => computePreviewReceive(swapFromAsset, swapToAsset, swapAmount, 30),
    [swapFromAsset, swapToAsset, swapAmount]
  );

  const bridgeReceivePreview = useMemo(
    () => computeBridgeReceive(bridgeAmount, 20),
    [bridgeAmount]
  );

  const copy2 = useMemo(() => getExtraCopy(lang), [lang]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  }

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, themeMode);
    document.body.setAttribute("data-theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (s && s.split(" ").length >= 12) {
      setMnemonic(s);
      setView("wallet");
      setTab("dashboard");
    }
  }, []);

  useEffect(() => {
    const p = new ethers.JsonRpcProvider(INRI.rpcUrls[0], {
      name: "inri",
      chainId: INRI.chainIdDec,
    });
    setProvider(p);
  }, []);

  useEffect(() => {
    let stop = false;
    async function poll() {
      if (!provider) return;
      try {
        const net = await provider.getNetwork();
        if (stop) return;
        const cid = Number(net.chainId);
        setChainId(cid);
        setNetworkOk(cid === INRI.chainIdDec);
      } catch {
        if (!stop) setNetworkOk(false);
      }
    }
    poll();
    const timer = setInterval(poll, 6000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [provider]);

  useEffect(() => {
    let stop = false;
    async function loadBal() {
      if (!provider || !selected) return;
      try {
        const b = await provider.getBalance(selected);
        if (stop) return;
        setBalance(ethers.formatEther(b));
      } catch {
        if (!stop) setBalance("0.0");
      }
    }
    loadBal();
    const timer = setInterval(loadBal, 7000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [provider, selected]);

  useEffect(() => {
    if (view !== "wallet") return;
    refreshTokens();
    refreshHistory();
  }, [view, selected]);

  useEffect(() => {
    estimateSendFee();
  }, [provider, selected, mnemonic, selectedIndex, sendTo, sendAmount, sendAsset]);

  async function estimateSendFee() {
    if (!provider || !selected || !sendTo || !sendAmount) {
      setEstimatedGasFee("");
      return;
    }

    try {
      const feeData = await provider.getFeeData();

      if (sendAsset === "INRI") {
        const value = ethers.parseEther(sendAmount || "0");
        const gas = await provider.estimateGas({
          from: selected,
          to: sendTo,
          value,
        });

        const gasPrice = feeData.gasPrice ?? 0n;
        const total = gas * gasPrice;
        setEstimatedGasFee(ethers.formatEther(total));
        return;
      }

      const token = TOKENS.find((t) => t.symbol === sendAsset);
      if (!token || !mnemonic) {
        setEstimatedGasFee("");
        return;
      }

      const wallet = walletFromMnemonicIndex(mnemonic, selectedIndex).connect(provider);
      const abi = ["function transfer(address to, uint256 amount) returns (bool)"];
      const c = new ethers.Contract(token.address, abi, wallet);
      const value = ethers.parseUnits(sendAmount || "0", token.decimals);

      const gas = await c.transfer.estimateGas(sendTo, value);
      const gasPrice = feeData.gasPrice ?? 0n;
      const total = gas * gasPrice;
      setEstimatedGasFee(ethers.formatEther(total));
    } catch {
      setEstimatedGasFee("");
    }
  }

  async function refreshTokens() {
    if (!provider || !selected) return;
    const out: Record<string, string> = {};
    for (const t of TOKENS) {
      if (!ethers.isAddress(t.address) || t.address === ethers.ZeroAddress) {
        out[t.symbol] = "—";
        continue;
      }
      try {
        out[t.symbol] = await fetchERC20Balance(provider, t, selected);
      } catch {
        out[t.symbol] = "—";
      }
    }
    setTokenBalances(out);
  }

  async function refreshHistory() {
    if (!selected) return;

    const local = loadLocalTxs().filter(
      (tx) => tx.from?.toLowerCase() === selected.toLowerCase() || tx.to.toLowerCase() === selected.toLowerCase()
    );

    let remote: any[] = [];

    if (INRI.explorerApiBase) {
      try {
        const url = `${INRI.explorerApiBase}/addresses/${selected}/transactions?limit=20`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          remote = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        }
      } catch {}
    }

    const merged = [...local, ...remote];
    setTxs(merged);
  }

  function generateSeed() {
    const m = createMnemonic12();
    setNewMnemonic(m);
    showToast("Seed generated. Save offline.");
  }

  async function createWallet() {
    if (!newMnemonic) return showToast("Generate seed first.");
    if (pw.length < 8) return showToast(tr(lang, "pw_min"));
    if (pw !== pw2) return showToast(tr(lang, "pw_match"));

    const vault = await encryptMnemonicToVault(newMnemonic, pw);
    saveVault(vault);
    setMnemonic(newMnemonic);
    if (keepSession) sessionStorage.setItem(SESSION_KEY, newMnemonic);

    setView("wallet");
    setTab("dashboard");
    showToast("Wallet created.");
  }

  async function importWallet() {
    const m = importMnemonic.trim().toLowerCase().replace(/\s+/g, " ");
    if (!isValidMnemonic(m)) return showToast(tr(lang, "invalid_seed"));
    if (pw.length < 8) return showToast(tr(lang, "pw_min"));
    if (pw !== pw2) return showToast(tr(lang, "pw_match"));

    const vault = await encryptMnemonicToVault(m, pw);
    saveVault(vault);
    setMnemonic(m);
    if (keepSession) sessionStorage.setItem(SESSION_KEY, m);

    setView("wallet");
    setTab("dashboard");
    showToast("Wallet imported.");
  }

  async function unlock() {
    const vault = loadVault();
    if (!vault) return showToast(tr(lang, "no_vault"));
    try {
      const m = await decryptMnemonicFromVault(vault, unlockPw);
      setMnemonic(m);
      if (keepSession) sessionStorage.setItem(SESSION_KEY, m);
      setView("wallet");
      setTab("dashboard");
      showToast("Unlocked.");
    } catch {
      showToast(tr(lang, "wrong_password"));
    }
  }

  function lock() {
    setMnemonic("");
    setUnlockPw("");
    sessionStorage.removeItem(SESSION_KEY);
    setView(loadVault() ? "unlock" : "welcome");
    showToast("Locked.");
  }

  function resetLocal() {
    if (!confirm(tr(lang, "delete_vault_confirm"))) return;
    clearVault();
    sessionStorage.removeItem(SESSION_KEY);
    setMnemonic("");
    setNewMnemonic("");
    setImportMnemonic("");
    setPw("");
    setPw2("");
    setUnlockPw("");
    setView("welcome");
    showToast("Local vault deleted.");
  }

  async function sendNow() {
    if (!provider || !mnemonic || !selected) return;

    const to = sendTo.trim();
    if (!ethers.isAddress(to)) return showToast(tr(lang, "invalid_addr"));
    if (!sendAmount) return showToast(tr(lang, "invalid_amount"));

    setSending(true);
    try {
      if (sendAsset === "INRI") {
        let valueWei: bigint;
        try {
          valueWei = ethers.parseEther(sendAmount || "0");
        } catch {
          setSending(false);
          return showToast(tr(lang, "invalid_amount"));
        }
        if (valueWei <= 0n) {
          setSending(false);
          return showToast(tr(lang, "amount_gt0"));
        }

        const wallet = walletFromMnemonicIndex(mnemonic, selectedIndex).connect(provider);
        const tx = await wallet.sendTransaction({ to, value: valueWei });

        addLocalTx({
          hash: tx.hash,
          from: wallet.address,
          to,
          symbol: "INRI",
          amount: sendAmount,
          createdAt: new Date().toISOString(),
          source: "local",
        });

        showToast(`Sent ${sendAmount} INRI`);
      } else {
        const token = TOKENS.find((t) => t.symbol === sendAsset);
        if (!token) throw new Error("Token not found");

        const wallet = walletFromMnemonicIndex(mnemonic, selectedIndex).connect(provider);
        const tx = await sendERC20(provider, mnemonic, selectedIndex, token, to, sendAmount);

        addLocalTx({
          hash: tx.hash,
          from: wallet.address,
          to,
          symbol: token.symbol,
          amount: sendAmount,
          createdAt: new Date().toISOString(),
          source: "local",
        });

        showToast(`Sent ${sendAmount} ${token.symbol}`);
        setTimeout(() => refreshTokens(), 1200);
      }

      setSendTo("");
      setSendAmount("");
      setTab("activity");
      setTimeout(() => refreshHistory(), 800);
    } catch (e: any) {
      showToast(e?.shortMessage || e?.message || "Send failed.");
    } finally {
      setSending(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(tr(lang, "copied"));
    } catch {
      showToast("Copy failed.");
    }
  }

  function openExplorerAddress(addr: string) {
    window.open(`${INRI.blockExplorerUrls[0]}/address/${addr}`, "_blank", "noopener,noreferrer");
  }

  function openExplorerTx(hash: string) {
    window.open(`${INRI.blockExplorerUrls[0]}/tx/${hash}`, "_blank", "noopener,noreferrer");
  }

  function onAvatarFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setAvatar(dataUrl);
      localStorage.setItem(AVATAR_KEY, dataUrl);
      showToast("Avatar updated.");
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatar("");
    localStorage.removeItem(AVATAR_KEY);
    showToast("Avatar removed.");
  }

  function addCustomToken() {
    const sym = tokSymbol.trim().toUpperCase();
    const addr = tokAddr.trim();
    const dec = Number(tokDec);

    if (!sym) return showToast(copy2.symbol_required);
    if (!ethers.isAddress(addr)) return showToast(copy2.invalid_token_address);
    if (!Number.isFinite(dec) || dec < 0 || dec > 36) return showToast(copy2.invalid_decimals);

    const token: Token = {
      symbol: sym,
      address: addr,
      decimals: dec,
      logo: tokLogo.trim() || undefined,
    };

    const next = [...customTokens, token];
    setCustomTokens(next);
    localStorage.setItem(TOKENS_KEY, JSON.stringify(next));
    setTokSymbol("");
    setTokAddr("");
    setTokDec("18");
    setTokLogo("");
    showToast(tr(lang, "token_added"));
    setTimeout(() => refreshTokens(), 500);
  }

  function removeCustomToken(symbol: string, address: string) {
    if (!window.confirm(copy2.remove_token_confirm)) return;
    const next = customTokens.filter((t) => !(t.symbol === symbol && t.address === address));
    setCustomTokens(next);
    localStorage.setItem(TOKENS_KEY, JSON.stringify(next));
    showToast(copy2.token_removed);
    setTimeout(() => refreshTokens(), 300);
  }

  function createAnotherAccount() {
    setAccountCount((v) => v + 1);
    showToast(copy2.new_account_created);
  }

  function switchSwapAssets() {
    setSwapFromAsset(swapToAsset);
    setSwapToAsset(swapFromAsset);
  }

  async function startScan() {
    if (scanBusy) return;
    setScanBusy(true);
    setScanOpen(true);

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      await new Promise((resolve) => setTimeout(resolve, 80));
      const video = document.getElementById("qrVideo") as HTMLVideoElement | null;
      if (!video) throw new Error("no video");

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const backCamera = devices.find((d) => /back|rear|environment/gi.test(`${d.label} ${d.deviceId}`));
      const frontCamera = devices[0];

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: backCamera?.deviceId
          ? { deviceId: { exact: backCamera.deviceId } }
          : {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
      };

      await reader.decodeFromConstraints(constraints, video, (result: any) => {
        if (result?.getText) {
          const txt = result.getText();
          const m = txt.match(/0x[a-fA-F0-9]{40}/);
          if (m?.[0]) {
            setSendTo(m[0]);
            setTab("send");
            stopScan();
            showToast(tr(lang, "qr_ok"));
          }
        }
      });

    } catch (error) {
      console.error(error);
      showToast(tr(lang, "camera_fail"));
      setScanOpen(false);
      setScanBusy(false);
    }
  }

  function stopScan() {
    try {
      readerRef.current?.reset();
    } catch {}
    setScanOpen(false);
    setScanBusy(false);
  }

  const totalAssets = useMemo(() => {
    return [
      { symbol: "INRI", amount: balance, logo: assetUrl("token-inri.png"), subtitle: tr(lang, "native_coin") },
      ...TOKENS.map((t) => ({
        symbol: t.symbol,
        amount: tokenBalances[t.symbol] ?? "0.0",
        logo: t.logo || getAssetLogo(t.symbol),
        subtitle: shortAddr(t.address),
      })),
    ];
  }, [balance, TOKENS, tokenBalances, lang]);

  function getBalanceForAsset(symbol: string) {
    if (symbol.toUpperCase() === "INRI") return Number(balance || "0").toFixed(6);
    return tokenBalances[symbol] ?? "0.0";
  }

  const mobileAccountPanel =
    view === "wallet" ? (
      <div className="mobileDrawer">
        <div className="drawerHead">
          <div>
            <b>INRI CHAIN</b>
            <div className="muted2">ChainId {INRI.chainIdDec}</div>
          </div>
          {networkOk ? <span className="badgeOk">{copy2.online}</span> : <span className="badgeBad">{copy2.offline}</span>}
        </div>

        <div className="drawerBody">
          <div className="accountPill">
            <div className="accountLeft">
              <div className="avatarPill">
                {avatar ? <img src={avatar} alt="avatar" /> : <div className="avatarDot" />}
              </div>
              <div>
                <div className="pillTitle">{copy2.wallet}</div>
                <div className="mono muted2 pillSub">{shortAddr(selected)}</div>
              </div>
            </div>

            <button className="btn btnGhost" onClick={() => copy(selected)}>
              <Copy size={16} />
            </button>
          </div>

          <div className="cardFlat">
            <div className="labelRow">
              <div className="label">{tr(lang, "account_switcher")}</div>
            </div>

            <select className="select" value={selectedIndex} onChange={(e) => setSelectedIndex(Number(e.target.value))}>
              {accounts.map((a) => (
                <option key={a.index} value={a.index}>
                  Account {a.index} — {a.address.slice(0, 8)}…{a.address.slice(-6)}
                </option>
              ))}
            </select>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" onClick={() => setAccountCount(Math.max(1, accountCount - 1))}>
                - Account
              </button>
              <button className="btn" onClick={createAnotherAccount}>
                + {tr(lang, "create_account")}
              </button>
            </div>

            <div className="muted2 smallTop">
              {copy2.path}: <span className="mono">m/44&apos;/60&apos;/0&apos;/0/i</span>
            </div>
          </div>

          <div className="cardFlat">
            <div className="muted">{tr(lang, "balance")}</div>
            <div className="balBig">{Number(balance).toFixed(6)}</div>
            <div className="muted2">INRI</div>
          </div>
        </div>
      </div>
    ) : null;

  const Nav = ({ icon, label, id }: { icon: React.ReactNode; label: string; id: Tab }) => (
    <button className={`navItem ${tab === id ? "navItemActive" : ""}`} onClick={() => setTab(id)}>
      {icon}
      <div className="navLabel">{label}</div>
    </button>
  );

  return (
    <>
      <style>{`
        :root{
          --bg:#0b0b0f;
          --panel:#111319;
          --panel2:#171922;
          --panel3:#1e212b;
          --line:#2a2e3a;
          --text:#ffffff;
          --muted:#a6adbb;
          --accent:#4e8cff;
          --accent2:#2a5cd4;
          --green:#14c784;
          --danger:#ff5a6b;
          --shadow:0 12px 30px rgba(0,0,0,.35);
        }
        *{box-sizing:border-box}
        html,body,#root{height:100%}
        body{
          margin:0;
          font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
          background:linear-gradient(180deg,#0b0b0f 0%, #0a0f1a 100%);
          color:var(--text);
          transition:background .2s ease,color .2s ease;
        }
        body[data-theme="silver"]{
          --bg:#dfe3ea;
          --panel:#f5f7fb;
          --panel2:#eef1f6;
          --panel3:#e4e9f1;
          --line:#c6cfdb;
          --text:#111827;
          --muted:#5f6b7c;
          --accent:#446dff;
          --accent2:#6389ff;
          --shadow:0 10px 28px rgba(44,60,84,.10);
          background:linear-gradient(180deg,#e8edf5 0%, #d7dde7 100%);
        }
        .mono{
          font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;
        }
        .muted{color:var(--muted)}
        .muted2{color:var(--muted); opacity:.82}
        .smallTop{margin-top:10px}
        .appShell{
          min-height:100vh;
          display:grid;
          grid-template-columns:230px 1fr 320px;
        }
        .sidebar{
          border-right:1px solid var(--line);
          background:var(--panel);
          padding:16px 12px;
        }
        .sideTop{
          display:flex;
          gap:10px;
          align-items:center;
          padding:8px 10px 16px;
          border-bottom:1px solid var(--line);
        }
        .brandLogo{
          width:36px;
          height:36px;
          object-fit:contain;
          display:block;
        }
        .brandTxt b{
          display:block;
          font-size:14px;
          font-weight:800;
        }
        .brandTxt span{
          display:block;
          font-size:12px;
          color:var(--muted);
          margin-top:2px;
        }
        .sideNav{
          margin-top:14px;
          display:grid;
          gap:8px;
        }
        .navItem{
          display:flex;
          align-items:center;
          gap:10px;
          width:100%;
          padding:12px 12px;
          border:1px solid transparent;
          background:transparent;
          color:var(--text);
          cursor:pointer;
          border-radius:14px;
          text-align:left;
        }
        .navItem:hover{
          background:var(--panel2);
          border-color:var(--line);
        }
        .navItemActive{
          background:#1b2741;
          border-color:#355ea8;
        }
        .navLabel{
          font-size:14px;
          font-weight:700;
        }
        .main{
          padding:16px 16px 90px;
        }
        .mainHeader{
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:14px 16px;
          border:1px solid var(--line);
          border-radius:18px;
          background:var(--panel);
          box-shadow:var(--shadow);
        }
        .hTitle b{
          font-size:18px;
          font-weight:800;
        }
        .hTitle span{
          display:block;
          margin-top:4px;
          font-size:12px;
        }
        .headerActions{
          display:flex;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
        }
        .badgeOk,.badgeBad{
          padding:7px 12px;
          border-radius:999px;
          font-size:12px;
          font-weight:800;
          border:1px solid;
        }
        .badgeOk{
          color:#8cf0c3;
          border-color:rgba(20,199,132,.45);
          background:rgba(20,199,132,.1);
        }
        .badgeBad{
          color:#ffc0c7;
          border-color:rgba(255,90,107,.45);
          background:rgba(255,90,107,.1);
        }
        .content{margin-top:14px}
        .card{
          border:1px solid var(--line);
          border-radius:20px;
          background:var(--panel);
          padding:16px;
          box-shadow:var(--shadow);
        }
        .cardFlat{
          border:1px solid var(--line);
          border-radius:18px;
          background:var(--panel2);
          padding:16px;
        }
        .sectionTitle{
          font-size:18px;
          font-weight:800;
          margin-bottom:8px;
        }
        .grid2{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
        }
        .label{
          display:block;
          font-size:12px;
          color:var(--muted);
          margin-bottom:6px;
          margin-top:10px;
        }
        .input,.textarea,.select{
          width:100%;
          border:1px solid var(--line);
          border-radius:14px;
          background:#0d0f14;
          color:var(--text);
          padding:12px 14px;
          outline:none;
          font-size:14px;
        }
        .textarea{
          min-height:92px;
          resize:vertical;
        }
        .btn{
          border:1px solid var(--line);
          background:var(--panel3);
          color:var(--text);
          border-radius:14px;
          padding:10px 14px;
          font-weight:700;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          gap:8px;
        }
        .btn:hover{filter:brightness(1.06)}
        .btnPrimary{
          background:linear-gradient(180deg,var(--accent),var(--accent2));
          border-color:#4d7ef2;
        }
        .btnGhost{
          background:transparent;
          border-color:transparent;
        }
        .bigNumber{
          font-size:32px;
          font-weight:900;
          margin-top:6px;
        }
        .quickActions{
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:10px;
          margin-top:14px;
        }
        .qBtn{
          border:1px solid var(--line);
          background:var(--panel2);
          color:var(--text);
          border-radius:16px;
          min-height:62px;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          font-weight:700;
        }
        .qBtn:hover{background:var(--panel3)}
        .receiveWrap{
          display:flex;
          gap:16px;
          flex-wrap:wrap;
          align-items:flex-start;
        }
        .qrBox{
          border:1px solid var(--line);
          border-radius:18px;
          background:#fff;
          padding:12px;
        }
        .receiveRight{
          flex:1;
          min-width:240px;
        }
        .addrBig{
          font-size:18px;
          font-weight:800;
          margin-top:6px;
        }
        .addrFull{
          margin-top:8px;
          font-size:12px;
          word-break:break-all;
        }
        .tokenList{
          margin-top:12px;
          display:grid;
          gap:0;
        }
        .tokenRow{
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:12px 0;
          border-bottom:1px solid rgba(255,255,255,.06);
          gap:12px;
        }
        .tokenLeft{
          display:flex;
          align-items:center;
          gap:10px;
          min-width:0;
        }
        .tokenLogo{
          width:34px;
          height:34px;
          border-radius:50%;
          overflow:hidden;
          background:#111;
          display:flex;
          align-items:center;
          justify-content:center;
          flex:0 0 auto;
        }
        .tokenLogo img{
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        }
        .tokenFallback{
          width:100%;
          height:100%;
          background:#222;
        }
        .tokenSym{
          font-weight:700;
          font-size:14px;
        }
        .tokenAddr{
          font-size:12px;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .tokenBal{
          font-weight:700;
          font-size:14px;
          white-space:nowrap;
        }
        .assetGrid{
          display:grid;
          gap:10px;
          margin-top:12px;
        }
        .assetMiniCard{
          border:1px solid var(--line);
          border-radius:16px;
          background:var(--panel2);
          padding:12px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        }
        .feeBox{
          margin-top:12px;
          border:1px solid var(--line);
          border-radius:16px;
          background:var(--panel2);
          padding:12px;
        }
        .quoteBox{
          margin-top:12px;
          border:1px solid var(--line);
          border-radius:16px;
          background:var(--panel2);
          padding:12px;
        }
        .txList{
          margin-top:12px;
          display:grid;
          gap:10px;
        }
        .txRow{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          padding:12px;
          border:1px solid var(--line);
          border-radius:16px;
          background:var(--panel2);
        }
        .txHash{
          font-weight:800;
        }
        .txTo{
          font-size:12px;
          margin-top:4px;
        }
        .settingsGrid{
          display:grid;
          gap:12px;
        }
        .labelRow{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        }
        .avatarRow{
          display:flex;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
        }
        .avatarBig{
          width:44px;
          height:44px;
          border-radius:50%;
          overflow:hidden;
          background:#1c1c1c;
          display:flex;
          align-items:center;
          justify-content:center;
          border:1px solid var(--line);
        }
        .avatarBig img{
          width:100%;
          height:100%;
          object-fit:cover;
        }
        .drawer{
          border-left:1px solid var(--line);
          background:var(--panel);
          padding:16px 14px;
        }
        .mobileDrawer{display:none}
        .drawerHead{
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:12px 14px;
          border:1px solid var(--line);
          border-radius:18px;
          background:var(--panel2);
        }
        .drawerBody{
          margin-top:12px;
          display:grid;
          gap:12px;
        }
        .accountPill{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          padding:12px;
          border:1px solid var(--line);
          border-radius:18px;
          background:var(--panel2);
        }
        .accountLeft{
          display:flex;
          align-items:center;
          gap:10px;
          min-width:0;
        }
        .avatarPill{
          width:40px;
          height:40px;
          border-radius:12px;
          overflow:hidden;
          background:#1a2030;
          border:1px solid var(--line);
          display:flex;
          align-items:center;
          justify-content:center;
          flex:0 0 auto;
        }
        .avatarPill img{
          width:100%;
          height:100%;
          object-fit:cover;
        }
        .avatarDot{
          width:16px;
          height:16px;
          border-radius:50%;
          background:linear-gradient(180deg,#5ea1ff,#2d63dd);
        }
        .pillTitle{
          font-weight:800;
          font-size:14px;
        }
        .pillSub{
          font-size:12px;
          margin-top:2px;
        }
        .balBig{
          font-size:30px;
          font-weight:900;
          margin-top:6px;
        }
        .explorerUrl{
          margin:8px 0 10px;
          word-break:break-all;
          font-size:12px;
        }
        .bottomNav{
          position:fixed;
          left:0;
          right:0;
          bottom:0;
          padding:10px 12px calc(10px + env(safe-area-inset-bottom));
          background:rgba(10,10,14,.94);
          border-top:1px solid var(--line);
          display:none;
          z-index:40;
        }
        .bottomInner{
          display:grid;
          grid-template-columns:repeat(5,1fr);
          gap:8px;
        }
        .bBtn{
          height:48px;
          border:1px solid var(--line);
          background:var(--panel2);
          color:var(--text);
          border-radius:14px;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
        }
        .bBtnActive{
          background:#1b2741;
          border-color:#355ea8;
        }
        .toast{
          position:fixed;
          left:50%;
          bottom:24px;
          transform:translateX(-50%);
          background:#111827;
          color:#fff;
          border:1px solid #334155;
          border-radius:14px;
          padding:10px 14px;
          font-weight:700;
          z-index:60;
          box-shadow:var(--shadow);
        }
        .modalBackdrop{
          position:fixed;
          inset:0;
          background:rgba(0,0,0,.6);
          display:flex;
          align-items:center;
          justify-content:center;
          padding:16px;
          z-index:70;
        }
        .modal{
          width:min(560px,100%);
          border:1px solid var(--line);
          border-radius:18px;
          background:var(--panel);
          padding:16px;
          box-shadow:var(--shadow);
        }
        .rowBetween{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        }
        .qrVideo{
          width:100%;
          height:320px;
          object-fit:cover;
          margin-top:12px;
          border-radius:14px;
          background:#000;
          border:1px solid var(--line);
        }
        .assetChooser{
          border:1px solid var(--line);
          border-radius:16px;
          background:var(--panel2);
          padding:12px;
          margin-top:8px;
        }
        .assetChooserTop{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          margin-bottom:10px;
        }
        .assetBadge{display:flex;align-items:center;gap:10px;}
        .assetBadgeMeta{display:flex;flex-direction:column;min-width:0;}
        .assetBadgeMeta b{font-size:15px;line-height:1.1;}
        .assetBadgeMeta span{font-size:12px;color:var(--muted);margin-top:4px;}
        .assetLogoWrap{position:relative;width:42px;height:42px;flex:0 0 42px;}
        .assetLogoWrap .tokenLogo{width:42px;height:42px;border-radius:50%;overflow:hidden;background:var(--panel3);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;}
        .assetInitialBadge{position:absolute;right:-4px;bottom:-4px;min-width:24px;height:24px;padding:0 6px;border-radius:999px;background:var(--panel);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;box-shadow:var(--shadow);}
        .swapAssetPreview{
          display:flex;
          align-items:center;
          gap:8px;
          color:var(--text);
          font-weight:700;
        }
        .swapAssetPreviewSolo{
          justify-content:flex-start;
        }
        .assetChooserTopStack{
          display:flex;
          flex-direction:column;
          align-items:flex-start;
          gap:8px;
        }
        .swapMiniLogo{
          width:32px;
          height:32px;
        }
        .tokenInitialOnly{
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:11px;
          font-weight:700;
          letter-spacing:.4px;
          background:linear-gradient(180deg,#142033,#0c1220);
          border:1px solid var(--line);
          color:var(--text);
          overflow:hidden;
        }
        .assetBalance{
          font-size:12px;
          color:var(--muted);
        }
        .assetBalanceUnder{
          padding-left:0;
          line-height:1.2;
        }
        @media (max-width: 1120px){
          .appShell{
            grid-template-columns:210px 1fr 290px;
          }
        }
        @media (max-width: 920px){
          .drawer{display:none}
          .mobileDrawer{display:block; margin-top:14px}
          .appShell{
            grid-template-columns:220px 1fr;
          }
        }
        @media (max-width: 720px){
          .sidebar{display:none}
          .appShell{
            grid-template-columns:1fr;
          }
          .grid2{
            grid-template-columns:1fr;
          }
          .quickActions{
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
          .main{
            padding-bottom:90px;
          }
          .bottomNav{
            display:block;
          }
          .mainHeader{
            border-radius:16px;
          }
          .card,.cardFlat{
            border-radius:16px;
          }
        }
      `}</style>

      <div className="appShell">
        <aside className="sidebar">
          <div className="sideTop">
            <img className="brandLogo" src={assetUrl("favicon.png")} alt="INRI" />
            <div className="brandTxt">
              <b>INRI Wallet</b>
              <span>{copy2.official_pwa}</span>
            </div>
          </div>

          <div className="sideNav">
            <Nav id="dashboard" label={tr(lang, "dashboard")} icon={<Home size={18} />} />
            <Nav id="send" label={tr(lang, "send")} icon={<Send size={18} />} />
            <Nav id="receive" label={tr(lang, "receive")} icon={<QrCode size={18} />} />
            <Nav id="tokens" label={tr(lang, "tokens")} icon={<Coins size={18} />} />
            <Nav id="activity" label={tr(lang, "activity")} icon={<History size={18} />} />
            <Nav id="swap" label={tr(lang, "swap")} icon={<Shuffle size={18} />} />
            <Nav id="bridge" label={tr(lang, "bridge")} icon={<ArrowLeftRight size={18} />} />
            <Nav id="settings" label={tr(lang, "settings")} icon={<Settings size={18} />} />
          </div>
        </aside>

        <main className="main">
          <div className="mainHeader">
            <div className="hTitle">
              <b>{tab === "dashboard" ? copy2.wallet : tr(lang, tab as UIKey)}</b>
              <span className="muted2">
                RPC <span className="mono">{INRI.rpcUrls[0]}</span>
              </span>
            </div>

            <div className="headerActions">
              {networkOk ? (
                <span className="badgeOk">{copy2.online} • {chainId}</span>
              ) : (
                <span className="badgeBad">{copy2.rpc_issue}</span>
              )}

              {view === "wallet" ? (
                <button className="btn" onClick={lock}>
                  <Lock size={16} /> {tr(lang, "logout")}
                </button>
              ) : (
                <button className="btn" onClick={resetLocal}>
                  <Trash2 size={16} /> {copy2.reset}
                </button>
              )}

              <button
                className="btn btnPrimary"
                onClick={() => document.getElementById("appTop")?.scrollIntoView({ behavior: "smooth" })}
              >
                {copy2.launch}
              </button>
            </div>
          </div>

          {mobileAccountPanel}

          <div className="content" id="appTop" dir={lang === "ar" ? "rtl" : "ltr"}>
            {view !== "wallet" && (
              <div className="cardFlat" style={{ marginBottom: 12 }}>
                <label className="label">
                  <input
                    type="checkbox"
                    checked={keepSession}
                    onChange={(e) => setKeepSession(e.target.checked)}
                    style={{ marginRight: 8 }}
                  />
                  {tr(lang, "keep_session")}
                </label>
                <div className="muted2" style={{ fontSize: 12, marginTop: 6 }}>
                  {copy2.keep_session_hint}
                </div>
              </div>
            )}

            {view === "welcome" && (
              <div className="card">
                <div className="grid2">
                  <div className="cardFlat">
                    <div className="sectionTitle">{tr(lang, "create")}</div>
                    <label className="label">{tr(lang, "seed_new")}</label>
                    <textarea className="textarea" value={newMnemonic} readOnly placeholder="Click generate..." />
                    <div className="grid2" style={{ marginTop: 10 }}>
                      <div>
                        <label className="label">{tr(lang, "password")} (min 8)</label>
                        <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">{tr(lang, "confirm")}</label>
                        <input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button className="btn" onClick={generateSeed}>
                        <RefreshCcw size={16} /> {tr(lang, "generate")}
                      </button>
                      <button className="btn btnPrimary" onClick={createWallet}>
                        {tr(lang, "secure_enter")}
                      </button>
                    </div>
                    <div className="muted smallTop">{copy2.backup_seed}</div>
                  </div>

                  <div className="cardFlat">
                    <div className="sectionTitle">{tr(lang, "import")}</div>
                    <label className="label">{tr(lang, "seed_import")}</label>
                    <textarea
                      className="textarea"
                      value={importMnemonic}
                      onChange={(e) => setImportMnemonic(e.target.value)}
                      placeholder="paste 12/24 words..."
                    />
                    <div className="grid2" style={{ marginTop: 10 }}>
                      <div>
                        <label className="label">{tr(lang, "password")} (min 8)</label>
                        <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">{tr(lang, "confirm")}</label>
                        <input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button className="btn btnPrimary" onClick={importWallet}>
                        {tr(lang, "secure_enter")}
                      </button>
                    </div>
                    <div className="muted smallTop">{copy2.stored_local}</div>
                  </div>
                </div>
              </div>
            )}

            {view === "unlock" && (
              <div className="card">
                <div className="sectionTitle">{tr(lang, "unlock")}</div>
                <label className="label">{tr(lang, "password")}</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    className="input"
                    type="password"
                    value={unlockPw}
                    onChange={(e) => setUnlockPw(e.target.value)}
                    placeholder={copy2.password_placeholder}
                  />
                  <button className="btn btnPrimary" onClick={unlock}>
                    {tr(lang, "unlock")}
                  </button>
                </div>
                <div className="muted smallTop">{copy2.stored_local_short}</div>
              </div>
            )}

            {view === "wallet" && (
              <>
                {tab === "dashboard" && (
                  <div className="card">
                    <div className="muted">{tr(lang, "total_balance")}</div>
                    <div className="bigNumber">
                      {Number(balance).toFixed(6)} <span className="muted2">INRI</span>
                    </div>

                    <div className="quickActions">
                      <button className="qBtn" onClick={() => setTab("send")}>
                        <Send size={18} />
                        <span>{tr(lang, "send")}</span>
                      </button>
                      <button className="qBtn" onClick={() => setTab("swap")}>
                        <Shuffle size={18} />
                        <span>{tr(lang, "swap")}</span>
                      </button>
                      <button className="qBtn" onClick={() => setTab("receive")}>
                        <QrCode size={18} />
                        <span>{tr(lang, "receive")}</span>
                      </button>
                      <button className="qBtn" onClick={() => setTab("bridge")}>
                        <ArrowLeftRight size={18} />
                        <span>{tr(lang, "bridge")}</span>
                      </button>
                    </div>

                    <div className="assetGrid">
                      {totalAssets.map((a) => (
                        <div key={a.symbol} className="assetMiniCard">
                          <div className="tokenLeft">
                            <div className="tokenLogo">
                              {a.logo ? <img src={a.logo} alt={a.symbol} /> : <div className="tokenFallback" />}
                            </div>
                            <div>
                              <div className="tokenSym">{a.symbol}</div>
                              <div className="muted2 tokenAddr">{a.subtitle}</div>
                            </div>
                          </div>
                          <div className="tokenBal">{a.amount}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button className="btn" onClick={refreshTokens}>
                        <RefreshCcw size={16} /> {tr(lang, "refresh_tokens")}
                      </button>
                      <button className="btn" onClick={refreshHistory}>
                        <RefreshCcw size={16} /> {tr(lang, "refresh_activity")}
                      </button>
                    </div>
                  </div>
                )}

                {tab === "send" && (
                  <div className="card">
                    <div className="sectionTitle">{tr(lang, "send_token")}</div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                      <button className="btn" onClick={startScan}>
                        <Camera size={16} /> {tr(lang, "scan_qr")}
                      </button>
                      <button className="btn" onClick={() => setSendTo(selected)}>
                        <Wallet size={16} /> {tr(lang, "use_my_address")}
                      </button>
                    </div>

                    <label className="label">{tr(lang, "token")}</label>
                    <div className="assetChooser">
                      <div className="assetChooserTop">
                        <div className="assetBadge">
                          {(() => { const meta = getAssetMeta(sendAsset, TOKENS); return (<>
                            <div className="assetLogoWrap">
                              <div className="tokenLogo swapMiniLogo">
                                {meta.logo ? <img src={meta.logo} alt={sendAsset} /> : <div className="tokenFallback" />}
                              </div>
                              <div className="assetInitialBadge">{getTokenInitials(sendAsset)}</div>
                            </div>
                            <div className="assetBadgeMeta">
                              <b>{sendAsset}</b>
                              <span>{tr(lang, "balance")}: {getBalanceForAsset(sendAsset)}</span>
                            </div>
                          </>); })()}
                        </div>
                      </div>
                      <select className="select" value={sendAsset} onChange={(e) => setSendAsset(e.target.value)}>
                        <option value="INRI">INRI</option>
                        {TOKENS.map((t) => (
                          <option key={`${t.symbol}_${t.address}`} value={t.symbol}>
                            {t.symbol}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="label">{tr(lang, "to")}</label>
                    <input className="input" value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="0x..." />

                    <label className="label">{tr(lang, "amount")}</label>
                    <input className="input" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} placeholder="0.10" />

                    <div className="feeBox">
                      <div className="labelRow">
                        <div className="label" style={{ margin: 0 }}>{tr(lang, "estimated_fee")}</div>
                        <span className="tokenBal">{estimatedGasFee ? `${estimatedGasFee} INRI` : "—"}</span>
                      </div>
                      <div className="muted2" style={{ fontSize: 12, marginTop: 8 }}>
                        {estimatedGasFee ? copy2.amount_paid_note : tr(lang, "fee_pending")}
                      </div>
                    </div>

                    <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <button className="btn btnPrimary" onClick={sendNow} disabled={sending}>
                        {sending ? tr(lang, "sending") : tr(lang, "send")}
                      </button>
                      <span className="muted">{tr(lang, "need_gas")}</span>
                    </div>
                  </div>
                )}

                {tab === "receive" && (
                  <div className="card">
                    <div className="sectionTitle">{tr(lang, "receive")}</div>
                    <div className="receiveWrap">
                      <div className="qrBox">
                        <QRCode value={selected || "0x"} size={200} />
                      </div>
                      <div className="receiveRight">
                        <div className="muted">{tr(lang, "your_address")}</div>
                        <div className="addrBig">{shortAddr(selected)}</div>
                        <div className="mono muted2 addrFull">{selected}</div>
                        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button className="btn btnPrimary" onClick={() => copy(selected)}>
                            <Copy size={16} /> {copy2.copied.replace(/\.$/, "")}
                          </button>
                          <button className="btn" onClick={() => openExplorerAddress(selected)}>
                            <ExternalLink size={16} /> {tr(lang, "explorer")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tab === "tokens" && (
                  <div className="card">
                    <div className="sectionTitle">{tr(lang, "tokens")}</div>
                    <div className="muted smallTop">{copy2.live_balances}</div>

                    <div className="tokenList">
                      <div className="tokenRow">
                        <div className="tokenLeft">
                          <div className="tokenLogo">
                            <img src={assetUrl("token-inri.png")} alt="INRI" />
                          </div>
                          <div>
                            <div className="tokenSym">INRI</div>
                            <div className="mono muted2 tokenAddr">{tr(lang, "native_coin")}</div>
                          </div>
                        </div>
                        <div className="tokenBal">{Number(balance).toFixed(6)}</div>
                      </div>

                      {TOKENS.map((t) => {
                        const isCustom = customTokens.some((ct) => ct.symbol === t.symbol && ct.address === t.address);
                        return (
                          <div key={`${t.symbol}_${t.address}`} className="tokenRow">
                            <div className="tokenLeft">
                              <div className="tokenLogo">
                                {t.logo ? <img src={t.logo} alt={t.symbol} /> : <div className="tokenFallback" />}
                              </div>
                              <div>
                                <div className="tokenSym">{t.symbol}</div>
                                <div className="mono muted2 tokenAddr">{shortAddr(t.address)}</div>
                              </div>
                            </div>
                            <div className="tokenRowActions">
                              <div className="tokenBal">{tokenBalances[t.symbol] ?? "0.0"}</div>
                              {isCustom && (
                                <button className="btn" onClick={() => removeCustomToken(t.symbol, t.address)}>
                                  <Trash2 size={14} /> {copy2.remove}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button className="btn" onClick={refreshTokens}>
                        <RefreshCcw size={16} /> {tr(lang, "refresh_tokens")}
                      </button>
                      <button className="btn" onClick={() => setTab("settings")}>
                        <Plus size={16} /> {tr(lang, "add_token")}
                      </button>
                    </div>
                  </div>
                )}

                {tab === "activity" && (
                  <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div className="sectionTitle">{tr(lang, "activity")}</div>
                        <div className="muted smallTop">Explorer API + Local history</div>
                      </div>
                      <button className="btn" onClick={refreshHistory} disabled={loadingTxs}>
                        <RefreshCcw size={16} /> {loadingTxs ? "Loading..." : "Refresh"}
                      </button>
                    </div>

                    <div className="txList">
                      {txs.length === 0 ? (
                        <div className="muted">{tr(lang, "history_empty")}</div>
                      ) : (
                        txs.map((x: any, i) => (
                          <div key={x.hash || i} className="txRow">
                            <div>
                              <div className="mono txHash">{String(x.hash || "local").slice(0, 14)}…</div>
                              <div className="muted2 txTo">
                                {x.symbol ? `${x.symbol} • ` : ""}{tr(lang, "to")}: {x.to?.hash ? shortAddr(x.to.hash) : shortAddr(x.to || "")}
                              </div>
                              {x.amount ? (
                                <div className="muted2 txTo">
                                  {x.amount} {x.symbol || ""}
                                </div>
                              ) : null}
                            </div>
                            {x.hash ? (
                              <button className="btn btnGhost" onClick={() => openExplorerTx(x.hash)}>
                                <ExternalLink size={16} />
                              </button>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {tab === "swap" && (
                  <div className="card">
                    <div className="sectionTitle">{tr(lang, "swap")}</div>

                    <div className="cardFlat">
                      <label className="label">{tr(lang, "from")}</label>
                      <div className="assetChooser">
                        <div className="assetChooserTop assetChooserTopStack">
                          <div className="assetBadge">
                            {(() => { const meta = getAssetMeta(swapFromAsset, TOKENS); return (<>
                              <div className="assetLogoWrap">
                                <div className="tokenLogo swapMiniLogo">
                                  {meta.logo ? <img src={meta.logo} alt={swapFromAsset} /> : <div className="tokenFallback" />}
                                </div>
                                <div className="assetInitialBadge">{getTokenInitials(swapFromAsset)}</div>
                              </div>
                              <div className="assetBadgeMeta">
                                <b>{swapFromAsset}</b>
                                <span>{tr(lang, "balance")}: {getBalanceForAsset(swapFromAsset)}</span>
                              </div>
                            </>); })()}
                          </div>
                        </div>
                        <select className="select" value={swapFromAsset} onChange={(e) => setSwapFromAsset(e.target.value)}>
                          <option value="INRI">INRI</option>
                          {TOKENS.map((t) => (
                            <option key={`swap-from-${t.symbol}`} value={t.symbol}>
                              {t.symbol}
                            </option>
                          ))}
                        </select>
                      </div>

                      <label className="label">{tr(lang, "amount")}</label>
                      <input className="input" value={swapAmount} onChange={(e) => setSwapAmount(e.target.value)} placeholder="0.00" />

                      <div style={{ display: "flex", justifyContent: "center", margin: "14px 0" }}>
                        <button className="btn" onClick={switchSwapAssets}>
                          <ArrowLeftRight size={16} />
                        </button>
                      </div>

                      <label className="label">{tr(lang, "to")}</label>
                      <div className="assetChooser">
                        <div className="assetChooserTop assetChooserTopStack">
                          <div className="assetBadge">
                            {(() => { const meta = getAssetMeta(swapToAsset, TOKENS); return (<>
                              <div className="assetLogoWrap">
                                <div className="tokenLogo swapMiniLogo">
                                  {meta.logo ? <img src={meta.logo} alt={swapToAsset} /> : <div className="tokenFallback" />}
                                </div>
                                <div className="assetInitialBadge">{getTokenInitials(swapToAsset)}</div>
                              </div>
                              <div className="assetBadgeMeta">
                                <b>{swapToAsset}</b>
                                <span>{tr(lang, "balance")}: {getBalanceForAsset(swapToAsset)}</span>
                              </div>
                            </>); })()}
                          </div>
                        </div>
                        <select className="select" value={swapToAsset} onChange={(e) => setSwapToAsset(e.target.value)}>
                          <option value="INRI">INRI</option>
                          {TOKENS.map((t) => (
                            <option key={`swap-to-${t.symbol}`} value={t.symbol}>
                              {t.symbol}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="quoteBox">
                        <div className="labelRow">
                          <div className="label" style={{ margin: 0 }}>{tr(lang, "estimated_receive")}</div>
                          <span className="tokenBal">{swapReceivePreview} {swapToAsset}</span>
                        </div>
                        <div className="muted2" style={{ fontSize: 12, marginTop: 8 }}>
                          {tr(lang, "preview_quote")} • preview only until pool contracts are connected.
                        </div>
                      </div>

                      <div className="feeBox">
                        <div className="labelRow">
                          <div className="label" style={{ margin: 0 }}>{tr(lang, "estimated_fee")}</div>
                          <span className="tokenBal">preview</span>
                        </div>
                        <div className="muted2" style={{ fontSize: 12, marginTop: 8 }}>
                          {copy2.preview_contracts}
                        </div>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <button className="btn btnPrimary" disabled>
                          {tr(lang, "swap")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {tab === "bridge" && (
                  <div className="card">
                    <div className="sectionTitle">{tr(lang, "bridge")}</div>

                    <div className="cardFlat">
                      <label className="label">{tr(lang, "from_network")}</label>
                      <select className="select" value={bridgeFromNetwork} onChange={(e) => setBridgeFromNetwork(e.target.value)}>
                        <option>INRI CHAIN</option>
                        <option>Polygon</option>
                        <option>BSC</option>
                        <option>Arbitrum</option>
                        <option>Ethereum</option>
                        <option>Base</option>
                      </select>

                      <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
                        <button className="btn">
                          <ArrowLeftRight size={16} />
                        </button>
                      </div>

                      <label className="label">{tr(lang, "to_network")}</label>
                      <select className="select" value={bridgeToNetwork} onChange={(e) => setBridgeToNetwork(e.target.value)}>
                        <option>Polygon</option>
                        <option>BSC</option>
                        <option>Arbitrum</option>
                        <option>Ethereum</option>
                        <option>Base</option>
                        <option>INRI CHAIN</option>
                      </select>

                      <label className="label">{tr(lang, "token")}</label>
                      <div className="assetChooser">
                        <div className="assetChooserTop assetChooserTopStack">
                          <div className="assetBadge">
                            {(() => { const meta = getAssetMeta(bridgeAsset, TOKENS); return (<>
                              <div className="assetLogoWrap">
                                <div className="tokenLogo swapMiniLogo">
                                  {meta.logo ? <img src={meta.logo} alt={bridgeAsset} /> : <div className="tokenFallback" />}
                                </div>
                                <div className="assetInitialBadge">{getTokenInitials(bridgeAsset)}</div>
                              </div>
                              <div className="assetBadgeMeta">
                                <b>{bridgeAsset}</b>
                                <span>{tr(lang, "balance")}: {getBalanceForAsset(bridgeAsset)}</span>
                              </div>
                            </>); })()}
                          </div>
                        </div>
                        <select className="select" value={bridgeAsset} onChange={(e) => setBridgeAsset(e.target.value)}>
                          <option value="iUSD">iUSD</option>
                          <option value="INRI">INRI</option>
                          <option value="WINRI">WINRI</option>
                          <option value="DNR">DNR</option>
                        </select>
                      </div>

                      <label className="label">{tr(lang, "amount")}</label>
                      <input className="input" value={bridgeAmount} onChange={(e) => setBridgeAmount(e.target.value)} placeholder="0.00" />

                      <div className="quoteBox">
                        <div className="labelRow">
                          <div className="label" style={{ margin: 0 }}>{tr(lang, "estimated_receive")}</div>
                          <span className="tokenBal">{bridgeReceivePreview} {bridgeAsset}</span>
                        </div>
                        <div className="muted2" style={{ fontSize: 12, marginTop: 8 }}>
                          {copy2.bridge_fee_note}
                        </div>
                      </div>

                      <div className="feeBox">
                        <div className="labelRow">
                          <div className="label" style={{ margin: 0 }}>{tr(lang, "estimated_fee")}</div>
                          <span className="tokenBal">{copy2.bridge_preview}</span>
                        </div>
                        <div className="muted2" style={{ fontSize: 12, marginTop: 8 }}>
                          {copy2.preview_bridge}
                        </div>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <button className="btn btnPrimary" disabled>
                          {tr(lang, "bridge")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {tab === "settings" && (
                  <div className="card">
                    <div className="sectionTitle">{tr(lang, "settings")}</div>

                    <div className="settingsGrid">
                      <div className="cardFlat">
                        <div className="labelRow">
                          <div className="label">{tr(lang, "language")}</div>
                          <span className="muted2">{tr(lang, "global")}</span>
                        </div>
                        <select className="select" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                          {LANGS.map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="cardFlat">
                        <div className="labelRow">
                          <div className="label">{copy2.appearance}</div>
                          <span className="muted2">{tr(lang, "global")}</span>
                        </div>
                        <select className="select" value={themeMode} onChange={(e) => setThemeMode(e.target.value as ThemeMode)}>
                          <option value="dark">{copy2.dark_mode}</option>
                          <option value="silver">{copy2.silver_mode}</option>
                        </select>
                      </div>

                      <div className="cardFlat">
                        <div className="labelRow">
                          <div className="label">{tr(lang, "avatar")}</div>
                          <span className="muted2">{tr(lang, "local")}</span>
                        </div>

                        <div className="avatarRow">
                          <div className="avatarBig">
                            {avatar ? <img src={avatar} alt="avatar" /> : <User size={18} />}
                          </div>

                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <label className="btn">
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => onAvatarFile(e.target.files?.[0] || null)}
                              />
                              {tr(lang, "change_avatar")}
                            </label>
                            <button className="btn" onClick={removeAvatar}>
                              {tr(lang, "remove_avatar")}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="cardFlat">
                        <div className="labelRow">
                          <div className="label">{tr(lang, "session")}</div>
                          <span className="muted2">{tr(lang, "security")}</span>
                        </div>

                        <label className="label">
                          <input
                            type="checkbox"
                            checked={keepSession}
                            onChange={(e) => setKeepSession(e.target.checked)}
                            style={{ marginRight: 8 }}
                          />
                          {tr(lang, "keep_session")}
                        </label>
                      </div>

                      <div className="cardFlat">
                        <div className="labelRow">
                          <div className="label">{tr(lang, "add_token")}</div>
                          <span className="muted2">{tr(lang, "custom_tokens")}</span>
                        </div>

                        <div className="grid2">
                          <div>
                            <label className="label">{tr(lang, "token_symbol")}</label>
                            <input className="input" value={tokSymbol} onChange={(e) => setTokSymbol(e.target.value)} placeholder="iUSD" />
                          </div>
                          <div>
                            <label className="label">{tr(lang, "token_decimals")}</label>
                            <input className="input" value={tokDec} onChange={(e) => setTokDec(e.target.value)} placeholder="18" />
                          </div>
                        </div>

                        <label className="label">{tr(lang, "token_address")}</label>
                        <input className="input" value={tokAddr} onChange={(e) => setTokAddr(e.target.value)} placeholder="0x..." />

                        <label className="label">{tr(lang, "token_logo")}</label>
                        <input className="input" value={tokLogo} onChange={(e) => setTokLogo(e.target.value)} placeholder="https://..." />

                        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button className="btn btnPrimary" onClick={addCustomToken}>
                            <Plus size={16} /> {tr(lang, "add_token")}
                          </button>
                        </div>

                        {customTokens.length > 0 && (
                          <div style={{ marginTop: 14 }}>
                            <div className="label">{copy2.custom_token_list}</div>
                            <div className="tokenList">
                              {customTokens.map((t) => (
                                <div key={`${t.symbol}_${t.address}_settings`} className="tokenRow">
                                  <div className="tokenLeft">
                                    <div className="tokenLogo">
                                      {t.logo ? <img src={t.logo} alt={t.symbol} /> : <div className="tokenFallback" />}
                                    </div>
                                    <div>
                                      <div className="tokenSym">{t.symbol}</div>
                                      <div className="mono muted2 tokenAddr">{shortAddr(t.address)}</div>
                                    </div>
                                  </div>
                                  <button className="btn" onClick={() => removeCustomToken(t.symbol, t.address)}>
                                    <Trash2 size={14} /> {copy2.remove}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="muted smallTop">{copy2.tip_decimals}</div>
                      </div>

                      <div className="cardFlat">
                        <div className="labelRow">
                          <div className="label">{tr(lang, "vault")}</div>
                          <span className="muted2">{tr(lang, "local")}</span>
                        </div>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button className="btn" onClick={lock}>
                            <Lock size={16} /> {tr(lang, "logout")}
                          </button>
                          <button className="btn" onClick={resetLocal}>
                            <Trash2 size={16} /> {copy2.reset}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <aside className="drawer">
          <div className="drawerHead">
            <div>
              <b>INRI CHAIN</b>
              <div className="muted2">ChainId {INRI.chainIdDec}</div>
            </div>
            {networkOk ? <span className="badgeOk">{copy2.online}</span> : <span className="badgeBad">{copy2.offline}</span>}
          </div>

          <div className="drawerBody">
            <div className="accountPill">
              <div className="accountLeft">
                <div className="avatarPill">
                  {avatar ? <img src={avatar} alt="avatar" /> : <div className="avatarDot" />}
                </div>
                <div>
                  <div className="pillTitle">{view === "wallet" ? copy2.wallet : copy2.not_unlocked}</div>
                  <div className="mono muted2 pillSub">{view === "wallet" ? shortAddr(selected) : "—"}</div>
                </div>
              </div>

              {view === "wallet" && (
                <button className="btn btnGhost" onClick={() => copy(selected)}>
                  <Copy size={16} />
                </button>
              )}
            </div>

            <div className="cardFlat">
              <div className="labelRow">
                <div className="label">{tr(lang, "account_switcher")}</div>
              </div>

              <select className="select" value={selectedIndex} onChange={(e) => setSelectedIndex(Number(e.target.value))}>
                {accounts.map((a) => (
                  <option key={a.index} value={a.index}>
                    Account {a.index} — {a.address.slice(0, 8)}…{a.address.slice(-6)}
                  </option>
                ))}
              </select>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn" onClick={() => setAccountCount(Math.max(1, accountCount - 1))}>
                  - Account
                </button>
                <button className="btn" onClick={createAnotherAccount}>
                  + {tr(lang, "create_account")}
                </button>
              </div>

              <div className="muted2 smallTop">
                {copy2.path}: <span className="mono">m/44&apos;/60&apos;/0&apos;/0/i</span>
              </div>
            </div>

            <div className="cardFlat">
              <div className="muted">{tr(lang, "balance")}</div>
              <div className="balBig">{Number(balance).toFixed(6)}</div>
              <div className="muted2">INRI</div>
            </div>

            <div className="cardFlat">
              <div className="muted">{tr(lang, "explorer")}</div>
              <div className="mono explorerUrl">{INRI.blockExplorerUrls[0]}</div>
              <button className="btn" onClick={() => window.open(INRI.blockExplorerUrls[0], "_blank", "noopener,noreferrer")}>
                <ExternalLink size={16} /> {tr(lang, "open")}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {view === "wallet" && (
        <div className="bottomNav">
          <div className="bottomInner">
            <button className={`bBtn ${tab === "dashboard" ? "bBtnActive" : ""}`} onClick={() => setTab("dashboard")}>
              <Home size={18} />
            </button>
            <button className={`bBtn ${tab === "send" ? "bBtnActive" : ""}`} onClick={() => setTab("send")}>
              <Send size={18} />
            </button>
            <button className={`bBtn ${tab === "receive" ? "bBtnActive" : ""}`} onClick={() => setTab("receive")}>
              <QrCode size={18} />
            </button>
            <button className={`bBtn ${tab === "tokens" ? "bBtnActive" : ""}`} onClick={() => setTab("tokens")}>
              <Coins size={18} />
            </button>
            <button className={`bBtn ${tab === "settings" ? "bBtnActive" : ""}`} onClick={() => setTab("settings")}>
              <Settings size={18} />
            </button>
          </div>
        </div>
      )}

      {scanOpen && (
        <div className="modalBackdrop" onClick={stopScan}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="rowBetween">
              <div className="sectionTitle">{tr(lang, "scan_qr")}</div>
              <button className="btn btnGhost" onClick={stopScan}>
                X
              </button>
            </div>
            <video id="qrVideo" className="qrVideo" />
            <div className="muted smallTop">{copy2.scanner_hint}</div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
