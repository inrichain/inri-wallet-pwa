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
  Globe,
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

const LANGS: { code: Lang; label: string }[] = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
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

const ES: Record<UIKey, string> = {
  dashboard: "Panel",
  send: "Enviar",
  receive: "Recibir",
  tokens: "Tokens",
  activity: "Actividad",
  swap: "Swap",
  bridge: "Bridge",
  settings: "Configuración",
  create: "Crear",
  import: "Importar",
  unlock: "Desbloquear",
  password: "Contraseña",
  confirm: "Confirmar",
  seed_new: "Nueva seed (12 palabras)",
  seed_import: "Frase seed",
  secure_enter: "Proteger y Entrar",
  generate: "Generar",
  copied: "Copiado.",
  scan_qr: "Escanear QR",
  keep_session: "Mantener sesión abierta",
  logout: "Bloquear",
  total_balance: "Saldo total",
  refresh_tokens: "Actualizar Tokens",
  refresh_activity: "Actualizar Actividad",
  send_token: "Enviar Activo",
  token: "Activo",
  to: "Para",
  amount: "Cantidad",
  sending: "Enviando...",
  need_gas: "Necesita INRI para gas.",
  your_address: "Tu dirección",
  explorer: "Explorer",
  add_token: "Agregar token",
  custom_tokens: "Tokens manuales",
  token_symbol: "Símbolo",
  token_decimals: "Decimales",
  token_address: "Dirección del token",
  token_logo: "Logo (opcional)",
  token_added: "Token agregado.",
  avatar: "Avatar",
  change_avatar: "Cambiar avatar",
  remove_avatar: "Eliminar avatar",
  coming_soon: "Próximamente (UI lista).",
  delete_vault_confirm: "¿Eliminar vault local? Necesitas la seed para restaurar.",
  wrong_password: "Contraseña incorrecta.",
  no_vault: "No se encontró vault local.",
  invalid_seed: "Seed inválida.",
  pw_min: "La contraseña debe tener al menos 8 caracteres.",
  pw_match: "Las contraseñas no coinciden.",
  invalid_addr: "Dirección inválida.",
  invalid_amount: "Cantidad inválida.",
  amount_gt0: "La cantidad debe ser mayor que 0.",
  camera_fail: "No se pudo usar la cámara.",
  qr_ok: "QR capturado.",
  create_account: "Crear Cuenta",
  account_switcher: "Cambiar cuenta",
  open: "Abrir",
  buy: "Comprar",
  balance: "Saldo",
  estimated_fee: "Tarifa estimada",
  fee_pending: "La vista previa de la tarifa aparece después de informar destino y cantidad.",
  history_empty: "No hay transacciones cargadas.",
  from: "De",
  to_network: "Red de destino",
  from_network: "Red de origen",
  estimated_receive: "Recepción estimada",
  preview_quote: "Cotización previa",
  session: "Sesión",
  security: "Seguridad",
  vault: "Vault",
  language: "Idioma",
  global: "Global",
  local: "Local",
  native_coin: "moneda nativa",
  use_my_address: "Usar mi dirección",
  network: "Red",
};

const FR: Record<UIKey, string> = {
  dashboard: "Tableau",
  send: "Envoyer",
  receive: "Recevoir",
  tokens: "Tokens",
  activity: "Activité",
  swap: "Swap",
  bridge: "Bridge",
  settings: "Paramètres",
  create: "Créer",
  import: "Importer",
  unlock: "Déverrouiller",
  password: "Mot de passe",
  confirm: "Confirmer",
  seed_new: "Nouvelle seed (12 mots)",
  seed_import: "Phrase seed",
  secure_enter: "Protéger et Entrer",
  generate: "Générer",
  copied: "Copié.",
  scan_qr: "Scanner QR",
  keep_session: "Garder la session ouverte",
  logout: "Verrouiller",
  total_balance: "Solde total",
  refresh_tokens: "Actualiser Tokens",
  refresh_activity: "Actualiser Activité",
  send_token: "Envoyer Actif",
  token: "Actif",
  to: "Vers",
  amount: "Montant",
  sending: "Envoi...",
  need_gas: "INRI requis pour le gas.",
  your_address: "Votre adresse",
  explorer: "Explorer",
  add_token: "Ajouter token",
  custom_tokens: "Tokens manuels",
  token_symbol: "Symbole",
  token_decimals: "Décimales",
  token_address: "Adresse du token",
  token_logo: "Logo (optionnel)",
  token_added: "Token ajouté.",
  avatar: "Avatar",
  change_avatar: "Changer avatar",
  remove_avatar: "Supprimer avatar",
  coming_soon: "Bientôt (UI prête).",
  delete_vault_confirm: "Supprimer le vault local ? Vous devez avoir la seed pour restaurer.",
  wrong_password: "Mot de passe incorrect.",
  no_vault: "Aucun vault local trouvé.",
  invalid_seed: "Seed invalide.",
  pw_min: "Le mot de passe doit contenir au moins 8 caractères.",
  pw_match: "Les mots de passe ne correspondent pas.",
  invalid_addr: "Adresse invalide.",
  invalid_amount: "Montant invalide.",
  amount_gt0: "Le montant doit être supérieur à 0.",
  camera_fail: "Impossible d'utiliser la caméra.",
  qr_ok: "QR capturé.",
  create_account: "Créer Compte",
  account_switcher: "Changer de compte",
  open: "Ouvrir",
  buy: "Acheter",
  balance: "Solde",
  estimated_fee: "Frais estimés",
  fee_pending: "L'aperçu des frais apparaît après avoir saisi destination et montant.",
  history_empty: "Aucune transaction chargée.",
  from: "De",
  to_network: "Réseau de destination",
  from_network: "Réseau d'origine",
  estimated_receive: "Réception estimée",
  preview_quote: "Cotisation estimée",
  session: "Session",
  security: "Sécurité",
  vault: "Vault",
  language: "Langue",
  global: "Global",
  local: "Local",
  native_coin: "monnaie native",
  use_my_address: "Utiliser mon adresse",
  network: "Réseau",
};

