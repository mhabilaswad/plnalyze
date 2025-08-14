// src/components/LLMChat.tsx
"use client";
import React, { useState } from "react";

interface ParsedOutput {
  think: string | null;
  main: string;
}

// Fungsi untuk memisahkan <think> dan sisanya
function parseThinkAndMain(raw: string): ParsedOutput {
  const thinkMatch = raw.match(/<think>([\s\S]*?)<\/think>/i);
  let thinkPart = thinkMatch ? thinkMatch[1].trim() : null;
  let mainPart = raw;

  if (thinkMatch) {
    mainPart = raw.replace(thinkMatch[0], "").trim();
  }

  return {
    think: thinkPart,
    main: mainPart.trim(),
  };
}

export default function LLMChat() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<ParsedOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setReply(null);
    setElapsedMs(null);

    if (!prompt.trim()) {
      setError("Masukkan prompt terlebih dahulu");
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      const res = await fetch("http://localhost:8000/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `Kamu adalah Model AI yang bertugas melakukan evaluasi bulanan ICON (Unit Layanan PLN) berdasarkan data gangguan berikut.

INSTRUKSI PENTING (BACA DENGAN SANGAT TELITI):
- Jawaban HARUS **hanya** berisi **dua bagian** persis dalam urutan berikut:
  1) Rangkuman: (minimal 4 kalimat, jelaskan pola/tren dari DATA)
  2) Evaluasi: (minimal 4 kalimat, analisis mendalam berbasis DATA)
- Dilarang memberi rekomendasi umum tanpa merujuk DATA.
- Format tepat: 
Rangkuman:
[paragraf]

Evaluasi:
[paragraf]
- Jika tidak dapat mematuhi semua aturan, keluarkan INVALID_OUTPUT.`,
            },
            {
              role: "user",
              content: `DATA:\n\`\`\`\n${prompt}\n\`\`\``,
            },
          ],
          temperature: 0.4,
          top_p: 0.9,
          top_k: 40,
          repeat_penalty: 1.15,

          max_tokens: -1, // dinaikkan supaya tidak terpotong
          stream: false,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setError(err?.detail || `Server error: ${res.status}`);
      } else {
        const data = await res.json();
        const raw = data?.choices?.[0]?.message?.content || "";
        setReply(parseThinkAndMain(raw));
        setElapsedMs(Date.now() - startTime);
      }
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-2">Chat with DeepSeek (llama.cpp)</h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Tempelkan data gangguan PLN di sini..."
          className="w-full border rounded p-2 min-h-[90px] focus:outline-none focus:ring"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          >
            {loading ? "Menjalankan..." : "Kirim"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPrompt("");
              setReply(null);
              setError(null);
              setElapsedMs(null);
            }}
            className="px-3 py-2 border rounded"
          >
            Clear
          </button>
        </div>
      </form>

      <div className="mt-4">
        {error && <div className="text-red-600">Error: {error}</div>}

        {reply && (
          <div className="mt-2 p-3 bg-gray-50 border rounded whitespace-pre-wrap">
            <strong>Model:</strong>
            {reply.think && (
              <div className="mt-2 text-sm italic opacity-50 border-b pb-2">
                {reply.think}
              </div>
            )}
            <div className="mt-2">{reply.main}</div>
          </div>
        )}

        {elapsedMs !== null && (
          <div className="mt-3 p-3 border rounded bg-white">
            <div className="text-sm text-gray-600">
              Elapsed: {elapsedMs} ms
            </div>
          </div>
        )}
      </div>
    </div>
  );
}