// src/index.js  — Prin Search (multi-provider CLI)
// Run: node src/index.js -p gemini "Write a haiku"
// Chat: node src/index.js -i -p openai

import 'dotenv/config';
import readline from 'node:readline';
import axios from 'axios';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ---------- Helpers ----------
const args = process.argv.slice(2);
const getArg = (flag, fallback = null) => {
  const i = args.indexOf(flag);
  return i >= 0 ? (args[i + 1] || null) : fallback;
};
const hasFlag = (flag) => args.includes(flag);

const PROVIDER = (getArg('-p') || getArg('--provider') || 'gemini').toLowerCase();
const MODEL    = getArg('-m') || getArg('--model') || null;
const PROMPT   = args.filter((a, i) => i === args.length - 1 && !a.startsWith('-'))[0];
const INTERACTIVE = hasFlag('-i') || hasFlag('--interactive');

// Defaults you can override with -m
const DEFAULTS = {
  openai:      'gpt-4o-mini',             // (there is no public “GPT-5”; use latest gpt-* here)
  gemini:      'gemini-1.5-flash',        // fast; swap to gemini-2.0-pro / 2.5 pro if available to you
  perplexity:  'sonar-pro',               // or 'sonar-reasoning'
  deepseek:    'deepseek-chat',           // or 'deepseek-reasoner'
  claude:      'claude-3-5-sonnet-20240620', // adjust to your allowed latest
  grok:        'grok-2-latest'            // adjust if your account lists different
};

// Pretty print
function out(label, text) {
  console.log(`\n=== ${label} ===\n${text}\n`);
}

// ---------- Per-provider callers ----------
async function callOpenAI(prompt, model = DEFAULTS.openai, baseURL, apiKey) {
  const client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {})
  });
  // Use Chat Completions for broad compatibility with provider clones
  const res = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }]
  });
  return res.choices?.[0]?.message?.content || '';
}

async function callGemini(prompt, model = DEFAULTS.gemini) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('Missing GOOGLE_API_KEY');
  const genAI = new GoogleGenerativeAI(key);
  const mdl = genAI.getGenerativeModel({ model });
  const result = await mdl.generateContent(prompt);
  return result.response.text();
}

async function callClaude(prompt, model = DEFAULTS.claude) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Missing ANTHROPIC_API_KEY');
  const anthropic = new Anthropic({ apiKey: key });
  const res = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });
  // Claude SDK returns content blocks
  const txt = res.content?.map(b => b.text || '').join('').trim();
  return txt || '';
}

// Perplexity (OpenAI-compatible)
async function callPerplexity(prompt, model = DEFAULTS.perplexity) {
  const key = process.env.PPLX_API_KEY;
  if (!key) throw new Error('Missing PPLX_API_KEY');
  // Use OpenAI SDK with baseURL override (works with Perplexity)
  return callOpenAI(prompt, model, 'https://api.perplexity.ai', key);
}

// DeepSeek (OpenAI-compatible)
async function callDeepSeek(prompt, model = DEFAULTS.deepseek) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('Missing DEEPSEEK_API_KEY');
  return callOpenAI(prompt, model, 'https://api.deepseek.com/v1', key);
}

// Grok (xAI, OpenAI-compatible)
async function callGrok(prompt, model = DEFAULTS.grok) {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error('Missing XAI_API_KEY');
  return callOpenAI(prompt, model, 'https://api.x.ai/v1', key);
}

// Router
async function ask(provider, prompt, model) {
  switch (provider) {
    case 'gemini':     return callGemini(prompt, model || DEFAULTS.gemini);
    case 'claude':     return callClaude(prompt, model || DEFAULTS.claude);
    case 'perplexity': return callPerplexity(prompt, model || DEFAULTS.perplexity);
    case 'deepseek':   return callDeepSeek(prompt, model || DEFAULTS.deepseek);
    case 'grok':       return callGrok(prompt, model || DEFAULTS.grok);
    case 'openai':
    case 'chatgpt':
    default: {
      const key = process.env.OPENAI_API_KEY;
      if (!key) throw new Error('Missing OPENAI_API_KEY');
      return callOpenAI(prompt, model || DEFAULTS.openai, undefined, key);
    }
  }
}

// ---------- Interactive chat ----------
async function chatLoop(provider, model) {
  console.log(`\nPrin Search — interactive mode\nProvider: ${provider}${model ? ` | Model: ${model}` : ''}`);
  console.log("Type '/exit' to quit.\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const askLine = (q) => new Promise(res => rl.question(q, res));

  while (true) {
    const q = await askLine('You > ');
    if (!q.trim()) continue;
    if (q.trim().toLowerCase() === '/exit') break;

    try {
      const ans = await ask(provider, q, model);
      out('Prin', ans);
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
  rl.close();
}

// ---------- Entry ----------
(async () => {
  if (INTERACTIVE) {
    await chatLoop(PROVIDER, MODEL);
    return;
  }

  if (!PROMPT) {
    console.log(`Prin Search\n
Usage:
  node src/index.js -p gemini "your prompt"
  node src/index.js -p openai -m gpt-4o "your prompt"
  node src/index.js -i -p claude           (interactive)
Providers:
  openai | gemini | perplexity | deepseek | claude | grok
`);
    return;
  }

  try {
    const ans = await ask(PROVIDER, PROMPT, MODEL);
    out('Prin', ans);
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