const DE: Record<UIKey, string> = {
  dashboard: "Dashboard",
  send: "Senden",
  receive: "Empfangen",
  tokens: "Tokens",
  activity: "Aktivität",
  swap: "Swap",
  bridge: "Bridge",
  settings: "Einstellungen",
  create: "Erstellen",
  import: "Importieren",
  unlock: "Entsperren",
  password: "Passwort",
  confirm: "Bestätigen",
  seed_new: "Neue Seed (12 Wörter)",
  seed_import: "Seed-Phrase",
  secure_enter: "Schützen und Starten",
  generate: "Generieren",
  copied: "Kopiert.",
  scan_qr: "QR scannen",
  keep_session: "In dieser Sitzung entsperrt lassen",
  logout: "Sperren",
  total_balance: "Gesamtsaldo",
  refresh_tokens: "Tokens aktualisieren",
  refresh_activity: "Aktivität aktualisieren",
  send_token: "Asset senden",
  token: "Asset",
  to: "An",
  amount: "Betrag",
  sending: "Wird gesendet...",
  need_gas: "INRI für Gas erforderlich.",
  your_address: "Ihre Adresse",
  explorer: "Explorer",
  add_token: "Token hinzufügen",
  custom_tokens: "Manuelle Tokens",
  token_symbol: "Symbol",
  token_decimals: "Dezimalstellen",
  token_address: "Token-Adresse",
  token_logo: "Logo (optional)",
  token_added: "Token hinzugefügt.",
  avatar: "Avatar",
  change_avatar: "Avatar ändern",
  remove_avatar: "Avatar entfernen",
  coming_soon: "Demnächst (UI bereit).",
  delete_vault_confirm: "Lokalen Vault löschen? Sie benötigen die Seed zum Wiederherstellen.",
  wrong_password: "Falsches Passwort.",
  no_vault: "Kein lokaler Vault gefunden.",
  invalid_seed: "Ungültige Seed.",
  pw_min: "Das Passwort muss mindestens 8 Zeichen haben.",
  pw_match: "Die Passwörter stimmen nicht überein.",
  invalid_addr: "Ungültige Adresse.",
  invalid_amount: "Ungültiger Betrag.",
  amount_gt0: "Der Betrag muss größer als 0 sein.",
  camera_fail: "Kamera konnte nicht verwendet werden.",
  qr_ok: "QR erfasst.",
  create_account: "Konto erstellen",
  account_switcher: "Konto wechseln",
  open: "Öffnen",
  buy: "Kaufen",
  balance: "Saldo",
  estimated_fee: "Geschätzte Gebühr",
  fee_pending: "Gebührenvorschau erscheint nach Eingabe von Ziel und Betrag.",
  history_empty: "Keine Transaktionen geladen.",
  from: "Von",
  to_network: "Zielnetzwerk",
  from_network: "Ausgangsnetzwerk",
  estimated_receive: "Geschätzter Empfang",
  preview_quote: "Vorschau-Quote",
  session: "Sitzung",
  security: "Sicherheit",
  vault: "Vault",
  language: "Sprache",
  global: "Global",
  local: "Lokal",
  native_coin: "native Münze",
  use_my_address: "Meine Adresse verwenden",
  network: "Netzwerk",
};

const RU: Record<UIKey, string> = {
  dashboard: "Панель",
  send: "Отправить",
  receive: "Получить",
  tokens: "Токены",
  activity: "Активность",
  swap: "Swap",
  bridge: "Bridge",
  settings: "Настройки",
  create: "Создать",
  import: "Импорт",
  unlock: "Разблокировать",
  password: "Пароль",
  confirm: "Подтвердить",
  seed_new: "Новая seed (12 слов)",
  seed_import: "Seed-фраза",
  secure_enter: "Защитить и войти",
  generate: "Создать",
  copied: "Скопировано.",
  scan_qr: "Сканировать QR",
  keep_session: "Оставить открытым в этой сессии",
  logout: "Заблокировать",
  total_balance: "Общий баланс",
  refresh_tokens: "Обновить токены",
  refresh_activity: "Обновить активность",
  send_token: "Отправить актив",
  token: "Актив",
  to: "Кому",
  amount: "Сумма",
  sending: "Отправка...",
  need_gas: "Нужен INRI для газа.",
  your_address: "Ваш адрес",
  explorer: "Explorer",
  add_token: "Добавить токен",
  custom_tokens: "Пользовательские токены",
  token_symbol: "Символ",
  token_decimals: "Десятичные",
  token_address: "Адрес токена",
  token_logo: "Логотип (необязательно)",
  token_added: "Токен добавлен.",
  avatar: "Аватар",
  change_avatar: "Изменить аватар",
  remove_avatar: "Удалить аватар",
  coming_soon: "Скоро (UI готов).",
  delete_vault_confirm: "Удалить локальный vault? Для восстановления нужна seed.",
  wrong_password: "Неверный пароль.",
  no_vault: "Локальный vault не найден.",
  invalid_seed: "Неверная seed.",
  pw_min: "Пароль должен содержать минимум 8 символов.",
  pw_match: "Пароли не совпадают.",
  invalid_addr: "Неверный адрес.",
  invalid_amount: "Неверная сумма.",
  amount_gt0: "Сумма должна быть больше 0.",
  camera_fail: "Не удалось использовать камеру.",
  qr_ok: "QR распознан.",
  create_account: "Создать аккаунт",
  account_switcher: "Переключение аккаунта",
  open: "Открыть",
  buy: "Купить",
  balance: "Баланс",
  estimated_fee: "Примерная комиссия",
  fee_pending: "Предпросмотр комиссии появится после ввода адреса и суммы.",
  history_empty: "Транзакции не загружены.",
  from: "От",
  to_network: "Сеть назначения",
  from_network: "Исходная сеть",
  estimated_receive: "Ожидаемое получение",
  preview_quote: "Предварительная котировка",
  session: "Сессия",
  security: "Безопасность",
  vault: "Vault",
  language: "Язык",
  global: "Глобально",
  local: "Локально",
  native_coin: "нативная монета",
  use_my_address: "Использовать мой адрес",
  network: "Сеть",
};

