import { useState, useEffect, useRef } from "react";

/**
 * Ick vs. Red Flag Meter — In Her Era™
 *
 * SETUP NOTES FOR DEPLOYMENT:
 * 1. This component calls API_ENDPOINT below instead of api.anthropic.com directly.
 *    Point API_ENDPOINT at your Cloudflare Worker / AI Gateway proxy (the same pattern
 *    used for the relationship quiz app deployment) so your API key never ships to the browser.
 * 2. The worker should accept { system, messages } and return Anthropic's raw response JSON.
 * 3. Tailwind utility classes are used throughout — make sure Tailwind is configured in the
 *    host project (works out of the box with Vite/CRA + Tailwind, or Next.js + Tailwind).
 */

const API_ENDPOINT = "/api/analyze"; // <-- replace with your Worker/proxy URL

const QUESTIONS = [
  {
    id: "duration",
    label: "How long have you been talking to or seeing this person?",
    type: "select",
    options: ["Less than 2 weeks", "2–4 weeks", "1–3 months", "3–6 months", "6+ months"],
  },
  {
    id: "established",
    label: "Is there an established relationship? (Defined, exclusive, or committed)",
    type: "yesno",
  },
  {
    id: "situation",
    label: "Tell me what's going on. What happened? How did it make you feel? What is he doing — or not doing?",
    type: "textarea",
    placeholder: "Example: He texts me every day but hasn't made plans in 3 weeks. When I bring it up he says he's busy but then I see him posting on Instagram...",
  },
  {
    id: "bodyFeel",
    label: "When you're WITH him, how does your body feel most of the time?",
    type: "select",
    options: [
      "Calm and at ease — I can breathe",
      "Excited but a little anxious — like I'm on edge",
      "Tense and waiting — like something is about to go wrong",
      "Flat or numb — like I've shut down",
      "A mix — good moments and really confusing ones",
    ],
  },
  {
    id: "awaySense",
    label: "When you're AWAY from him, which feels most true?",
    type: "select",
    options: [
      "I feel mostly okay — secure in where things stand",
      "I obsess, check my phone, replay everything",
      "I feel relief — like I can finally relax",
      "I feel a low hum of dread or anxiety",
      "I feel nothing much — kind of indifferent",
    ],
  },
  {
    id: "intuition",
    label: "What does your gut say — separate from the story you keep telling yourself?",
    type: "select",
    options: [
      "Something feels genuinely off about him",
      "He seems like a good person but something feels wrong in me",
      "I honestly can't tell — that's why I'm here",
      "I think I'm getting in my own way",
      "I'm scared he's too good and I'll push him away",
    ],
  },
];

