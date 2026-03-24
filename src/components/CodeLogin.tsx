import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LOGIN_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap');

.login-container {
  min-height: 100dvh;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: #141210;
  padding: 24px;
  font-family: 'Cormorant Garamond', serif;
}
.login-card {
  width: 100%; max-width: 380px;
  background: rgba(255,255,255,.025);
  border: 1px solid rgba(200,180,140,.1);
  border-radius: 20px;
  padding: 40px 28px;
  text-align: center;
}
.login-icon {
  font-size: 40px;
  margin-bottom: 16px;
}
.login-title {
  font-family: 'Cinzel', serif;
  font-size: 20px;
  color: #c9a84c;
  letter-spacing: 2px;
  margin-bottom: 6px;
}
.login-subtitle {
  font-size: 14px;
  color: #7a6a58;
  margin-bottom: 28px;
  font-style: italic;
}
.login-input {
  width: 100%;
  padding: 14px 18px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(200,180,140,.15);
  border-radius: 12px;
  color: #e8d8b8;
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  text-align: center;
  letter-spacing: 4px;
  outline: none;
  transition: border-color .2s;
  box-sizing: border-box;
}
.login-input:focus {
  border-color: #c9a84c;
}
.login-input::placeholder {
  color: #5a4a38;
  font-style: italic;
  letter-spacing: 1px;
  font-size: 16px;
}
.login-btn {
  width: 100%;
  margin-top: 16px;
  padding: 14px;
  background: rgba(201,168,76,.12);
  border: 1px solid rgba(201,168,76,.3);
  border-radius: 12px;
  color: #c9a84c;
  font-family: 'Cinzel', serif;
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all .2s;
}
.login-btn:hover { background: rgba(201,168,76,.2); }
.login-btn:active { transform: scale(.98); }
.login-btn:disabled { opacity: .5; cursor: default; }
.login-error {
  color: #c26b5a;
  font-size: 13px;
  margin-top: 12px;
}
.login-hint {
  font-size: 12px;
  color: #5a4a38;
  margin-top: 20px;
  line-height: 1.6;
}
`;

interface CodeLoginProps {
  onLogin: (userCodeId: string, code: string) => void;
}

export default function CodeLogin({ onLogin }: CodeLoginProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const trimmed = code.trim();
    if (!trimmed || trimmed.length < 3) {
      setError("O código deve ter pelo menos 3 caracteres");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Check if code exists
      const { data: existing, error: fetchError } = await (supabase as any)
        .from("access_codes")
        .select("id")
        .eq("code", trimmed)
        .maybeSingle();

      if (fetchError) {
        setError("Erro ao verificar código. Tente novamente.");
        setLoading(false);
        return;
      }

      if (existing) {
        // Code exists — log in
        onLogin(existing.id, trimmed);
      } else {
        // Create new code
        const { data: newCode, error: insertError } = await (supabase as any)
          .from("access_codes")
          .insert({ code: trimmed })
          .select("id")
          .maybeSingle();

        if (insertError) {
          if (insertError.message?.includes("unique")) {
            setError("Código já existe. Tente novamente.");
          } else {
            setError("Erro ao criar código. Tente novamente.");
          }
          setLoading(false);
          return;
        }

        onLogin(newCode.id, trimmed);
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet.");
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <style>{LOGIN_CSS}</style>
      <div className="login-card">
        <div className="login-icon">📖</div>
        <div className="login-title">LEITURA BÍBLICA</div>
        <div className="login-subtitle">Digite seu código de acesso</div>
        <input
          className="login-input"
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="Seu código"
          maxLength={30}
          autoFocus
        />
        <button
          className="login-btn"
          onClick={handleSubmit}
          disabled={loading || !code.trim()}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
        {error && <div className="login-error">{error}</div>}
        <div className="login-hint">
          Primeira vez? Escolha um código pessoal.<br />
          Já tem um código? Digite-o para acessar suas anotações.
        </div>
      </div>
    </div>
  );
}