const TR: Record<UIKey, string> = {
  dashboard: "Panel",
  send: "Gönder",
  receive: "Al",
  tokens: "Tokenlar",
  activity: "Aktivite",
  swap: "Swap",
  bridge: "Bridge",
  settings: "Ayarlar",
  create: "Oluştur",
  import: "İçe aktar",
  unlock: "Kilidi aç",
  password: "Şifre",
  confirm: "Onayla",
  seed_new: "Yeni seed (12 kelime)",
  seed_import: "Seed ifadesi",
  secure_enter: "Koru ve Gir",
  generate: "Oluştur",
  copied: "Kopyalandı.",
  scan_qr: "QR tara",
  keep_session: "Bu oturumda açık tut",
  logout: "Kilitle",
  total_balance: "Toplam bakiye",
  refresh_tokens: "Tokenları yenile",
  refresh_activity: "Aktiviteyi yenile",
  send_token: "Varlık gönder",
  token: "Varlık",
  to: "Alıcı",
  amount: "Miktar",
  sending: "Gönderiliyor...",
  need_gas: "Gas için INRI gerekir.",
  your_address: "Adresiniz",
  explorer: "Explorer",
  add_token: "Token ekle",
  custom_tokens: "Özel tokenlar",
  token_symbol: "Sembol",
  token_decimals: "Ondalık",
  token_address: "Token adresi",
  token_logo: "Logo (isteğe bağlı)",
  token_added: "Token eklendi.",
  avatar: "Avatar",
  change_avatar: "Avatar değiştir",
  remove_avatar: "Avatar kaldır",
  coming_soon: "Yakında (arayüz hazır).",
  delete_vault_confirm: "Yerel vault silinsin mi? Geri yüklemek için seed gerekir.",
  wrong_password: "Yanlış şifre.",
  no_vault: "Yerel vault bulunamadı.",
  invalid_seed: "Geçersiz seed.",
  pw_min: "Şifre en az 8 karakter olmalı.",
  pw_match: "Şifreler eşleşmiyor.",
  invalid_addr: "Geçersiz adres.",
  invalid_amount: "Geçersiz miktar.",
  amount_gt0: "Miktar 0'dan büyük olmalı.",
  camera_fail: "Kamera kullanılamadı.",
  qr_ok: "QR alındı.",
  create_account: "Hesap Oluştur",
  account_switcher: "Hesap değiştirici",
  open: "Aç",
  buy: "Satın al",
  balance: "Bakiye",
  estimated_fee: "Tahmini ücret",
  fee_pending: "Ücret önizlemesi hedef ve miktar girildikten sonra görünür.",
  history_empty: "Yüklenmiş işlem yok.",
  from: "Gönderen",
  to_network: "Hedef ağ",
  from_network: "Kaynak ağ",
  estimated_receive: "Tahmini alınacak",
  preview_quote: "Önizleme fiyatı",
  session: "Oturum",
  security: "Güvenlik",
  vault: "Vault",
  language: "Dil",
  global: "Global",
  local: "Yerel",
  native_coin: "yerel coin",
  use_my_address: "Adresimi kullan",
  network: "Ağ",
};

const AR: Record<UIKey, string> = {
  dashboard: "لوحة التحكم",
  send: "إرسال",
  receive: "استلام",
  tokens: "الرموز",
  activity: "النشاط",
  swap: "مبادلة",
  bridge: "جسر",
  settings: "الإعدادات",
  create: "إنشاء",
  import: "استيراد",
  unlock: "فتح",
  password: "كلمة المرور",
  confirm: "تأكيد",
  seed_new: "عبارة seed جديدة (12 كلمة)",
  seed_import: "عبارة seed",
  secure_enter: "حماية ودخول",
  generate: "إنشاء",
  copied: "تم النسخ.",
  scan_qr: "مسح QR",
  keep_session: "الإبقاء على الجلسة مفتوحة",
  logout: "قفل",
  total_balance: "الرصيد الإجمالي",
  refresh_tokens: "تحديث الرموز",
  refresh_activity: "تحديث النشاط",
  send_token: "إرسال أصل",
  token: "الأصل",
  to: "إلى",
  amount: "الكمية",
  sending: "جارٍ الإرسال...",
  need_gas: "تحتاج INRI للغاز.",
  your_address: "عنوانك",
  explorer: "Explorer",
  add_token: "إضافة رمز",
  custom_tokens: "رموز مخصصة",
  token_symbol: "الرمز",
  token_decimals: "الكسور",
  token_address: "عنوان الرمز",
  token_logo: "الشعار (اختياري)",
  token_added: "تمت إضافة الرمز.",
  avatar: "الصورة",
  change_avatar: "تغيير الصورة",
  remove_avatar: "إزالة الصورة",
  coming_soon: "قريبًا (الواجهة جاهزة).",
  delete_vault_confirm: "حذف الـ vault المحلي؟ تحتاج إلى seed للاستعادة.",
  wrong_password: "كلمة مرور خاطئة.",
  no_vault: "لم يتم العثور على vault محلي.",
  invalid_seed: "Seed غير صالحة.",
  pw_min: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
  pw_match: "كلمتا المرور غير متطابقتين.",
  invalid_addr: "عنوان غير صالح.",
  invalid_amount: "كمية غير صالحة.",
  amount_gt0: "يجب أن تكون الكمية أكبر من 0.",
  camera_fail: "تعذر استخدام الكاميرا.",
  qr_ok: "تم التقاط QR.",
  create_account: "إنشاء حساب",
  account_switcher: "تبديل الحساب",
  open: "فتح",
  buy: "شراء",
  balance: "الرصيد",
  estimated_fee: "الرسوم المقدرة",
  fee_pending: "تظهر معاينة الرسوم بعد إدخال العنوان والكمية.",
  history_empty: "لا توجد معاملات محملة.",
  from: "من",
  to_network: "إلى الشبكة",
  from_network: "من الشبكة",
  estimated_receive: "الاستلام المتوقع",
  preview_quote: "سعر تقديري",
  session: "الجلسة",
  security: "الأمان",
  vault: "Vault",
  language: "اللغة",
  global: "عام",
  local: "محلي",
  native_coin: "عملة أصلية",
  use_my_address: "استخدم عنواني",
  network: "الشبكة",
};

