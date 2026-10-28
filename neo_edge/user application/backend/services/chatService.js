import OpenAI from 'openai';
import dotenv from 'dotenv';
import { searchAllChunks } from '../db/supabase.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate embedding for a text query
 */
async function generateEmbedding(text) {
  try {
    if (!openai.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002', // or 'text-embedding-3-small' if preferred
      input: text
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No embedding returned from OpenAI');
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate chat response using RAG
 */
export async function chatWithRAG(userQuestion, conversationHistory = []) {
  try {
    if (!openai.apiKey) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file');
    }

    // Step 1: Generate embedding for the user's question
    console.log('Generating embedding for question...');
    const questionEmbedding = await generateEmbedding(userQuestion);

    // Step 2: Search for relevant transcript chunks
    console.log('Searching for relevant transcript chunks...');
    const relevantChunks = await searchAllChunks(
      questionEmbedding,
      0.5, // similarity threshold (lower to get more results)
      10   // number of chunks to retrieve
    );

    if (relevantChunks.length === 0) {
      return {
        answer: "I couldn't find any relevant information in the transcripts to answer your question. Please try rephrasing your question or asking about a different topic.",
        sources: [],
        chunksUsed: 0
      };
    }

    // Step 3: Build context from retrieved chunks
    const contextChunks = relevantChunks.map((chunk, index) => {
      const channel = chunk.channel_title || 'Unknown';
      const title = chunk.video_title || 'Unknown';
      const text = chunk.chunk_text || '';
      return `[Source ${index + 1}: ${channel} - "${title}"]\n${text}`;
    }).join('\n\n---\n\n');

    // Step 4: Build the prompt for the LLM
    const systemPrompt = `You are Neo, an intelligent enterprise AI assistant that helps users understand enterprise technology videos, demos, and features from vendors like Oracle, SAP, Salesforce, and Workday.

## About Neo Platform

Neo is an enterprise AI intelligence platform that extracts, organizes, and presents insights from enterprise technology videos. Here's what you should know about Neo:

**What Neo Does:**
- Extracts and organizes information from enterprise AI videos without requiring users to watch lengthy videos
- Processes video transcripts and creates intelligence cards with key insights
- Provides semantic search across video content using vector embeddings
- Helps users quickly understand features, demos, use cases, and vendor comparisons

**Key Features:**
- **Latest Intelligence**: Real-time feed of enterprise AI updates and product demonstrations
- **Feed**: Social media-style feed with filters for vendors, products, and AI types
- **Use Case Explorer**: Comprehensive library of AI use cases and applications
- **Vendor Explorer**: Browse and compare different enterprise vendors (Oracle, SAP, Salesforce, Workday, etc.)
- **Demo Catalog**: Curated collection of product demonstrations and keynotes
- **18D Analysis**: Deep extraction of 18 dimensions from videos including use cases, problems, benefits, technologies, and more
- **Ask Neo Chat**: AI-powered chat assistant (that's you!) with RAG (Retrieval Augmented Generation)

**How Neo Works:**
- Uses OpenAI embeddings to create vector representations of video transcripts
- Performs semantic search to find relevant content based on meaning, not just keywords
- Uses RAG (Retrieval Augmented Generation) to answer questions by retrieving relevant transcript chunks and generating answers
- Processes videos from major enterprise vendors and extracts structured data (18-dimensional extraction)

**Vendors Covered:**
Oracle, SAP, Salesforce, Workday, Microsoft, and other major enterprise technology vendors

## Your Role

Your role is to:
1. Answer questions about enterprise technology videos, demos, and features based on provided transcript excerpts
2. Answer questions about Neo itself - what it is, what it does, its features, and how it works
3. Be helpful, professional, and friendly
4. Use only the information from the provided context when answering questions about videos
5. Use your knowledge about Neo when users ask about the platform itself

Guidelines:
- **ALWAYS provide brief, concise answers** - Keep responses short and to the point (2-4 sentences maximum for simple questions, 1-2 paragraphs for complex questions)
- Avoid lengthy explanations unless specifically asked for details
- Get straight to the point - users want quick answers, not essays
- Provide clear, concise answers based on the transcript excerpts when answering video-related questions
- When asked about Neo, give brief explanations of what the platform does, its features, and capabilities
- Cite which source (vendor/channel) the information comes from when relevant (but keep it brief)
- If asked about comparisons, use information from multiple sources if available (summarize concisely)
- Be professional and helpful
- If you cannot answer from the provided context, politely say so in one sentence`;

    // Check if the question is about Neo itself
    const isAboutNeo = /what is neo|tell me about neo|neo platform|neo application|how does neo work|neo features|neo capabilities/i.test(userQuestion);
    
    let userPrompt = '';
    
    if (isAboutNeo && (!contextChunks || contextChunks.trim().length === 0)) {
      // Question about Neo but no video context - answer from system knowledge
      userPrompt = `User Question: ${userQuestion}

IMPORTANT: Provide a brief, concise answer (2-4 sentences maximum). Get straight to the point.`;
    } else if (contextChunks && contextChunks.trim().length > 0) {
      // Has video context - use it
      userPrompt = `Context from enterprise AI video transcripts:

${contextChunks}

---

User Question: ${userQuestion}

IMPORTANT: Provide a brief, concise answer based on the provided context (2-4 sentences for simple questions, 1-2 short paragraphs for complex questions). Get straight to the point. If the question is about Neo itself, you can also use your knowledge about the platform. If the context doesn't contain enough information, acknowledge this briefly in one sentence.`;
    } else {
      // No context but question might be about videos or general
      userPrompt = `User Question: ${userQuestion}

IMPORTANT: Provide a brief, concise answer (2-4 sentences maximum). If it's about Neo, explain briefly using your knowledge of the platform. If it's about enterprise technology videos, let them know briefly that you need video content to provide specific answers.`;
    }

    // Step 5: Generate response using OpenAI Chat Completions
    console.log('Generating response from OpenAI...');
    console.log(`Using ${relevantChunks.length} chunks for context`);
    console.log(`Conversation history length: ${conversationHistory.length}`);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userPrompt }
    ];
    
    console.log(`Total messages to send: ${messages.length}`);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 300  // Reduced from 1000 to keep answers brief
    });

    const answer = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    console.log(`Generated answer length: ${answer.length} characters`);

    return {
      answer,
      chunksUsed: relevantChunks.length
    };

  } catch (error) {
    console.error('Error in chatWithRAG:', error);
    
    if (error.message.includes('API key')) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file');
    }
    
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

