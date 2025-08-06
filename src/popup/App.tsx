import { useSettings } from "./useSetting";
import TokenCard from "./TokenPage";
import PassphraseCard from "./PassphrasePage";
import Dashboard from "./Dashboard";
import './App.css';

export default function App() {
  const [settings, ready] = useSettings();
  
  if (!ready) return null;
  if (!settings.githubToken)  return <TokenCard />;
  if (!settings.passphrase)   return <PassphraseCard />;
  return <Dashboard settings={settings} />;
}