const HI: Record<UIKey, string> = {
  dashboard: "डैशबोर्ड",
  send: "भेजें",
  receive: "प्राप्त करें",
  tokens: "टोकन",
  activity: "गतिविधि",
  swap: "स्वैप",
  bridge: "ब्रिज",
  settings: "सेटिंग्स",
  create: "बनाएँ",
  import: "इम्पोर्ट",
  unlock: "अनलॉक",
  password: "पासवर्ड",
  confirm: "पुष्टि करें",
  seed_new: "नई seed (12 शब्द)",
  seed_import: "Seed phrase",
  secure_enter: "सुरक्षित करें और प्रवेश करें",
  generate: "जेनरेट",
  copied: "कॉपी हुआ.",
  scan_qr: "QR स्कैन करें",
  keep_session: "इस सत्र में खुला रखें",
  logout: "लॉक",
  total_balance: "कुल बैलेंस",
  refresh_tokens: "टोकन रिफ्रेश करें",
  refresh_activity: "गतिविधि रिफ्रेश करें",
  send_token: "एसेट भेजें",
  token: "एसेट",
  to: "को",
  amount: "राशि",
  sending: "भेजा जा रहा है...",
  need_gas: "गैस के लिए INRI चाहिए.",
  your_address: "आपका पता",
  explorer: "Explorer",
  add_token: "टोकन जोड़ें",
  custom_tokens: "कस्टम टोकन",
  token_symbol: "सिंबल",
  token_decimals: "डेसिमल",
  token_address: "टोकन पता",
  token_logo: "लोगो (वैकल्पिक)",
  token_added: "टोकन जोड़ा गया.",
  avatar: "अवतार",
  change_avatar: "अवतार बदलें",
  remove_avatar: "अवतार हटाएँ",
  coming_soon: "जल्द आ रहा है (UI तैयार है).",
  delete_vault_confirm: "लोकल vault हटाएँ? बहाली के लिए seed चाहिए.",
  wrong_password: "गलत पासवर्ड.",
  no_vault: "कोई लोकल vault नहीं मिला.",
  invalid_seed: "अमान्य seed.",
  pw_min: "पासवर्ड कम से कम 8 अक्षरों का होना चाहिए.",
  pw_match: "पासवर्ड मेल नहीं खाते.",
  invalid_addr: "अमान्य पता.",
  invalid_amount: "अमान्य राशि.",
  amount_gt0: "राशि 0 से अधिक होनी चाहिए.",
  camera_fail: "कैमरा उपयोग नहीं हो सका.",
  qr_ok: "QR कैप्चर किया गया.",
  create_account: "खाता बनाएँ",
  account_switcher: "खाता बदलें",
  open: "खोलें",
  buy: "खरीदें",
  balance: "बैलेंस",
  estimated_fee: "अनुमानित शुल्क",
  fee_pending: "शुल्क प्रीव्यू पता और राशि भरने के बाद दिखाई देगा.",
  history_empty: "कोई ट्रांजैक्शन लोड नहीं हुआ.",
  from: "से",
  to_network: "गंतव्य नेटवर्क",
  from_network: "स्रोत नेटवर्क",
  estimated_receive: "अनुमानित प्राप्ति",
  preview_quote: "प्रीव्यू कोट",
  session: "सेशन",
  security: "सुरक्षा",
  vault: "Vault",
  language: "भाषा",
  global: "ग्लोबल",
  local: "लोकल",
  native_coin: "मूल कॉइन",
  use_my_address: "मेरा पता उपयोग करें",
  network: "नेटवर्क",
};

const ID: Record<UIKey, string> = {
  dashboard: "Dasbor",
  send: "Kirim",
  receive: "Terima",
  tokens: "Token",
  activity: "Aktivitas",
  swap: "Swap",
  bridge: "Bridge",
  settings: "Pengaturan",
  create: "Buat",
  import: "Impor",
  unlock: "Buka kunci",
  password: "Kata sandi",
  confirm: "Konfirmasi",
  seed_new: "Seed baru (12 kata)",
  seed_import: "Frasa seed",
  secure_enter: "Amankan & Masuk",
  generate: "Buat",
  copied: "Disalin.",
  scan_qr: "Pindai QR",
  keep_session: "Tetap terbuka di sesi ini",
  logout: "Kunci",
  total_balance: "Saldo total",
  refresh_tokens: "Muat ulang token",
  refresh_activity: "Muat ulang aktivitas",
  send_token: "Kirim aset",
  token: "Aset",
  to: "Ke",
  amount: "Jumlah",
  sending: "Mengirim...",
  need_gas: "Perlu INRI untuk gas.",
  your_address: "Alamat Anda",
  explorer: "Explorer",
  add_token: "Tambah token",
  custom_tokens: "Token kustom",
  token_symbol: "Simbol",
  token_decimals: "Desimal",
  token_address: "Alamat token",
  token_logo: "Logo (opsional)",
  token_added: "Token ditambahkan.",
  avatar: "Avatar",
  change_avatar: "Ubah avatar",
  remove_avatar: "Hapus avatar",
  coming_soon: "Segera hadir (UI siap).",
  delete_vault_confirm: "Hapus vault lokal? Anda perlu seed untuk memulihkan.",
  wrong_password: "Kata sandi salah.",
  no_vault: "Vault lokal tidak ditemukan.",
  invalid_seed: "Seed tidak valid.",
  pw_min: "Kata sandi minimal 8 karakter.",
  pw_match: "Kata sandi tidak cocok.",
  invalid_addr: "Alamat tidak valid.",
  invalid_amount: "Jumlah tidak valid.",
  amount_gt0: "Jumlah harus lebih besar dari 0.",
  camera_fail: "Kamera tidak dapat digunakan.",
  qr_ok: "QR ditangkap.",
  create_account: "Buat Akun",
  account_switcher: "Ganti akun",
  open: "Buka",
  buy: "Beli",
  balance: "Saldo",
  estimated_fee: "Biaya estimasi",
  fee_pending: "Pratinjau biaya muncul setelah tujuan dan jumlah diisi.",
  history_empty: "Tidak ada transaksi dimuat.",
  from: "Dari",
  to_network: "Ke jaringan",
  from_network: "Dari jaringan",
  estimated_receive: "Estimasi diterima",
  preview_quote: "Estimasi kurs",
  session: "Sesi",
  security: "Keamanan",
  vault: "Vault",
  language: "Bahasa",
  global: "Global",
  local: "Lokal",
  native_coin: "koin native",
  use_my_address: "Gunakan alamat saya",
  network: "Jaringan",
};