const systemPrompt = `You are a warm, grounded nervous system and relationship expert inside a women's healing course called "How to Stop Falling for Emotionally Unavailable Men in 21 Days" by In Her Era™.

Your ONLY job is to analyze the woman's situation and return a JSON object. No prose. No preamble. Only valid JSON.

CRITICAL LANGUAGE RULES — READ THESE FIRST:
- Write like a wise, warm friend who happens to know the science. Short sentences. Plain everyday words.
- Her thinking brain may be partially offline right now. She is likely emotional or overwhelmed. Write for that state.
- DO NOT use the words "narcissist," "narcissistic," or "NPD" UNLESS the score is 81-100 AND you see unmistakable patterns of manipulation, abuse, or control. Use plain language instead: "hot and cold behavior," "he pulls away when you get close," "he makes you feel like you're the problem," "just enough to keep you hooked."
- DO NOT use clinical or academic language in the result sections. Instead of "HPA axis dysregulation" say "your body got used to the stress." Instead of "intermittent reinforcement" say "the hot and cold pattern is addictive — like a slot machine." Instead of "reward prediction error" say "your brain lights up MORE when the reward is unpredictable." Keep it human.
- Citations go ONLY in the footer JSON field. Never in whatsHappening, whatYourBodyIsTellingYou, intuitionNote, specificPatterns, nextStep, or affirmation.
- Every section: 2-3 SHORT sentences maximum. If you can say it in one sentence, do.

SCIENCE FRAMEWORK — use this to INFORM your analysis. Do NOT quote it directly:

THE ICK: Her body got used to love feeling like anxiety. When a man is actually calm and available, her nervous system reads it as "nothing is happening here." That flat or "boring" feeling is her body missing the stress it got addicted to — not a sign he's wrong for her. Healing often feels like nothing at first. Science: Schultz et al. 1997, Skinner 1938, van der Kolk 2014.

RED FLAG: His BEHAVIOR is the problem — not just her reaction to it. Look for: love bombing then going cold, making promises that never happen, just enough contact to keep her attached but never enough to actually build something, turning it around on her when she brings up a concern, making her question her own perception, her feeling MORE anxious the longer they're together not less, her needing to shrink herself to keep the peace.

SAFETY FLAG — this is non-negotiable: If her description includes ANY of the following — physical intimidation, threats, fear of his reactions, being isolated from people she loves, being pressured or forced sexually, physical violence, feeling afraid — set showSafetyResources to true immediately. Do not soften this or explain it away.

THE ICK SIGNALS (healing — not a him problem):
- He's consistent and kind and that feels "too easy" or "boring"
- Nothing specific is wrong — she just doesn't "feel it"
- Her body feels calm WITH him but her mind says no spark
- She feels relief when she's away from him (this is actually healthy — her system is relaxing)
- They haven't been talking long — her nervous system doesn't have enough real data yet
- She's never been with someone emotionally available before

METER SCORING:
- 0-25: Very likely the ick. This is what healing feels like. verdictColor = healing
- 26-45: Probably the ick. More time and data needed. verdictColor = healing
- 46-65: Mixed. Some real concerns AND healing happening. verdictColor = mixed
- 66-80: Leaning red flag. His behavior deserves attention. verdictColor = warning
- 81-100: Strong red flag pattern. Trust your gut. verdictColor = danger

Return ONLY this exact JSON — no extra text, no markdown:
{
  "score": <number 0-100>,
  "verdict": "<one of: 'Very Likely The Ick', 'Probably The Ick', 'Mixed Signals', 'Leaning Red Flag', 'Strong Red Flag Pattern'>",
  "verdictColor": "<one of: 'healing', 'healing', 'mixed', 'warning', 'danger'>",
  "headline": "<one warm, clear sentence — the single most important thing she needs to hear right now>",
  "whatsHappening": "<2-3 SHORT plain-language sentences. What is actually going on here — in simple human words. No clinical terms.>",
  "whatYourBodyIsTellingYou": "<2-3 SHORT sentences about what her body signals actually mean. Grounding and simple.>",
  "intuitionNote": "<1-2 sentences that honour her gut. Help her tell the difference between old patterns speaking and real present-moment knowing.>",
  "specificPatterns": ["<plain language pattern from her specific situation>", "<pattern 2>", "<pattern 3 if there is one>"],
  "nextStep": "<one simple, doable action using course tools — rage journal, body check-in, breath work, meditation. One thing only.>",
  "affirmation": "<one short warm closing sentence. Grounding. True. Kind.>",
  "showSafetyResources": <true or false>,
  "citationsFooter": "Attachment science (Bowlby, 1969) · Nervous system research (Porges, 2011) · Somatic trauma research (van der Kolk, 2014; Levine, 2010) · Reward and conditioning science (Schultz et al., 1997; Skinner, 1938) · Stress physiology (McEwen & Stellar, 1993) · Relationship abuse research (Dutton & Goodman, 2005)"
}`;

const verdictConfig = {
  healing: { bg: "bg-emerald-50", border: "border-emerald-200", meter: "#10b981" },
  mixed:   { bg: "bg-amber-50",   border: "border-amber-200",   meter: "#f59e0b" },
  warning: { bg: "bg-orange-50",  border: "border-orange-200",  meter: "#f97316" },
  danger:  { bg: "bg-red-50",     border: "border-red-200",     meter: "#ef4444" },
};

