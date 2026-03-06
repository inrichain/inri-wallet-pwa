import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Coins, Home, QrCode, Send, Settings } from "lucide-react";
import { ethers } from "ethers";

import Header from "./components/Header";
import BottomNav from "./components/BottomNav";
import DashboardScreen from "./screens/DashboardScreen";
import SendScreen from "./screens/SendScreen";
import ReceiveScreen from "./screens/ReceiveScreen";
import TokensScreen from "./screens/TokensScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { INRI } from "./lib/inri";
import { createMnemonic12, isValidMnemonic } from "./lib/mnemonic";
import { clearVault, decryptMnemonicFromVault, encryptMnemonicToVault, loadVault, saveVault } from "./lib/cryptoVault";
import { deriveAddressesFromMnemonic, walletFromMnemonicIndex } from "./lib/walletDerive";
import { tr } from "./i18n/translations";
import { AVATAR_KEY, LANG_KEY, SESSION_KEY, TOKENS_KEY, TXS_KEY } from "./state/constants";
import { DEFAULT_TOKENS } from "./state/defaultTokens";
import type { Lang, LocalTx, Tab, Token, View } from "./types/wallet";
import { assetUrl, getAssetLogo, shortAddr } from "./utils/assets";

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
  amount: string,
) {
  const abi = ["function transfer(address to, uint256 amount) returns (bool)"];
  const wallet = walletFromMnemonicIndex(mnemonic, index).connect(provider);
  const c = new ethers.Contract(token.address, abi, wallet);
  const value = ethers.parseUnits(amount, token.decimals);
  return c.transfer(to, value);
}