const VI: Record<UIKey, string> = {
  dashboard: "Bảng điều khiển",
  send: "Gửi",
  receive: "Nhận",
  tokens: "Token",
  activity: "Hoạt động",
  swap: "Swap",
  bridge: "Bridge",
  settings: "Cài đặt",
  create: "Tạo",
  import: "Nhập",
  unlock: "Mở khóa",
  password: "Mật khẩu",
  confirm: "Xác nhận",
  seed_new: "Seed mới (12 từ)",
  seed_import: "Cụm seed",
  secure_enter: "Bảo vệ & Vào",
  generate: "Tạo",
  copied: "Đã sao chép.",
  scan_qr: "Quét QR",
  keep_session: "Giữ mở trong phiên này",
  logout: "Khóa",
  total_balance: "Tổng số dư",
  refresh_tokens: "Làm mới token",
  refresh_activity: "Làm mới hoạt động",
  send_token: "Gửi tài sản",
  token: "Tài sản",
  to: "Đến",
  amount: "Số lượng",
  sending: "Đang gửi...",
  need_gas: "Cần INRI cho gas.",
  your_address: "Địa chỉ của bạn",
  explorer: "Explorer",
  add_token: "Thêm token",
  custom_tokens: "Token thủ công",
  token_symbol: "Ký hiệu",
  token_decimals: "Số thập phân",
  token_address: "Địa chỉ token",
  token_logo: "Logo (tùy chọn)",
  token_added: "Đã thêm token.",
  avatar: "Ảnh đại diện",
  change_avatar: "Đổi ảnh đại diện",
  remove_avatar: "Xóa ảnh đại diện",
  coming_soon: "Sắp có (UI sẵn sàng).",
  delete_vault_confirm: "Xóa vault cục bộ? Bạn cần seed để khôi phục.",
  wrong_password: "Sai mật khẩu.",
  no_vault: "Không tìm thấy vault cục bộ.",
  invalid_seed: "Seed không hợp lệ.",
  pw_min: "Mật khẩu phải có ít nhất 8 ký tự.",
  pw_match: "Mật khẩu không khớp.",
  invalid_addr: "Địa chỉ không hợp lệ.",
  invalid_amount: "Số lượng không hợp lệ.",
  amount_gt0: "Số lượng phải lớn hơn 0.",
  camera_fail: "Không thể sử dụng camera.",
  qr_ok: "Đã quét QR.",
  create_account: "Tạo tài khoản",
  account_switcher: "Chuyển tài khoản",
  open: "Mở",
  buy: "Mua",
  balance: "Số dư",
  estimated_fee: "Phí ước tính",
  fee_pending: "Xem trước phí sẽ xuất hiện sau khi nhập địa chỉ và số lượng.",
  history_empty: "Không có giao dịch nào được tải.",
  from: "Từ",
  to_network: "Đến mạng",
  from_network: "Từ mạng",
  estimated_receive: "Ước tính nhận",
  preview_quote: "Báo giá tạm tính",
  session: "Phiên",
  security: "Bảo mật",
  vault: "Vault",
  language: "Ngôn ngữ",
  global: "Toàn cầu",
  local: "Cục bộ",
  native_coin: "coin gốc",
  use_my_address: "Dùng địa chỉ của tôi",
  network: "Mạng",
};

const TH: Record<UIKey, string> = {
  dashboard: "แดชบอร์ด",
  send: "ส่ง",
  receive: "รับ",
  tokens: "โทเค็น",
  activity: "กิจกรรม",
  swap: "Swap",
  bridge: "Bridge",
  settings: "ตั้งค่า",
  create: "สร้าง",
  import: "นำเข้า",
  unlock: "ปลดล็อก",
  password: "รหัสผ่าน",
  confirm: "ยืนยัน",
  seed_new: "Seed ใหม่ (12 คำ)",
  seed_import: "Seed phrase",
  secure_enter: "ป้องกันและเข้าใช้งาน",
  generate: "สร้าง",
  copied: "คัดลอกแล้ว",
  scan_qr: "สแกน QR",
  keep_session: "คงการเปิดใช้งานในเซสชันนี้",
  logout: "ล็อก",
  total_balance: "ยอดรวม",
  refresh_tokens: "รีเฟรชโทเค็น",
  refresh_activity: "รีเฟรชกิจกรรม",
  send_token: "ส่งสินทรัพย์",
  token: "สินทรัพย์",
  to: "ถึง",
  amount: "จำนวน",
  sending: "กำลังส่ง...",
  need_gas: "ต้องใช้ INRI สำหรับ gas",
  your_address: "ที่อยู่ของคุณ",
  explorer: "Explorer",
  add_token: "เพิ่มโทเค็น",
  custom_tokens: "โทเค็นกำหนดเอง",
  token_symbol: "สัญลักษณ์",
  token_decimals: "ทศนิยม",
  token_address: "ที่อยู่โทเค็น",
  token_logo: "โลโก้ (ไม่บังคับ)",
  token_added: "เพิ่มโทเค็นแล้ว",
  avatar: "อวตาร",
  change_avatar: "เปลี่ยนอวตาร",
  remove_avatar: "ลบอวตาร",
  coming_soon: "เร็ว ๆ นี้ (UI พร้อมแล้ว)",
  delete_vault_confirm: "ลบ vault ในเครื่อง? คุณต้องมี seed เพื่อกู้คืน",
  wrong_password: "รหัสผ่านไม่ถูกต้อง",
  no_vault: "ไม่พบ vault ในเครื่อง",
  invalid_seed: "Seed ไม่ถูกต้อง",
  pw_min: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
  pw_match: "รหัสผ่านไม่ตรงกัน",
  invalid_addr: "ที่อยู่ไม่ถูกต้อง",
  invalid_amount: "จำนวนไม่ถูกต้อง",
  amount_gt0: "จำนวนต้องมากกว่า 0",
  camera_fail: "ไม่สามารถใช้กล้องได้",
  qr_ok: "จับ QR แล้ว",
  create_account: "สร้างบัญชี",
  account_switcher: "สลับบัญชี",
  open: "เปิด",
  buy: "ซื้อ",
  balance: "ยอดคงเหลือ",
  estimated_fee: "ค่าธรรมเนียมโดยประมาณ",
  fee_pending: "ตัวอย่างค่าธรรมเนียมจะแสดงหลังจากกรอกปลายทางและจำนวน",
  history_empty: "ไม่มีธุรกรรมที่โหลด",
  from: "จาก",
  to_network: "ไปยังเครือข่าย",
  from_network: "จากเครือข่าย",
  estimated_receive: "คาดว่าจะได้รับ",
  preview_quote: "ราคาโดยประมาณ",
  session: "เซสชัน",
  security: "ความปลอดภัย",
  vault: "Vault",
  language: "ภาษา",
  global: "ทั่วโลก",
  local: "ภายในเครื่อง",
  native_coin: "เหรียญเนทีฟ",
  use_my_address: "ใช้ที่อยู่ของฉัน",
  network: "เครือข่าย",
};

