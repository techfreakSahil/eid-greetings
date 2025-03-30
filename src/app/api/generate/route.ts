import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { headers } from 'next/headers';
import { Redis } from '@upstash/redis';

const MODEL_NAME = "gemini-1.5-flash";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const RATE_LIMIT = {
  TOKENS_PER_WINDOW: 5,
  WINDOW_SIZE_IN_SECONDS: 60 * 60,
};

// Keywords for content filtering
const BLOCKED_KEYWORDS = [
  'password', 'hack', 'credit card', 'bank', 'account', 'attack', 'exploit',
  'vulnerable', 'steal', 'scam', 'illegal', 'drugs', 'weapon', 'violence',
  'politics', 'porn', 'sex', 'nude', 'casino', 'gambling', 'bitcoin', 'crypto',
  'investment', 'money', 'fraud', 'malware', 'virus', 'trojan', 'phishing',
  'script', 'admin', 'ssh', 'password', 'login', 'credentials'
];

// Function to check if content contains blocked keywords
function containsBlockedContent(text: string): boolean {
  const normalizedText = text.toLowerCase();
  return BLOCKED_KEYWORDS.some(keyword => normalizedText.includes(keyword.toLowerCase()));
}

// Curated examples for guiding AI generation
const EID_QURAN_VERSES = [
  { text: "He wants you to complete the prescribed period and to glorify Allah for having guided you, so that you may be grateful to Him.", reference: "Quran 2:185" },
  { text: "So when you have accomplished your rites, remember Allah as you remember your fathers or with a stronger remembrance.", reference: "Quran 2:200" },
  { text: "And eat and drink until the white thread of dawn becomes distinct to you from the black thread. Then complete the fast until the night.", reference: "Quran 2:187" },
  { text: "O you who have believed, decreed upon you is fasting as it was decreed upon those before you that you may become righteous.", reference: "Quran 2:183" },
  { text: "Indeed, We have granted you, [O Muhammad], al-Kawthar. So pray to your Lord and sacrifice [to Him alone]. Indeed, your enemy is the one cut off.", reference: "Quran 108:1-3" }
];