function NavItem({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`navItem ${active ? "navItemActive" : ""}`} onClick={onClick}>
      {icon}
      <div className="navLabel">{label}</div>
    </button>
  );
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) as Lang) || "en");
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
    [mnemonic, accountCount],
  );

  const selected = accounts.find((a) => a.index === selectedIndex)?.address || "";

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
    const p = new ethers.JsonRpcProvider(INRI.rpcUrls[0], { name: "inri", chainId: INRI.chainIdDec });
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
        const gas = await provider.estimateGas({ from: selected, to: sendTo, value });
        const gasPrice = feeData.gasPrice ?? 0n;
        setEstimatedGasFee(ethers.formatEther(gas * gasPrice));
        return;
      }
      const token = TOKENS.find((t) => t.symbol === sendAsset);
      if (!token || !mnemonic) return setEstimatedGasFee("");
      const wallet = walletFromMnemonicIndex(mnemonic, selectedIndex).connect(provider);
      const abi = ["function transfer(address to, uint256 amount) returns (bool)"];
      const c = new ethers.Contract(token.address, abi, wallet);
      const value = ethers.parseUnits(sendAmount || "0", token.decimals);
      const gas = await c.transfer.estimateGas(sendTo, value);
      const gasPrice = feeData.gasPrice ?? 0n;
      setEstimatedGasFee(ethers.formatEther(gas * gasPrice));
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

  function generateSeed() {
    const m = createMnemonic12();
    setNewMnemonic(m);
    showToast(tr(lang, "seed_generated_save_offline"));
  }

  async function createWallet() {
    if (!newMnemonic) return showToast(tr(lang, "generate_seed_first"));
    if (pw.length < 8) return showToast(tr(lang, "pw_min"));
    if (pw !== pw2) return showToast(tr(lang, "pw_match"));
    const vault = await encryptMnemonicToVault(newMnemonic, pw);
    saveVault(vault);
    setMnemonic(newMnemonic);
    if (keepSession) sessionStorage.setItem(SESSION_KEY, newMnemonic);
    setView("wallet");
    setTab("dashboard");
    showToast(tr(lang, "wallet_created"));
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
    showToast(tr(lang, "wallet_imported"));
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
      showToast(tr(lang, "unlocked"));
    } catch {
      showToast(tr(lang, "wrong_password"));
    }
  }

  function lock() {
    setMnemonic("");
    setUnlockPw("");
    sessionStorage.removeItem(SESSION_KEY);
    setView(loadVault() ? "unlock" : "welcome");
    showToast(tr(lang, "locked"));
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
    showToast(tr(lang, "local_vault_deleted"));
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
        addLocalTx({ hash: tx.hash, from: wallet.address, to, symbol: "INRI", amount: sendAmount, createdAt: new Date().toISOString(), source: "local" });
        showToast(`Sent ${sendAmount} INRI`);
      } else {
        const token = TOKENS.find((t) => t.symbol === sendAsset);
        if (!token) throw new Error("Token not found");
        const wallet = walletFromMnemonicIndex(mnemonic, selectedIndex).connect(provider);
        const tx = await sendERC20(provider, mnemonic, selectedIndex, token, to, sendAmount);
        addLocalTx({ hash: tx.hash, from: wallet.address, to, symbol: token.symbol, amount: sendAmount, createdAt: new Date().toISOString(), source: "local" });
        showToast(`Sent ${sendAmount} ${token.symbol}`);
        setTimeout(() => refreshTokens(), 1200);
      }
      setSendTo("");
      setSendAmount("");
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
      showToast(tr(lang, "copy_failed"));
    }
  }

  function openExplorerAddress(addr: string) {
    window.open(`${INRI.blockExplorerUrls[0]}/address/${addr}`, "_blank", "noopener,noreferrer");
  }

  function onAvatarFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setAvatar(dataUrl);
      localStorage.setItem(AVATAR_KEY, dataUrl);
      showToast(tr(lang, "avatar_updated"));
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatar("");
    localStorage.removeItem(AVATAR_KEY);
    showToast(tr(lang, "avatar_removed"));
  }

  function addCustomToken() {
    const sym = tokSymbol.trim().toUpperCase();
    const addr = tokAddr.trim();
    const dec = Number(tokDec);
    if (!sym) return showToast(tr(lang, "symbol_required"));
    if (!ethers.isAddress(addr)) return showToast(tr(lang, "invalid_token_address"));
    if (!Number.isFinite(dec) || dec < 0 || dec > 36) return showToast(tr(lang, "invalid_decimals"));
    const token: Token = { symbol: sym, address: addr, decimals: dec, logo: tokLogo.trim() || undefined };
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
    const next = customTokens.filter((t) => !(t.symbol === symbol && t.address.toLowerCase() === address.toLowerCase()));
    setCustomTokens(next);
    localStorage.setItem(TOKENS_KEY, JSON.stringify(next));
    if (sendAsset === symbol) setSendAsset("INRI");
    showToast(tr(lang, "token_removed"));
    setTimeout(() => refreshTokens(), 300);
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
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: backCamera?.deviceId
          ? { deviceId: { exact: backCamera.deviceId } }
          : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
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

  function getBalanceForAsset(symbol: string) {
    if (symbol.toUpperCase() === "INRI") return Number(balance || "0").toFixed(6);
    return tokenBalances[symbol] ?? "0.0";
  }

  const totalAssets = useMemo(
    () => [
      { symbol: "INRI", amount: Number(balance).toFixed(6), logo: assetUrl("token-inri.png"), subtitle: tr(lang, "native_coin") },
      ...TOKENS.map((t) => ({ symbol: t.symbol, amount: tokenBalances[t.symbol] ?? "0.0", logo: t.logo || getAssetLogo(t.symbol, customTokens), subtitle: shortAddr(t.address) })),
    ],
    [balance, TOKENS, tokenBalances, lang, customTokens],
  );

  const tokenOptions = useMemo(
    () => [
      { value: "INRI", label: "INRI" },
      ...TOKENS.map((t) => ({ value: t.symbol, label: t.symbol })),
    ],
    [TOKENS],
  );

  return (
    <>
      <style>{`
        :root{--bg:#0b0b0f;--panel:#111319;--panel2:#171922;--panel3:#1e212b;--line:#2a2e3a;--text:#ffffff;--muted:#a6adbb;--accent:#4e8cff;--accent2:#2a5cd4;--green:#14c784;--danger:#ff5a6b;--shadow:0 12px 30px rgba(0,0,0,.35)}
        *{box-sizing:border-box} html,body,#root{height:100%} body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:linear-gradient(180deg,#0b0b0f 0%, #0a0f1a 100%);color:var(--text)}
        .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace}.muted{color:var(--muted)}.muted2{color:var(--muted);opacity:.82}.smallTop{margin-top:10px}
        .appShell{min-height:100vh;display:grid;grid-template-columns:230px 1fr}.sidebar{border-right:1px solid var(--line);background:var(--panel);padding:16px 12px}.sideTop{display:flex;gap:10px;align-items:center;padding:8px 10px 16px;border-bottom:1px solid var(--line)}
        .brandLogo{width:36px;height:36px;object-fit:contain;display:block}.brandTxt b{display:block;font-size:14px;font-weight:800}.brandTxt span{display:block;font-size:12px;color:var(--muted);margin-top:2px}.sideNav{margin-top:14px;display:grid;gap:8px}
        .navItem{display:flex;align-items:center;gap:10px;width:100%;padding:12px;border:1px solid transparent;background:transparent;color:var(--text);cursor:pointer;border-radius:14px;text-align:left}.navItem:hover{background:var(--panel2);border-color:var(--line)}.navItemActive{background:#1b2741;border-color:#355ea8}.navLabel{font-size:14px;font-weight:700}
        .main{padding:16px 16px 90px}.mainHeader{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:var(--shadow)}.hTitle b{font-size:18px;font-weight:800}.hTitle span{display:block;margin-top:4px;font-size:12px}.headerActions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .badgeOk,.badgeBad{padding:7px 12px;border-radius:999px;font-size:12px;font-weight:800;border:1px solid}.badgeOk{color:#8cf0c3;border-color:rgba(20,199,132,.45);background:rgba(20,199,132,.1)}.badgeBad{color:#ffc0c7;border-color:rgba(255,90,107,.45);background:rgba(255,90,107,.1)}
        .content{margin-top:14px}.card{border:1px solid var(--line);border-radius:20px;background:var(--panel);padding:16px;box-shadow:var(--shadow)}.cardFlat{border:1px solid var(--line);border-radius:18px;background:var(--panel2);padding:16px}.sectionTitle{font-size:18px;font-weight:800;margin-bottom:8px}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.label{display:block;font-size:12px;color:var(--muted);margin-bottom:6px;margin-top:10px}.input,.textarea,.select{width:100%;border:1px solid var(--line);border-radius:14px;background:#0d0f14;color:var(--text);padding:12px 14px;outline:none;font-size:14px}.textarea{min-height:92px;resize:vertical}
        .btn{border:1px solid var(--line);background:var(--panel3);color:var(--text);border-radius:14px;padding:10px 14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px}.btn:hover{filter:brightness(1.06)}.btnPrimary{background:linear-gradient(180deg,var(--accent),var(--accent2));border-color:#4d7ef2}.btnGhost{background:transparent;border-color:transparent}.iconBtn{padding:8px}
        .bigNumber{font-size:32px;font-weight:900;margin-top:6px}.quickActions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}.qBtn{border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:16px;min-height:62px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700}.qBtn:hover{background:var(--panel3)}
        .receiveWrap{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}.qrBox{border:1px solid var(--line);border-radius:18px;background:#fff;padding:12px}.receiveRight{flex:1;min-width:240px}.addrBig{font-size:18px;font-weight:800;margin-top:6px}.addrFull{margin-top:8px;font-size:12px;word-break:break-all}
        .tokenList{margin-top:12px;display:grid;gap:0}.tokenRow{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06);gap:12px}.tokenLeft{display:flex;align-items:center;gap:10px;min-width:0}.tokenLogo{width:34px;height:34px;border-radius:50%;overflow:hidden;background:#111;display:flex;align-items:center;justify-content:center;flex:0 0 auto}.tokenLogo img{width:100%;height:100%;object-fit:cover;display:block}.tokenFallback{width:100%;height:100%;background:#222}.tokenSym{font-weight:700;font-size:14px}.tokenAddr{font-size:12px;overflow:hidden;text-overflow:ellipsis}.tokenBal{font-weight:700;font-size:14px;white-space:nowrap}.tokenRightActions{display:flex;align-items:center;gap:8px}
        .assetGrid{display:grid;gap:10px;margin-top:12px}.assetMiniCard{border:1px solid var(--line);border-radius:16px;background:var(--panel2);padding:12px;display:flex;justify-content:space-between;align-items:center;gap:10px}.feeBox{margin-top:12px;border:1px solid var(--line);border-radius:16px;background:var(--panel2);padding:12px}.settingsGrid{display:grid;gap:12px}.labelRow{display:flex;justify-content:space-between;align-items:center;gap:10px}.avatarRow{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.avatarBig{width:44px;height:44px;border-radius:50%;overflow:hidden;background:#1c1c1c;display:flex;align-items:center;justify-content:center;border:1px solid var(--line)}.avatarBig img{width:100%;height:100%;object-fit:cover}
        .bottomNav{position:fixed;left:0;right:0;bottom:0;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(10,10,14,.94);border-top:1px solid var(--line);display:none;z-index:40}.bottomInner{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.bBtn{height:48px;border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:14px;display:flex;align-items:center;justify-content:center;cursor:pointer}.bBtnActive{background:#1b2741;border-color:#355ea8}
        .toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#111827;color:#fff;border:1px solid #334155;border-radius:14px;padding:10px 14px;font-weight:700;z-index:60;box-shadow:var(--shadow)}.modalBackdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;z-index:70}.modal{width:min(560px,100%);border:1px solid var(--line);border-radius:18px;background:var(--panel);padding:16px;box-shadow:var(--shadow)}.rowBetween{display:flex;justify-content:space-between;align-items:center;gap:10px}.qrVideo{width:100%;height:320px;object-fit:cover;margin-top:12px;border-radius:14px;background:#000;border:1px solid var(--line)}
        .assetChooser{border:1px solid var(--line);border-radius:16px;background:var(--panel2);padding:12px;margin-top:8px}.assetChooserTop{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.assetChooserTopStack{display:flex;flex-direction:column;align-items:flex-start;gap:8px}.swapAssetPreview{display:flex;align-items:center;gap:8px;color:var(--text);font-weight:700}.swapMiniLogo{width:32px;height:32px}.assetBalance{font-size:12px;color:var(--muted)}.assetBalanceUnder{padding-left:0;line-height:1.2}
        .mobileOnly{display:none}.mobileTopBar{display:none}.mobileChainCard{display:none}.mobileTopLeft{display:flex;align-items:center;gap:10px}.mobileAvatarWrap{width:42px;height:42px;border-radius:14px;overflow:hidden;border:1px solid var(--line);background:var(--panel2);display:flex;align-items:center;justify-content:center}.mobileAvatar{width:100%;height:100%;object-fit:cover}.mobileTopTitle{font-weight:800}.mobileTopSub{font-size:12px;color:var(--muted)}.mobileCopyBtn{padding:8px 10px}.customTokenList{margin-top:14px;display:grid;gap:10px}.customTokenRow{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)}
        @media (max-width: 720px){.sidebar{display:none}.appShell{grid-template-columns:1fr}.grid2{grid-template-columns:1fr}.quickActions{grid-template-columns:repeat(2,minmax(0,1fr))}.main{padding-bottom:90px}.bottomNav{display:block}.desktopOnly{display:none}.mobileOnly{display:block}.mobileTopBar{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border:1px solid var(--line);border-radius:18px;background:var(--panel);box-shadow:var(--shadow)}.mobileChainCard{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding:12px 14px;border:1px solid var(--line);border-radius:18px;background:var(--panel2)} }
      `}</style>

      <div className="appShell">
        <aside className="sidebar">
          <div className="sideTop">
            <img className="brandLogo" src={assetUrl("favicon.png")} alt="INRI" />
            <div className="brandTxt">
              <b>{tr(lang, "app_name")}</b>
              <span>{tr(lang, "official_pwa")}</span>
            </div>
          </div>
          <div className="sideNav">
            <NavItem active={tab === "dashboard"} icon={<Home size={18} />} label={tr(lang, "dashboard")} onClick={() => setTab("dashboard")} />
            <NavItem active={tab === "send"} icon={<Send size={18} />} label={tr(lang, "send")} onClick={() => setTab("send")} />
            <NavItem active={tab === "receive"} icon={<QrCode size={18} />} label={tr(lang, "receive")} onClick={() => setTab("receive")} />
            <NavItem active={tab === "tokens"} icon={<Coins size={18} />} label={tr(lang, "tokens")} onClick={() => setTab("tokens")} />
            <NavItem active={tab === "settings"} icon={<Settings size={18} />} label={tr(lang, "settings")} onClick={() => setTab("settings")} />
          </div>
        </aside>

        <main className="main">
          <Header lang={lang} tab={tab} view={view} selectedAddress={selected} avatar={avatar} networkOk={networkOk} chainId={chainId} onLock={lock} onReset={resetLocal} onCopy={copy} />

          <div className="content" dir={lang === "ar" ? "rtl" : "ltr"}>
            {view !== "wallet" && (
              <div className="cardFlat" style={{ marginBottom: 12 }}>
                <label className="label">
                  <input type="checkbox" checked={keepSession} onChange={(e) => setKeepSession(e.target.checked)} style={{ marginRight: 8 }} />
                  {tr(lang, "keep_session")}
                </label>
                <div className="muted2" style={{ fontSize: 12, marginTop: 6 }}>{tr(lang, "seed_encrypted_device")}</div>
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
                      <button className="btn" onClick={generateSeed}>{tr(lang, "generate")}</button>
                      <button className="btn btnPrimary" onClick={createWallet}>{tr(lang, "secure_enter")}</button>
                    </div>
                    <div className="muted smallTop">{tr(lang, "backup_seed_offline")}</div>
                  </div>

                  <div className="cardFlat">
                    <div className="sectionTitle">{tr(lang, "import")}</div>
                    <label className="label">{tr(lang, "seed_import")}</label>
                    <textarea className="textarea" value={importMnemonic} onChange={(e) => setImportMnemonic(e.target.value)} placeholder="paste 12/24 words..." />
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
                      <button className="btn btnPrimary" onClick={importWallet}>{tr(lang, "secure_enter")}</button>
                    </div>
                    <div className="muted smallTop">{tr(lang, "local_encrypted_seed")}</div>
                  </div>
                </div>
              </div>
            )}

            {view === "unlock" && (
              <div className="card">
                <div className="sectionTitle">{tr(lang, "unlock")}</div>
                <label className="label">{tr(lang, "password")}</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input className="input" type="password" value={unlockPw} onChange={(e) => setUnlockPw(e.target.value)} placeholder="password..." />
                  <button className="btn btnPrimary" onClick={unlock}>{tr(lang, "unlock")}</button>
                </div>
                <div className="muted smallTop">{tr(lang, "seed_encrypted_device")}</div>
              </div>
            )}

            {view === "wallet" && tab === "dashboard" && <DashboardScreen lang={lang} balance={balance} assets={totalAssets} onTab={setTab} onRefreshTokens={refreshTokens} />}
            {view === "wallet" && tab === "send" && (
              <SendScreen lang={lang} sendTo={sendTo} sendAmount={sendAmount} sendAsset={sendAsset} customTokens={customTokens} tokenOptions={tokenOptions} estimatedGasFee={estimatedGasFee} sending={sending} getBalanceForAsset={getBalanceForAsset} setSendTo={setSendTo} setSendAmount={setSendAmount} setSendAsset={setSendAsset} onScan={startScan} onUseMyAddress={() => setSendTo(selected)} onSend={sendNow} />
            )}
            {view === "wallet" && tab === "receive" && <ReceiveScreen lang={lang} selected={selected} onCopy={copy} onOpenExplorer={() => openExplorerAddress(selected)} />}
            {view === "wallet" && tab === "tokens" && <TokensScreen lang={lang} balance={balance} tokens={TOKENS} tokenBalances={tokenBalances} onRefresh={refreshTokens} onGoSettings={() => setTab("settings")} onRemoveCustomToken={removeCustomToken} />}
            {view === "wallet" && tab === "settings" && (
              <SettingsScreen lang={lang} setLang={setLang} avatar={avatar} onAvatarFile={onAvatarFile} onRemoveAvatar={removeAvatar} keepSession={keepSession} setKeepSession={setKeepSession} tokSymbol={tokSymbol} setTokSymbol={setTokSymbol} tokDec={tokDec} setTokDec={setTokDec} tokAddr={tokAddr} setTokAddr={setTokAddr} tokLogo={tokLogo} setTokLogo={setTokLogo} onAddCustomToken={addCustomToken} customTokens={customTokens} onRemoveCustomToken={removeCustomToken} onLock={lock} onReset={resetLocal} />
            )}
          </div>
        </main>
      </div>

      {view === "wallet" && <BottomNav tab={tab} lang={lang} onChange={setTab} />}

      {scanOpen && (
        <div className="modalBackdrop" onClick={stopScan}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="rowBetween">
              <div className="sectionTitle">{tr(lang, "scan_qr")}</div>
              <button className="btn btnGhost" onClick={stopScan}>X</button>
            </div>
            <video id="qrVideo" className="qrVideo" />
            <div className="muted smallTop">{tr(lang, "scanner_hint")}</div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