const ZH: Record<UIKey, string> = {
  dashboard: "仪表板",
  send: "发送",
  receive: "接收",
  tokens: "代币",
  activity: "活动",
  swap: "兑换",
  bridge: "桥接",
  settings: "设置",
  create: "创建",
  import: "导入",
  unlock: "解锁",
  password: "密码",
  confirm: "确认",
  seed_new: "新 seed（12 个词）",
  seed_import: "Seed 短语",
  secure_enter: "保护并进入",
  generate: "生成",
  copied: "已复制。",
  scan_qr: "扫描 QR",
  keep_session: "在此会话中保持解锁",
  logout: "锁定",
  total_balance: "总余额",
  refresh_tokens: "刷新代币",
  refresh_activity: "刷新活动",
  send_token: "发送资产",
  token: "资产",
  to: "到",
  amount: "数量",
  sending: "发送中...",
  need_gas: "需要 INRI 支付 gas。",
  your_address: "您的地址",
  explorer: "Explorer",
  add_token: "添加代币",
  custom_tokens: "自定义代币",
  token_symbol: "符号",
  token_decimals: "小数位",
  token_address: "代币地址",
  token_logo: "Logo（可选）",
  token_added: "代币已添加。",
  avatar: "头像",
  change_avatar: "更换头像",
  remove_avatar: "删除头像",
  coming_soon: "即将推出（界面已准备）。",
  delete_vault_confirm: "删除本地 vault？恢复时需要 seed。",
  wrong_password: "密码错误。",
  no_vault: "未找到本地 vault。",
  invalid_seed: "无效的 seed。",
  pw_min: "密码至少需要 8 个字符。",
  pw_match: "密码不匹配。",
  invalid_addr: "无效地址。",
  invalid_amount: "无效数量。",
  amount_gt0: "数量必须大于 0。",
  camera_fail: "无法使用相机。",
  qr_ok: "已捕获 QR。",
  create_account: "创建账户",
  account_switcher: "切换账户",
  open: "打开",
  buy: "购买",
  balance: "余额",
  estimated_fee: "预估手续费",
  fee_pending: "填写目标地址和数量后显示手续费预览。",
  history_empty: "没有已加载的交易。",
  from: "从",
  to_network: "到网络",
  from_network: "来源网络",
  estimated_receive: "预计接收",
  preview_quote: "预览报价",
  session: "会话",
  security: "安全",
  vault: "Vault",
  language: "语言",
  global: "全局",
  local: "本地",
  native_coin: "原生代币",
  use_my_address: "使用我的地址",
  network: "网络",
};

const JA: Record<UIKey, string> = {
  dashboard: "ダッシュボード",
  send: "送信",
  receive: "受取",
  tokens: "トークン",
  activity: "アクティビティ",
  swap: "スワップ",
  bridge: "ブリッジ",
  settings: "設定",
  create: "作成",
  import: "インポート",
  unlock: "ロック解除",
  password: "パスワード",
  confirm: "確認",
  seed_new: "新しい seed（12語）",
  seed_import: "Seed フレーズ",
  secure_enter: "保護して入る",
  generate: "生成",
  copied: "コピーしました。",
  scan_qr: "QR スキャン",
  keep_session: "このセッションでロック解除を保持",
  logout: "ロック",
  total_balance: "合計残高",
  refresh_tokens: "トークン更新",
  refresh_activity: "アクティビティ更新",
  send_token: "資産を送信",
  token: "資産",
  to: "宛先",
  amount: "数量",
  sending: "送信中...",
  need_gas: "gas に INRI が必要です。",
  your_address: "あなたのアドレス",
  explorer: "Explorer",
  add_token: "トークン追加",
  custom_tokens: "カスタムトークン",
  token_symbol: "シンボル",
  token_decimals: "小数",
  token_address: "トークンアドレス",
  token_logo: "ロゴ（任意）",
  token_added: "トークンを追加しました。",
  avatar: "アバター",
  change_avatar: "アバター変更",
  remove_avatar: "アバター削除",
  coming_soon: "近日公開（UI 準備済み）。",
  delete_vault_confirm: "ローカル vault を削除しますか？復元には seed が必要です。",
  wrong_password: "パスワードが違います。",
  no_vault: "ローカル vault が見つかりません。",
  invalid_seed: "無効な seed です。",
  pw_min: "パスワードは8文字以上必要です。",
  pw_match: "パスワードが一致しません。",
  invalid_addr: "無効なアドレスです。",
  invalid_amount: "無効な数量です。",
  amount_gt0: "数量は0より大きい必要があります。",
  camera_fail: "カメラを使用できませんでした。",
  qr_ok: "QR を読み取りました。",
  create_account: "アカウント作成",
  account_switcher: "アカウント切替",
  open: "開く",
  buy: "購入",
  balance: "残高",
  estimated_fee: "推定手数料",
  fee_pending: "送信先と数量を入力すると手数料プレビューが表示されます。",
  history_empty: "読み込まれた取引はありません。",
  from: "送信元",
  to_network: "送信先ネットワーク",
  from_network: "送信元ネットワーク",
  estimated_receive: "受取見積もり",
  preview_quote: "見積もりレート",
  session: "セッション",
  security: "セキュリティ",
  vault: "Vault",
  language: "言語",
  global: "グローバル",
  local: "ローカル",
  native_coin: "ネイティブコイン",
  use_my_address: "自分のアドレスを使う",
  network: "ネットワーク",
};