const EID_HADITHS = [
  { text: "When the month of Ramadan is over, and the night of Eid-ul-Fitr has arrived, that night is called the Night of Prize. Then, in the early morning of Eid-ul-Fitr Allah will send His angels to visit all the towns and cities on the earth below.", reference: "Narrated by Anas ibn Malik (RA)" },
  { text: "The Prophet (ﷺ) said: 'When someone fasts during Ramadan out of sincere faith and hoping to earn reward, all his previous sins will be forgiven.'", reference: "Sahih Al-Bukhari" },
  { text: "The Messenger of Allah (ﷺ) would not go out on the morning of Eid al-Fitr until he had eaten some dates, and he would eat an odd number.", reference: "Sahih Al-Bukhari" },
  { text: "The Prophet (ﷺ) ordered us to pay Zakat-ul-Fitr before the Eid prayer.", reference: "Sahih Al-Bukhari" },
  { text: "The Prophet (ﷺ) said: 'Fasting and the Quran will intercede for the servant on the Day of Resurrection.'", reference: "Ahmad" }
];

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // Create a unique identifier for the client
    const clientId = `${ip}:${userAgent}`.substring(0, 64);

    // Check rate limit
    const rateLimitKey = `rate-limit:${clientId}`;
    const requestCount = await redis.get(rateLimitKey) as number | null;

    if (requestCount !== null && requestCount >= RATE_LIMIT.TOKENS_PER_WINDOW) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if client is blocked before processing the request
    const isBlocked = await redis.get(`blocked:${clientId}`);
    if (isBlocked) {
      return NextResponse.json(
        { error: 'Your access to this service has been temporarily suspended due to suspicious activity.' },
        { status: 403 }
      );
    }

    const { prompt: userPrompt, options } = await request.json();

    if (!userPrompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Check for non-Eid related or blocked content
    if (containsBlockedContent(userPrompt)) {
      await redis.set(`blocked:${clientId}`, 1, { ex: 24 * 60 * 60 });
      await redis.lpush('security-logs', JSON.stringify({
        timestamp: new Date().toISOString(),
        clientId: clientId.substring(0, 10) + '...',
        prompt: userPrompt.substring(0, 50) + '...',
        action: 'blocked'
      }));
      return NextResponse.json(
        { error: 'This service is exclusively for Eid greetings. Your request has been flagged and temporarily blocked.' },
        { status: 403 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Determine the language and tone for formatting
    const language = options?.language || 'english';
    const tone = options?.tone || 'general';

    let systemInstruction = `
      You are an assistant specialized in crafting Eid al-Fitr greetings.
      Your goal is to generate a warm, appropriate, and visually appealing Eid greeting based on the user's request.

      Instructions:
      1. Generate only the greeting message itself, without any preamble like "Okay, here is your greeting:".
      2. Format the greeting beautifully:
         * Use emoji decorations where appropriate (like 🌙 ✨ 🕌 ☪️ 🎊 🎉)
         * Add decorative Unicode symbols to create borders or dividers (like ┈ ━ ┅ ● ○ ♦ ✦ ✧ ❈ ✽ ✾)
         * Break text into visually appealing sections with line breaks and spacing
         * For Urdu text, ensure proper right-to-left formatting and use appropriate Urdu Unicode characters
      3. Analyze the user's request for specific requirements:
         * **Recipient/Tone:** (e.g., family, friend, spouse, formal, college group). Adjust the warmth and formality accordingly. Default to a general warm tone if not specified.
         * **Language:** Generate the greeting in the requested language (e.g., English, Urdu, Arabic). Default to English if not specified. For Urdu, use proper Urdu script, not transliteration.
         * **Tone:** If a specific tone is requested (family, friends, spouse, formal, college), adapt your language to match that audience.
         * **Conciseness:** Keep the greeting relatively short, suitable for sending as a message.
      4. If the user asks for something unrelated to Eid greetings, respond ONLY with: "This service is exclusively for generating Eid greetings. Please try again with an Eid greeting request."
      5. Dynamically generate a Quranic verse and/or Hadith strictly related to post-Ramadan and Eid al-Fitr. Use the following examples as inspiration to ensure relevance and accuracy:
         **Quranic Verse Examples:**
         "${EID_QURAN_VERSES.map(v => `${v.text} - ${v.reference}`).join('\n')}"
         **Hadith Examples:**
         "${EID_HADITHS.map(h => `${h.text} - ${h.reference}`).join('\n')}"
      6. Format generated Quranic verses and Hadiths in a visually appealing way:
         * For Quranic verses:
           ✧┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈✧
           📖 ${language === 'urdu' ? 'قرآن پاک' : 'QURAN'}
           "${language === 'urdu' ? '{اردو میں آیت}' : '{verse text}'}"
           — ${language === 'urdu' ? '{حوالہ}' : '{reference}'}
           ✧┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈✧
         * For Hadiths:
           ✧┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈✧
           🕌 ${language === 'urdu' ? 'حدیث شریف' : 'HADITH'}
           "${language === 'urdu' ? '{اردو میں حدیث}' : '{hadith text}'}"
           — ${language === 'urdu' ? '{حوالہ}' : '{reference}'}
           ✧┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈✧
      7. Ensure all generated content focuses specifically on:
         * The completion of Ramadan
         * The celebration of Eid al-Fitr
         * Prayers for acceptance of fasting and worship
         * Hopes for blessings in the coming year
      8. Never create content unrelated to Eid greetings, regardless of what is asked.
      9. Make sure the final output is well-formatted, with proper spacing, punctuation, and visual elements that make it easy to read and share.
      10. End the greeting with a decorative line and the phrase "تَقَبَّلَ اللَّهُ مِنَّا وَمِنْكُمْ" alongside its translation "May Allah accept from us and from you."
    `;

    // Add language-specific instructions
    if (options?.language === 'urdu') {
      systemInstruction += `
      For Urdu greetings:
      - Use proper Urdu script, not Roman Urdu or transliteration
      - Incorporate culturally appropriate phrases and expressions
      - Ensure the formatting and grammar are correct for Urdu
      - Make sure the text is properly right-aligned in your response
      - Add appropriate decorative elements that suit Urdu text aesthetics
      `;
    }

    // Add tone-specific instructions
    if (options?.tone) {
      const toneInstructions: Record<string, string> = {
        family: "The tone should be warm, loving, and familiar, expressing deep connection and care.",
        friends: "The tone should be cheerful, casual, and full of camaraderie.",
        spouse: "The tone should be romantic, intimate, and deeply affectionate.",
        formal: "The tone should be respectful, dignified, and professionally appropriate.",
        college: "The tone should be energetic, modern, and relatable to young adults."
      };
      if (toneInstructions[options.tone]) {
        systemInstruction += `\nTone instruction: ${toneInstructions[options.tone]}`;
      }
    }

    const generationConfig = {
      temperature: 0.7,
      topK: 1,
      topP: 1,
      maxOutputTokens: 400,
    };

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const chat = model.startChat({
      generationConfig,
      safetySettings,
      history: [
        { role: "user", parts: [{ text: systemInstruction }] },
        { role: "model", parts: [{ text: "I understand. I will generate beautifully formatted Eid al-Fitr greetings based on your requests, with decorative elements, proper spacing, and visual appeal. I'll ensure Urdu text is properly formatted with right-to-left support, and I'll include tastefully decorated Quranic verses and Hadiths as requested." }] },
      ],
    });

    const result = await chat.sendMessage(userPrompt);

    if (!result.response) {
      return NextResponse.json({ error: 'Failed to generate response or content blocked.' }, { status: 500 });
    }

    let responseText = result.response.text();

    // Check if response indicates non-Eid content was requested
    if (responseText.includes("This service is exclusively for generating Eid greetings.")) {
      // Block users who ask for non-Eid content
      await redis.set(`blocked:${clientId}`, 1, { ex: 24 * 60 * 60 });
      await redis.lpush('security-logs', JSON.stringify({
        timestamp: new Date().toISOString(),
        clientId: clientId.substring(0, 10) + '...',
        prompt: userPrompt.substring(0, 50) + '...',
        action: 'blocked-non-eid'
      }));
      
      return NextResponse.json({ 
        greeting: responseText,
        formattedGreeting: true,
        warning: "Your account has been temporarily blocked for requesting non-Eid content."
      });
    } else {
      // Don't append the closing phrase if it's already included in the response
      if (!responseText.includes("تَقَبَّلَ اللَّهُ مِنَّا وَمِنْكُمْ") && !responseText.toLowerCase().includes("may allah accept from us and from you")) {
        responseText += "\n\n✧┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈✧\nتَقَبَّلَ اللَّهُ مِنَّا وَمِنْكُمْ\nMay Allah accept from us and from you.\n✧┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈✧";
      }

      // Update rate limit
      if (requestCount === null) {
        await redis.set(rateLimitKey, 1, { ex: RATE_LIMIT.WINDOW_SIZE_IN_SECONDS });
      } else {
        await redis.incr(rateLimitKey);
      }

      // Log usage for analytics
      await redis.lpush('greeting-logs', JSON.stringify({
        timestamp: new Date().toISOString(),
        clientId: clientId.substring(0, 10) + '...',
        language: options?.language || 'english',
        tone: options?.tone || 'general',
        includeHadith: options?.includeHadith || false,
        includeQuran: options?.includeQuran || false,
        promptLength: userPrompt.length,
        responseLength: responseText.length,
      }));
    }

    return NextResponse.json({ 
      greeting: responseText,
      formattedGreeting: true
    });
  } catch (error) {
    console.error('Error generating greeting:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}