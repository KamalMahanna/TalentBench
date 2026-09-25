"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, company }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Signup failed.");
        setLoading(false);
        return;
      }

      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch {
      toast.error("Network error during registration.");
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "12px",
    background: "var(--surface)",
    border: "1px solid var(--outline)",
    padding: "11px 14px",
    fontSize: "14px",
    color: "var(--ink)",
    fontFamily: "DM Sans, system-ui, sans-serif",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--muted)",
    marginBottom: "6px",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--canvas)",
        padding: "48px 16px",
      }}
    >
      {/* Back link */}
      <Link
        href="/"
        style={{
          position: "fixed",
          top: "24px",
          left: "24px",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "13px",
          color: "var(--muted)",
          textDecoration: "none",
          fontWeight: 500,
          zIndex: 10,
        }}
      >
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "var(--surface-high)",
          border: "1px solid var(--outline)",
          borderRadius: "28px",
          padding: "40px",
          boxShadow: "0 22px 55px rgba(60,48,83,0.1)",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <Image
              src="/logo.png"
              alt="TalentBench Logo"
              width={52}
              height={52}
              className="w-13 h-13 object-contain"
              priority
            />
          </div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: "var(--ink)",
              margin: "0 0 6px",
            }}
          >
            Create your account
          </h1>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
            Set up your recruitment workspace in minutes
          </p>
        </div>

        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Hayes"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Corporate Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jordan@company.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Company / Organization</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Vanguard Dynamics"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              style={inputStyle}
            />
          </div>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            className="md-button md-button--filled"
            style={{ width: "100%", justifyContent: "center", marginTop: "4px" }}
          >
            {loading ? "Creating Account…" : "Create Account"}
          </motion.button>
        </form>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "24px",
            borderTop: "1px solid var(--outline)",
            textAlign: "center",
            fontSize: "13px",
            color: "var(--muted)",
          }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}
          >
            Sign In
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