const KO: Record<UIKey, string> = {
  dashboard: "대시보드",
  send: "보내기",
  receive: "받기",
  tokens: "토큰",
  activity: "활동",
  swap: "스왑",
  bridge: "브리지",
  settings: "설정",
  create: "생성",
  import: "가져오기",
  unlock: "잠금 해제",
  password: "비밀번호",
  confirm: "확인",
  seed_new: "새 seed (12단어)",
  seed_import: "Seed 문구",
  secure_enter: "보호 후 प्रवेश",
  generate: "생성",
  copied: "복사됨.",
  scan_qr: "QR 스캔",
  keep_session: "이 세션에서 잠금 해제 유지",
  logout: "잠금",
  total_balance: "총 잔액",
  refresh_tokens: "토큰 새로고침",
  refresh_activity: "활동 새로고침",
  send_token: "자산 보내기",
  token: "자산",
  to: "받는 주소",
  amount: "수량",
  sending: "전송 중...",
  need_gas: "가스를 위해 INRI가 필요합니다.",
  your_address: "내 주소",
  explorer: "Explorer",
  add_token: "토큰 추가",
  custom_tokens: "사용자 지정 토큰",
  token_symbol: "심볼",
  token_decimals: "소수점",
  token_address: "토큰 주소",
  token_logo: "로고 (선택)",
  token_added: "토큰이 추가되었습니다.",
  avatar: "아바타",
  change_avatar: "아바타 변경",
  remove_avatar: "아바타 제거",
  coming_soon: "곧 제공됩니다 (UI 준비 완료).",
  delete_vault_confirm: "로컬 vault를 삭제하시겠습니까? 복원하려면 seed가 필요합니다.",
  wrong_password: "잘못된 비밀번호입니다.",
  no_vault: "로컬 vault를 찾을 수 없습니다.",
  invalid_seed: "유효하지 않은 seed입니다.",
  pw_min: "비밀번호는 최소 8자 이상이어야 합니다.",
  pw_match: "비밀번호가 일치하지 않습니다.",
  invalid_addr: "유효하지 않은 주소입니다.",
  invalid_amount: "유효하지 않은 수량입니다.",
  amount_gt0: "수량은 0보다 커야 합니다.",
  camera_fail: "카메라를 사용할 수 없습니다.",
  qr_ok: "QR 캡처 완료.",
  create_account: "계정 생성",
  account_switcher: "계정 전환",
  open: "열기",
  buy: "구매",
  balance: "잔액",
  estimated_fee: "예상 수수료",
  fee_pending: "목적지와 수량을 입력하면 수수료 미리보기가 표시됩니다.",
  history_empty: "불러온 거래가 없습니다.",
  from: "보내는 자산",
  to_network: "도착 네트워크",
  from_network: "출발 네트워크",
  estimated_receive: "예상 수령량",
  preview_quote: "미리보기 가격",
  session: "세션",
  security: "보안",
  vault: "Vault",
  language: "언어",
  global: "글로벌",
  local: "로컬",
  native_coin: "네이티브 코인",
  use_my_address: "내 주소 사용",
  network: "네트워크",
};

const TRANSLATIONS: Record<Lang, Record<UIKey, string>> = {
  pt: PT,
  en: EN,
  es: ES,
  fr: FR,
  de: DE,
  ru: RU,
  tr: TR,
  ar: AR,
  hi: HI,
  id: ID,
  vi: VI,
  th: TH,
  zh: ZH,
  ja: JA,
  ko: KO,
};

function tr(lang: Lang, key: UIKey) {
  return TRANSLATIONS[lang]?.[key] ?? PT[key] ?? EN[key] ?? key;
}

