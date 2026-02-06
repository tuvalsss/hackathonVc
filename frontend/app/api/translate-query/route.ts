import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const PREDEFINED_CHECKS = [
  { id: 'market_risk', name: 'Market Risk Score', keywords: ['risk', 'danger', 'safe', 'safety', 'risky'] },
  { id: 'price_deviation', name: 'Price Deviation Check', keywords: ['deviation', 'difference', 'discrepancy', 'compare', 'mismatch'] },
  { id: 'volatility_alert', name: 'Volatility Alert', keywords: ['volatility', 'volatile', 'unstable', 'rapid', 'change', 'fluctuation'] },
  { id: 'multi_source_confirm', name: 'Multi-Source Confirmation', keywords: ['confirm', 'verify', 'validate', 'check', 'accurate', 'consensus'] }
];

const SYSTEM_PROMPT = `You are a market intelligence query classifier. Given a user's natural language query about cryptocurrency markets, classify it into ONE of these predefined check types:

1. market_risk - Queries about overall market risk, safety, or danger levels
2. price_deviation - Queries about price differences or discrepancies between sources
3. volatility_alert - Queries about price volatility, rapid changes, or instability
4. multi_source_confirm - Queries about verifying or confirming data accuracy across sources

Respond with ONLY the check ID (e.g., "market_risk"), nothing else.

Examples:
- "Is it safe to trade now?" → market_risk
- "Are there any price differences between exchanges?" → price_deviation
- "Is ETH price volatile right now?" → volatility_alert
- "Can you verify the current BTC price?" → multi_source_confirm
- "Check if there's high volatility" → volatility_alert
- "What's the market risk level?" → market_risk`;

async function tryOpenAI(query: string): Promise<string | null> {
  try {
    if (!process.env.OPENAI_API_KEY) return null;
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: query }
      ],
      temperature: 0,
      max_tokens: 20
    });
    
    const result = response.choices[0]?.message?.content?.trim();
    if (result && PREDEFINED_CHECKS.some(c => c.id === result)) {
      return result;
    }
    return null;
  } catch (error) {
    console.error('OpenAI error:', error);
    return null;
  }
}

async function tryGoogleAI(query: string): Promise<string | null> {
  try {
    if (!process.env.GOOGLE_AI_API_KEY) return null;
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `${SYSTEM_PROMPT}\n\nUser query: "${query}"\n\nClassification:`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    if (PREDEFINED_CHECKS.some(c => c.id === text)) {
      return text;
    }
    return null;
  } catch (error) {
    console.error('Google AI error:', error);
    return null;
  }
}

async function tryAnthropic(query: string): Promise<string | null> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) return null;
    
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 20,
      messages: [
        { 
          role: 'user', 
          content: `${SYSTEM_PROMPT}\n\nUser query: "${query}"\n\nClassification:` 
        }
      ]
    });
    
    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : null;
    if (text && PREDEFINED_CHECKS.some(c => c.id === text)) {
      return text;
    }
    return null;
  } catch (error) {
    console.error('Anthropic error:', error);
    return null;
  }
}

function fallbackKeywordMatch(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  // Try exact keyword matching
  for (const check of PREDEFINED_CHECKS) {
    for (const keyword of check.keywords) {
      if (lowerQuery.includes(keyword)) {
        return check.id;
      }
    }
  }
  
  // Default to market_risk
  return 'market_risk';
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }
    
    // Try OpenAI first (default)
    let checkId = await tryOpenAI(query);
    if (checkId) {
      return NextResponse.json({ checkId, provider: 'openai' });
    }
    
    // Try Google AI as fallback
    checkId = await tryGoogleAI(query);
    if (checkId) {
      return NextResponse.json({ checkId, provider: 'google' });
    }
    
    // Try Anthropic as second fallback
    checkId = await tryAnthropic(query);
    if (checkId) {
      return NextResponse.json({ checkId, provider: 'anthropic' });
    }
    
    // Final fallback: keyword matching
    checkId = fallbackKeywordMatch(query);
    return NextResponse.json({ checkId, provider: 'keyword-fallback' });
    
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ 
      error: 'Failed to translate query',
      checkId: 'market_risk',
      provider: 'error-fallback'
    }, { status: 500 });
  }
}