const HOTLINES = [
  { label: "National Domestic Violence Hotline", contact: "1-800-799-7233", sub: "Call or text 24/7 · thehotline.org", url: "https://www.thehotline.org" },
  { label: "RAINN — Sexual Assault Support",     contact: "1-800-656-4673", sub: "Call or chat 24/7 · rainn.org",       url: "https://www.rainn.org" },
  { label: "Crisis Text Line",                   contact: "Text HOME to 741741", sub: "Free & confidential 24/7",        url: "https://www.crisistextline.org" },
  { label: "loveisrespect",                      contact: "1-866-331-9474", sub: "Call, text, or chat · loveisrespect.org", url: "https://www.loveisrespect.org" },
];

function SafetyBanner() {
  return (
    <div className="rounded-2xl overflow-hidden border-2 border-red-300">
      <div className="px-5 py-3" style={{ background: "#dc2626" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.05em" }}>
          🛡️ YOU ARE NOT ALONE — PLEASE READ THIS
        </div>
      </div>
      <div className="px-5 py-5 space-y-4" style={{ background: "#fff5f5" }}>
        <div style={{ fontSize: 15, color: "#7f1d1d", lineHeight: 1.8 }}>
          What you've described sounds like more than a relationship problem. Your safety comes first — before anything else. You deserve support from people who are trained to help.
        </div>
        <div className="space-y-3">
          {HOTLINES.map((r) => (
            <div key={r.label} className="bg-white rounded-xl p-4 border border-red-100">
              <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{r.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1c1917", marginTop: 2 }}>{r.contact}</div>
              <div style={{ fontSize: 12, color: "#78716c", marginTop: 2 }}>{r.sub}</div>
              <a href={r.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: "#dc2626", textDecoration: "underline", marginTop: 4, display: "block" }}>
                {r.url}
              </a>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: "#7f1d1d", fontStyle: "italic", lineHeight: 1.6 }}>
          If you are in immediate danger, please call 911. Reaching out for help is courage, not weakness. 🩷
        </div>
      </div>
    </div>
  );
}

function SafetyAccordion() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-stone-200 overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-stone-50 hover:bg-stone-100 transition-all">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 15 }}>🛡️</span>
          <div style={{ fontSize: 13, color: "#44403c", fontWeight: 600 }}>Safety & Support Resources</div>
        </div>
        <div style={{ fontSize: 12, color: "#78716c" }}>{open ? "Close ↑" : "Always here for you ↓"}</div>
      </button>
      {open && (
        <div className="px-5 py-4 space-y-3 bg-white">
          <div style={{ fontSize: 13, color: "#78716c", lineHeight: 1.6 }}>
            These resources are always free and confidential — wherever you are in your journey.
          </div>
          {HOTLINES.map((r) => (
            <div key={r.label} className="flex items-start gap-3">
              <div style={{ color: "#7c3aed", marginTop: 3, fontSize: 10, flexShrink: 0 }}>✦</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1c1917" }}>{r.label}</div>
                <div style={{ fontSize: 12, color: "#78716c" }}>{r.contact} · {r.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MeterArc({ score, color }) {
  const r = 80, sw = 10, nr = r - sw / 2;
  const circ = Math.PI * nr;
  const pct = Math.max(0, Math.min(score, 100));
  const offset = circ - (pct / 100) * circ;
  const arc = `M ${sw/2+10} 100 A ${nr} ${nr} 0 0 1 ${200-sw/2-10} 100`;
  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="110" viewBox="0 0 200 110">
        <path d={arc} fill="none" stroke="#e5e7eb" strokeWidth={sw} strokeLinecap="round"/>
        <path d={arc} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.34,1.56,0.64,1)" }}/>
        <text x="18"  y="108" fontSize="9" fill="#9ca3af" fontFamily="serif">The Ick</text>
        <text x="142" y="108" fontSize="9" fill="#9ca3af" fontFamily="serif">Red Flag</text>
        <text x="100" y="75"  textAnchor="middle" fontSize="32" fontWeight="700" fill={color} fontFamily="serif">{pct}</text>
        <text x="100" y="90"  textAnchor="middle" fontSize="10" fill="#9ca3af" fontFamily="serif">/ 100</text>
      </svg>
    </div>
  );
}

function ProgressBar({ score, color }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(score), 300); return () => clearTimeout(t); }, [score]);
  return (
    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${w}%`, backgroundColor: color }}/>
    </div>
  );
}

export default function IckVsRedFlagMeter() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const resultRef = useRef(null);

  function handleAnswer(id, val) { setAnswers(p => ({ ...p, [id]: val })); }
  function canProceed() { const q = QUESTIONS[currentQ]; return answers[q.id]?.toString().trim().length > 0; }

  async function analyze() {
    setStep(2);
    setError(null);
    const msg = `Duration: ${answers.duration}\nEstablished relationship: ${answers.established}\nSituation: ${answers.situation}\nBody feeling WITH him: ${answers.bodyFeel}\nFeeling AWAY from him: ${answers.awaySense}\nGut/intuition: ${answers.intuition}`;
    try {
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: msg }],
        }),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const data = await res.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setResult(parsed);
      setStep(3);
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Something went wrong reading your situation. Please try again.");
      setStep(1);
    }
  }

  useEffect(() => {
    if (step === 3 && resultRef.current)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [step]);

  const cfg = result ? (verdictConfig[result.verdictColor] || verdictConfig.mixed) : null;

  const S = { fontFamily: "'Georgia','Times New Roman',serif" };
  const label = { fontSize: 12, letterSpacing: "0.1em", color: "#7c3aed", fontWeight: 600 };
  const body  = { fontSize: 15, color: "#44403c", lineHeight: 1.8 };

  return (
    <div style={{ ...S, background: "#fafaf9" }} className="min-h-screen">

      {/* Header */}
      <div className="w-full bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#4c1d95" }}>
          <span style={{ fontSize: 14 }}>🌸</span>
        </div>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#7c3aed" }} className="uppercase font-semibold">In Her Era™</div>
          <div style={{ fontSize: 13, color: "#57534e" }}>The Ick vs. Red Flag Meter</div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 py-10">

        {/* ── INTRO ── */}
        {step === 0 && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div style={{ fontSize: 38, lineHeight: 1.2, color: "#1c1917", fontWeight: 700 }}>
                Is this the Ick<br/>or a Red Flag?
              </div>
              <div style={{ fontSize: 16, color: "#78716c", lineHeight: 1.8 }}>
                When you're healing, it can be really hard to know if what you're feeling is part of the process — or a genuine warning sign. This tool helps you figure out which one it is.
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 space-y-3">
              <div style={{ ...label }} className="uppercase">What this does</div>
              {[
                "Looks at his behavior vs. what your nervous system is doing",
                "Helps you understand what your body is actually telling you",
                "Shows you whether this feels wrong because you're healing — or because something actually is wrong",
                "Always honours your gut — your intuition counts",
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div style={{ color: "#7c3aed", marginTop: 3 }}>✦</div>
                  <div style={{ fontSize: 14, color: "#44403c", lineHeight: 1.6 }}>{t}</div>
                </div>
              ))}
            </div>

            <div className="bg-stone-100 rounded-2xl p-4">
              <div style={{ fontSize: 12, color: "#78716c", lineHeight: 1.6, fontStyle: "italic" }}>
                This tool is backed by nervous system science and relationship psychology research. It's not a clinical diagnosis — it's a compass to support your healing.
              </div>
            </div>

            <SafetyAccordion />

            <button onClick={() => setStep(1)}
              className="w-full py-4 rounded-2xl text-white font-semibold text-lg transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 4px 24px rgba(124,58,237,.25)" }}>
              Begin →
            </button>
          </div>
        )}

        {/* ── QUESTIONS ── */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="flex justify-between" style={{ fontSize: 12, color: "#78716c" }}>
                <span>Question {currentQ + 1} of {QUESTIONS.length}</span>
                <span>{Math.round((currentQ / QUESTIONS.length) * 100)}% complete</span>
              </div>
              <ProgressBar score={(currentQ / QUESTIONS.length) * 100} color="#7c3aed" />
            </div>

            <div style={{ fontSize: 20, fontWeight: 700, color: "#1c1917", lineHeight: 1.4 }}>
              {QUESTIONS[currentQ].label}
            </div>

            {QUESTIONS[currentQ].type === "select" && (
              <div className="space-y-3">
                {QUESTIONS[currentQ].options.map(opt => (
                  <button key={opt} onClick={() => handleAnswer(QUESTIONS[currentQ].id, opt)}
                    className="w-full text-left px-5 py-4 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: answers[QUESTIONS[currentQ].id] === opt ? "#7c3aed" : "#e7e5e4",
                      background:  answers[QUESTIONS[currentQ].id] === opt ? "#f5f3ff" : "white",
                      color:       answers[QUESTIONS[currentQ].id] === opt ? "#7c3aed" : "#44403c",
                      fontSize: 15, lineHeight: 1.5,
                    }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {QUESTIONS[currentQ].type === "yesno" && (
              <div className="flex gap-4">
                {["Yes","No"].map(opt => (
                  <button key={opt} onClick={() => handleAnswer(QUESTIONS[currentQ].id, opt)}
                    className="flex-1 py-4 rounded-xl border-2 font-semibold text-lg transition-all"
                    style={{
                      borderColor: answers[QUESTIONS[currentQ].id] === opt ? "#7c3aed" : "#e7e5e4",
                      background:  answers[QUESTIONS[currentQ].id] === opt ? "#f5f3ff" : "white",
                      color:       answers[QUESTIONS[currentQ].id] === opt ? "#7c3aed" : "#44403c",
                    }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {QUESTIONS[currentQ].type === "textarea" && (
              <textarea rows={5} placeholder={QUESTIONS[currentQ].placeholder}
                value={answers[QUESTIONS[currentQ].id] || ""}
                onChange={e => handleAnswer(QUESTIONS[currentQ].id, e.target.value)}
                className="w-full px-5 py-4 rounded-xl border-2 resize-none outline-none transition-all"
                style={{ borderColor: "#e7e5e4", fontSize: 15, lineHeight: 1.6, color: "#44403c", fontFamily: "Georgia,serif" }}
                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                onBlur={e  => e.target.style.borderColor = "#e7e5e4"}
              />
            )}

            <div className="flex gap-3">
              {currentQ > 0 && (
                <button onClick={() => setCurrentQ(q => q-1)}
                  className="flex-1 py-4 rounded-xl border-2 border-stone-200 text-stone-600 font-semibold hover:bg-stone-100 transition-all"
                  style={{ fontSize: 15 }}>← Back</button>
              )}
              {currentQ < QUESTIONS.length - 1 ? (
                <button onClick={() => { if (canProceed()) setCurrentQ(q => q+1); }}
                  className="flex-1 py-4 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: canProceed() ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "#d4d0cc", fontSize: 15, cursor: canProceed() ? "pointer" : "not-allowed" }}>
                  Next →
                </button>
              ) : (
                <button onClick={() => { if (canProceed()) analyze(); }}
                  className="flex-1 py-4 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: canProceed() ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "#d4d0cc", fontSize: 15, cursor: canProceed() ? "pointer" : "not-allowed", boxShadow: canProceed() ? "0 4px 24px rgba(124,58,237,.25)" : "none" }}>
                  Show Me My Reading ✦
                </button>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
            )}
          </div>
        )}

        {/* ── LOADING ── */}
        {step === 2 && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-purple-100"/>
              <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent" style={{ animation: "spin 1s linear infinite" }}/>
            </div>
            <div className="text-center space-y-2">
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1c1917" }}>Reading your situation...</div>
              <div style={{ fontSize: 14, color: "#78716c" }}>Taking a moment to look at this carefully for you</div>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ── RESULT ── */}
        {step === 3 && result && cfg && (
          <div ref={resultRef} className="space-y-6">

            {/* Meter */}
            <div className={`rounded-3xl p-6 ${cfg.bg} border ${cfg.border} space-y-4`}>
              <div style={{ fontSize: 12, letterSpacing: "0.1em", color: "#78716c" }} className="uppercase">Your Reading</div>
              <MeterArc score={result.score} color={cfg.meter}/>
              <div className="text-center space-y-2">
                <div className="inline-block px-4 py-2 rounded-full font-semibold text-white text-sm"
                  style={{ background: `linear-gradient(135deg,${cfg.meter},${cfg.meter}cc)` }}>
                  {result.verdict}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1c1917", lineHeight: 1.4 }}>{result.headline}</div>
              </div>
            </div>

            {/* What's happening */}
            <div className="bg-white rounded-2xl p-5 border border-stone-100 space-y-3">
              <div style={label} className="uppercase">What's Actually Going On</div>
              <div style={body}>{result.whatsHappening}</div>
            </div>

            {/* Body signals */}
            <div className="bg-white rounded-2xl p-5 border border-stone-100 space-y-3">
              <div style={label} className="uppercase">What Your Body Is Telling You</div>
              <div style={body}>{result.whatYourBodyIsTellingYou}</div>
            </div>

            {/* Intuition */}
            <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100 space-y-3">
              <div style={label} className="uppercase">Your Intuition</div>
              <div style={{ ...body, fontStyle: "italic" }}>{result.intuitionNote}</div>
            </div>

            {/* Patterns — bullet points */}
            {result.specificPatterns?.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-stone-100 space-y-3">
                <div style={label} className="uppercase">What I'm Noticing</div>
                <div className="space-y-2">
                  {result.specificPatterns.map((p, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div style={{ color: cfg.meter, marginTop: 4, fontSize: 12, flexShrink: 0 }}>✦</div>
                      <div style={body}>{p}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next step */}
            <div className="rounded-2xl p-5 border-2 space-y-3"
              style={{ borderColor: cfg.meter + "40", background: cfg.meter + "08" }}>
              <div style={{ ...label, color: cfg.meter }} className="uppercase">Your Next Step</div>
              <div style={body}>{result.nextStep}</div>
            </div>

            {/* Affirmation */}
            <div className="text-center py-4">
              <div style={{ fontSize: 18, color: "#7c3aed", fontStyle: "italic", lineHeight: 1.6 }}>
                "{result.affirmation}"
              </div>
            </div>

            {/* Safety banner — shown after results, so she lands in her reading first */}
            {result.showSafetyResources && <SafetyBanner />}

            {/* Always-on safety accordion */}
            <SafetyAccordion />

            {/* Citations footer */}
            <div className="bg-stone-100 rounded-xl p-4">
              <div style={{ fontSize: 11, color: "#78716c", lineHeight: 1.6, fontStyle: "italic" }}>
                {result.citationsFooter || "Backed by: attachment science (Bowlby, 1969) · nervous system research (Porges, 2011) · somatic trauma research (van der Kolk, 2014; Levine, 2010) · reward and conditioning science (Schultz et al., 1997; Skinner, 1938) · stress physiology (McEwen & Stellar, 1993) · relationship abuse research (Dutton & Goodman, 2005)"}
              </div>
            </div>

            <button onClick={() => { setStep(0); setAnswers({}); setResult(null); setCurrentQ(0); }}
              className="w-full py-4 rounded-2xl border-2 border-stone-200 text-stone-600 font-semibold hover:bg-stone-100 transition-all"
              style={{ fontSize: 15 }}>
              Analyze a Different Situation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