const DEFAULT_TOKENS: Token[] = [
  {
    symbol: "iUSD",
    address: "0x116b2fF23e062A52E2c0ea12dF7e2638b62Fa0FC",
    decimals: 6,
    logo: "/token-iusd.png",
  },
  {
    symbol: "WINRI",
    address: "0x8731F1709745173470821eAeEd9BC600EEC9A3D1",
    decimals: 18,
    logo: "/token-winri.png",
  },
  {
    symbol: "DNR",
    address: "0xDa9541bB01d9EC1991328516C71B0E539a97d27f",
    decimals: 18,
    logo: "/token-dnr.png",
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
  if (s === "INRI") return "/token-inri.png";
  if (s === "IUSD") return "/token-iusd.png";
  if (s === "WINRI") return "/token-winri.png";
  if (s === "DNR") return "/token-dnr.png";
  return "";
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
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) as Lang) || "pt");

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
  const [loadingTxs, setLoadingTxs] = useState(false);

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

  const mobileAccountPanel = (
    <div className="mobileDrawer">
      <div className="drawerHead">
        <div>
          <b>INRI CHAIN</b>
          <div className="muted2">ChainId {INRI.chainIdDec}</div>
        </div>
        {networkOk ? <span className="badgeOk">Online</span> : <span className="badgeBad">Offline</span>}
      </div>

      <div className="drawerBody">
        <div className="accountPill">
          <div className="accountLeft">
            <div className="avatarPill">
              {avatar ? <img src={avatar} alt="avatar" /> : <div className="avatarDot" />}
            </div>
            <div>
              <div className="pillTitle">{view === "wallet" ? "Wallet" : "Not unlocked"}</div>
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
            Path: <span className="mono">m/44&apos;/60&apos;/0&apos;/0/i</span>
          </div>
        </div>

        <div className="cardFlat">
          <div className="muted">{tr(lang, "balance")}</div>
          <div className="balBig">{Number(balance).toFixed(6)}</div>
          <div className="muted2">INRI</div>
        </div>
      </div>
    </div>
  );

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  }

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selected]);

  useEffect(() => {
    estimateSendFee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (!sym) return showToast("Symbol required.");
    if (!ethers.isAddress(addr)) return showToast("Invalid token address.");
    if (!Number.isFinite(dec) || dec < 0 || dec > 36) return showToast("Invalid decimals.");

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

  function createAnotherAccount() {
    setAccountCount((v) => v + 1);
    showToast("New account created.");
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

      const video = document.getElementById("qrVideo") as HTMLVideoElement | null;
      if (!video) throw new Error("no video");

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const deviceId = devices?.[0]?.deviceId;

      await reader.decodeFromVideoDevice(deviceId, video, (result) => {
        if (result?.getText) {
          const txt = result.getText();
          const m = txt.match(/0x[a-fA-F0-9]{40}/);
          if (m?.[0]) {
            setSendTo(m[0]);
            setTab("send");
            setScanOpen(false);
            setScanBusy(false);
            reader.reset();
            showToast(tr(lang, "qr_ok"));
          }
        }
      });
    } catch {
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
      { symbol: "INRI", amount: balance, logo: "/token-inri.png", subtitle: tr(lang, "native_coin") },
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
          grid-template-columns: 230px 1fr 320px;
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
        .swapHeaderRow{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
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
        .swapAssetPreview{
          display:flex;
          align-items:center;
          gap:8px;
          color:var(--text);
          font-weight:700;
        }
        .swapMiniLogo{
          width:26px;
          height:26px;
        }
        .assetBalance{
          font-size:12px;
          color:var(--muted);
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
            <img className="brandLogo" src="/favicon.png" alt="INRI" />
            <div className="brandTxt">
              <b>INRI Wallet</b>
              <span>Official PWA • INRI CHAIN</span>
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
              <b>{tab === "dashboard" ? "Wallet" : tr(lang, tab as UIKey)}</b>
              <span className="muted2">
                RPC <span className="mono">{INRI.rpcUrls[0]}</span>
              </span>
            </div>

            <div className="headerActions">
              {networkOk ? (
                <span className="badgeOk">Online • {chainId}</span>
              ) : (
                <span className="badgeBad">RPC issue</span>
              )}

              {view === "wallet" ? (
                <button className="btn" onClick={lock}>
                  <Lock size={16} /> {tr(lang, "logout")}
                </button>
              ) : (
                <button className="btn" onClick={resetLocal}>
                  <Trash2 size={16} /> Reset
                </button>
              )}

              <button
                className="btn btnPrimary"
                onClick={() => document.getElementById("appTop")?.scrollIntoView({ behavior: "smooth" })}
              >
                Launch
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
                  (Ao fechar o app, volta a pedir senha.)
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
                    <div className="muted smallTop">Backup your seed offline. Nobody can recover funds.</div>
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
                    <div className="muted smallTop">This wallet stores your seed encrypted locally (PWA).</div>
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
                    placeholder="password..."
                  />
                  <button className="btn btnPrimary" onClick={unlock}>
                    {tr(lang, "unlock")}
                  </button>
                </div>
                <div className="muted smallTop">Seed fica criptografada no seu dispositivo.</div>
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
                        <div className="swapAssetPreview">
                          <div className="tokenLogo swapMiniLogo">
                            {getAssetLogo(sendAsset) ? <img src={getAssetLogo(sendAsset)} alt={sendAsset} /> : <div className="tokenFallback" />}
                          </div>
                          <span>{sendAsset}</span>
                        </div>
                        <div className="assetBalance">
                          {tr(lang, "balance")}: {getBalanceForAsset(sendAsset)}
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
                        {estimatedGasFee ? "Amount paid to process the transaction on network." : tr(lang, "fee_pending")}
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
                            <Copy size={16} /> Copy
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
                    <div className="muted smallTop">Auto balances (ERC-20)</div>

                    <div className="tokenList">
                      <div className="tokenRow">
                        <div className="tokenLeft">
                          <div className="tokenLogo">
                            <img src="/token-inri.png" alt="INRI" />
                          </div>
                          <div>
                            <div className="tokenSym">INRI</div>
                            <div className="mono muted2 tokenAddr">{tr(lang, "native_coin")}</div>
                          </div>
                        </div>
                        <div className="tokenBal">{Number(balance).toFixed(6)}</div>
                      </div>

                      {TOKENS.map((t) => (
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
                          <div className="tokenBal">{tokenBalances[t.symbol] ?? "0.0"}</div>
                        </div>
                      ))}
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
                        <div className="assetChooserTop">
                          <div className="swapAssetPreview">
                            <div className="tokenLogo swapMiniLogo">
                              {getAssetLogo(swapFromAsset) ? <img src={getAssetLogo(swapFromAsset)} alt={swapFromAsset} /> : <div className="tokenFallback" />}
                            </div>
                            <span>{swapFromAsset}</span>
                          </div>
                          <div className="assetBalance">
                            {tr(lang, "balance")}: {getBalanceForAsset(swapFromAsset)}
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
                        <div className="assetChooserTop">
                          <div className="swapAssetPreview">
                            <div className="tokenLogo swapMiniLogo">
                              {getAssetLogo(swapToAsset) ? <img src={getAssetLogo(swapToAsset)} alt={swapToAsset} /> : <div className="tokenFallback" />}
                            </div>
                            <span>{swapToAsset}</span>
                          </div>
                          <div className="assetBalance">
                            {tr(lang, "balance")}: {getBalanceForAsset(swapToAsset)}
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
                          Fee and final quote will update when real swap contracts are connected.
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
                        <div className="assetChooserTop">
                          <div className="swapAssetPreview">
                            <div className="tokenLogo swapMiniLogo">
                              {getAssetLogo(bridgeAsset) ? <img src={getAssetLogo(bridgeAsset)} alt={bridgeAsset} /> : <div className="tokenFallback" />}
                            </div>
                            <span>{bridgeAsset}</span>
                          </div>
                          <div className="assetBalance">
                            {tr(lang, "balance")}: {getBalanceForAsset(bridgeAsset)}
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
                          Preview uses your bridge fee of 0.2%.
                        </div>
                      </div>

                      <div className="feeBox">
                        <div className="labelRow">
                          <div className="label" style={{ margin: 0 }}>{tr(lang, "estimated_fee")}</div>
                          <span className="tokenBal">bridge preview</span>
                        </div>
                        <div className="muted2" style={{ fontSize: 12, marginTop: 8 }}>
                          Final bridge fee and route will update when bridge contracts are connected.
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
                        <input className="input" value={tokLogo} onChange={(e) => setTokLogo(e.target.value)} placeholder="/token-xxx.png" />

                        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button className="btn btnPrimary" onClick={addCustomToken}>
                            <Plus size={16} /> {tr(lang, "add_token")}
                          </button>
                        </div>

                        <div className="muted smallTop">Dica: iUSD = 6 decimais. WINRI/DNR = 18.</div>
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
                            <Trash2 size={16} /> Reset
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
            {networkOk ? <span className="badgeOk">Online</span> : <span className="badgeBad">Offline</span>}
          </div>

          <div className="drawerBody">
            <div className="accountPill">
              <div className="accountLeft">
                <div className="avatarPill">
                  {avatar ? <img src={avatar} alt="avatar" /> : <div className="avatarDot" />}
                </div>
                <div>
                  <div className="pillTitle">{view === "wallet" ? "Wallet" : "Not unlocked"}</div>
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
                Path: <span className="mono">m/44&apos;/60&apos;/0&apos;/0/i</span>
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
            <div className="muted smallTop">Point camera to QR. It will fill the address automatically.</div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}