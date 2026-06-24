import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useGoogleLogin } from "@react-oauth/google";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Auth() {
  const container = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(searchParams.get("error") ? getErrorMessage(searchParams.get("error")) : "");

  useGSAP(
    () => {
      gsap.fromTo(
        ".auth-element",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out", clearProps: "all" },
      );
    },
    { scope: container },
  );

  function getErrorMessage(code) {
    const map = {
      google_failed: "Google sign-in failed. Please try again.",
      github_failed: "GitHub sign-in failed. Please try again.",
      google_no_code: "Google sign-in was cancelled.",
      github_no_code: "GitHub sign-in was cancelled.",
      auth_failed: "Authentication failed. Please try again.",
    };
    return map[code] || "Something went wrong. Please try again.";
  }

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
      const payload = mode === "register"
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };

      const { data } = await api.post(endpoint, payload);
      setUser(data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    flow: "implicit",
    onSuccess: async ({ access_token }) => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.post("/auth/google", { accessToken: access_token });
        setUser(data.user);
        navigate("/dashboard");
      } catch (err) {
        setError(err?.response?.data?.message || "Google sign-in failed.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError("Google sign-in was cancelled or failed.");
    },
  });

  const inputStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    outline: "none",
    color: "white",
    width: "100%",
    padding: "10px 14px",
    fontFamily: "monospace",
    fontSize: "12px",
    letterSpacing: "0.04em",
    transition: "border-color 0.2s",
  };

  const dividerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "4px 0",
  };

  return (
    <div
      ref={container}
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden selection:bg-white/30"
      style={{ background: "#050508" }}
    >
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-[150vh] bg-gradient-to-b from-[#1a1a24] via-[#0a0a0c] to-black animate-gradient pointer-events-none" />
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute top-40 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-blob animation-delay-4000" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Back */}
      <Link
        to="/"
        className="auth-element absolute top-8 left-8 text-white/50 hover:text-white transition-colors flex items-center gap-2 font-mono text-xs uppercase tracking-widest group z-10"
      >
        <span className="group-hover:-translate-x-1 transition-transform">←</span> Back
      </Link>

      {/* Card */}
      <div className="w-full max-w-md relative z-10 auth-element">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-pink-500/10 blur-3xl -z-10 rounded-[3rem]" />

        <div
          className="relative overflow-hidden p-8"
          style={{ background: "rgba(10,10,14,0.90)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.10)" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {/* Header */}
          <div className="mb-6 text-center">
            <div className="inline-block border border-white/20 px-4 py-1 text-[10px] font-mono tracking-widest text-white/60 uppercase mb-4">
              AI-Powered Repository Intelligence
            </div>
            <h2 className="text-2xl font-mono font-bold tracking-tight text-white mb-1">
              {mode === "login" ? "WELCOME BACK" : "CREATE ACCOUNT"}
            </h2>
            <p className="text-xs font-mono text-white/40 uppercase tracking-widest">
              {mode === "login" ? "Sign in to continue" : "Start exploring your repos"}
            </p>
          </div>

          {/* Mode Toggle */}
          <div
            className="flex mb-6"
            style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
          >
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className="flex-1 py-2 text-[10px] font-mono uppercase tracking-widest transition-all"
                style={{
                  background: mode === m ? "rgba(255,255,255,0.08)" : "transparent",
                  color: mode === m ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                  borderRight: m === "login" ? "1px solid rgba(255,255,255,0.08)" : "none",
                }}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-4 px-3 py-2 text-[11px] font-mono text-red-400"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              {error}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3 mb-4">
            {mode === "register" && (
              <div>
                <label className="block text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1.5">Full Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Jane Doe"
                  required
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.3)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.10)")}
                />
              </div>
            )}
            <div>
              <label className="block text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.3)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.10)")}
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1.5">Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                minLength={6}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.3)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.10)")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-[11px] font-mono font-bold tracking-widest uppercase transition-all hover:scale-[1.01] disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.9)", color: "#050508" }}
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div style={dividerStyle}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
            <span className="text-[9px] font-mono text-white/25 uppercase tracking-widest">or continue with</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mt-4">
            {/* Google */}
            <button
              onClick={() => handleGoogleLogin()}
              className="w-full flex items-center justify-center gap-3 py-3 text-[11px] font-mono font-bold tracking-widest uppercase transition-all hover:scale-[1.01]"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
            >
              {/* Google Icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/>
                <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/>
                <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"/>
                <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z"/>
              </svg>
              Continue with Google
            </button>

            {/* GitHub */}
            <button
              onClick={() => { window.location.href = `${API_URL}/auth/github`; }}
              className="w-full flex items-center justify-center gap-3 py-3 text-[11px] font-mono font-bold tracking-widest uppercase transition-all hover:scale-[1.01]"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-white">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
