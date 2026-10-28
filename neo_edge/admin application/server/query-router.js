import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { StateGraph, END } from '@langchain/langgraph';
import dotenv from 'dotenv';
import { supabase, searchChunksByVideoId, searchAllChunks } from './db/supabase.js';
import { getDriver } from './db/neo4j.js';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Intent Classification - Determines if query is semantic, graph, or hybrid
 */
async function classifyIntent(state) {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const llm = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0,
      openAIApiKey: OPENAI_API_KEY,
    });

    const prompt = `Analyze this user query and classify its intent:

Query: "${state.query}"

Classify the intent as one of:
- "semantic": User wants to find similar content, search by meaning, or find videos about a topic. Keywords: "similar", "find videos about", "which mentions", "what is discussed", "search for"
- "graph": User wants to understand relationships, connections, or paths between entities. Keywords: "how does X lead to Y", "relationships between", "connections", "path from", "show Problem → UseCase"
- "hybrid": User wants both similarity search AND relationship analysis. Keywords: "similar use-cases and their", "find X and show how they connect", "compare X across connected Y"

Return ONLY a JSON object with this exact format:
{
  "intent": "semantic" | "graph" | "hybrid",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

    const response = await llm.invoke(prompt);
    let intentData = response.content;

    // Extract JSON from response
    if (typeof intentData === 'string') {
      const jsonMatch = intentData.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        intentData = jsonMatch[0];
      }
      intentData = JSON.parse(intentData);
    }

    console.log('Intent classified:', intentData);

    return {
      ...state,
      intent: intentData.intent,
      intentConfidence: intentData.confidence,
      intentReasoning: intentData.reasoning
    };
  } catch (error) {
    console.error('Error classifying intent:', error);
    // Default to semantic if classification fails
    return {
      ...state,
      intent: 'semantic',
      intentConfidence: 0.5,
      intentReasoning: 'Classification failed, defaulting to semantic'
    };
  }
}

/**
 * Semantic Route - Vector search in Supabase (scoped to video)
 */
async function semanticRoute(state) {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const isScoped = !!state.videoId;
    console.log('Running semantic search for:', state.query, isScoped ? `in video: ${state.videoId}` : 'across all videos');

    // Generate embedding for user query
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002'
    });

    const queryEmbedding = await embeddings.embedQuery(state.query);

    let results = [];

    if (isScoped) {
      // Search chunks for this specific video
      const chunks = await searchChunksByVideoId(state.videoId, queryEmbedding, 0.5, 3);

      // Get video info for results
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('id, video_id, title, video_url, channel_title')
        .eq('video_id', state.videoId)
        .single();

      results = chunks.map(chunk => ({
        id: chunk.id,
        video_id: state.videoId,
        title: videoData?.title || 'Unknown',
        video_url: videoData?.video_url || '',
        channel: videoData?.channel_title || 'Unknown',
        excerpt: chunk.chunk_text,
        chunk_index: chunk.chunk_index,
        char_start: chunk.char_start,
        char_end: chunk.char_end,
        similarity: chunk.similarity
      }));

      console.log(`Found ${results.length} semantic results (chunks) for video ${state.videoId}`);
    } else {
      // Search all chunks across all videos
      const chunks = await searchAllChunks(queryEmbedding, 0.5, 10);

      results = chunks.map(chunk => ({
        id: chunk.id,
        video_id: chunk.video_id,
        title: chunk.video_title || 'Unknown',
        video_url: chunk.video_url || '',
        channel: chunk.channel_title || 'Unknown',
        excerpt: chunk.chunk_text,
        chunk_index: chunk.chunk_index,
        char_start: chunk.char_start,
        char_end: chunk.char_end,
        similarity: chunk.similarity,
        transcript_id: chunk.transcript_id
    }));

      console.log(`Found ${results.length} semantic results (chunks) across all videos`);
    }

    return {
      ...state,
      semanticResults: results
    };
  } catch (error) {
    console.error('Error in semantic route:', error);
    return {
      ...state,
      semanticResults: [],
      semanticError: error.message
    };
  }
}

/**
 * Generate Cypher query from natural language (scoped to video)
 */
async function generateCypherQuery(query, intent, videoId) {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const llm = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0,
      openAIApiKey: OPENAI_API_KEY,
    });

    const prompt = `Convert this natural language query to a Neo4j Cypher query:

Query: "${query}"

${videoId ? `CRITICAL: The query MUST be scoped to a specific video. Start with:
MATCH (v:Video {id: "${videoId}"})-[:HAS_TRANSCRIPT]->(t:Transcript)

NOTE: The videoId provided is the Supabase UUID (not YouTube video_id). Video nodes in Neo4j use this UUID as their id property.

All subsequent MATCH clauses must be connected to this transcript (t) node.
Do NOT query nodes from other videos.` : `IMPORTANT: Search across ALL videos in the database. Do NOT scope to a specific video.
You can query any nodes and relationships without video filtering.
Start directly with the entities you need (e.g., MATCH (r:Risk), MATCH (p:Problem), etc.).`}

Available node types: Video, Transcript, Speaker, Organization, UseCase, Problem, Benefit, Metric, Technology, Principle, Risk, Trend, Industry, Quote

Available relationships (IMPORTANT: Use exact directions shown):
- Video -[:HAS_TRANSCRIPT]-> Transcript
- Transcript -[:EXTRACTED_FROM]-> Speaker
- Transcript -[:MENTIONS_ORGANIZATION]-> Organization
- Transcript -[:MENTIONS_USECASE]-> UseCase
- Transcript -[:MENTIONS_PROBLEM]-> Problem
- Transcript -[:MENTIONS_BENEFIT]-> Benefit
- Transcript -[:MENTIONS_TECHNOLOGY]-> Technology
- Transcript -[:MENTIONS_PRINCIPLE]-> Principle
- Transcript -[:MENTIONS_RISK]-> Risk
- Transcript -[:MENTIONS_TREND]-> Trend
- Transcript -[:MENTIONS_INDUSTRY]-> Industry
- Transcript -[:CITES]-> Quote
- UseCase -[:ADDRESSES]-> Problem (UseCase addresses Problem)
- UseCase -[:DELIVERS]-> Benefit (UseCase delivers Benefit)
- UseCase -[:USES]-> Technology (UseCase uses Technology)
- UseCase -[:BASED_ON]-> Principle (UseCase based on Principle)
- UseCase -[:CARRIES_RISK]-> Risk (UseCase carries Risk)
- UseCase -[:BELONGS_TO]-> Industry (UseCase belongs to Industry)
- UseCase -[:CO_OCCURS_WITH]-> UseCase (UseCases mentioned together)
- Benefit -[:MEASURED_BY]-> Metric (Benefit measured by Metric)
- Metric -[:REPORTED_IN]-> Video (Metric reported in Video)
- Speaker -[:WORKS_AT]-> Organization (Speaker works at Organization)
- Speaker -[:DISCUSSES]-> UseCase (Speaker discusses UseCase)
- Speaker -[:MENTIONS_TECHNOLOGY]-> Technology (Speaker mentions Technology)
- Speaker -[:DISCUSSES_PROBLEM]-> Problem (Speaker discusses Problem)
- Organization -[:USES_TECHNOLOGY]-> Technology (Organization uses Technology)
- Organization -[:ADOPTS_TECHNOLOGY]-> Technology (Organization adopts Technology)
- Organization -[:HAS_USECASE]-> UseCase (Organization has UseCase)
- Organization -[:FACES_RISK]-> Risk (Organization faces Risk)
- Organization -[:MENTIONED_WITH]-> Organization (Organizations mentioned together)
- Technology -[:SOLVES]-> Problem (Technology solves Problem)
- Technology -[:ENABLES]-> Benefit (Technology enables Benefit)
- Technology -[:USED_WITH]-> Technology (Technologies used together)
- Problem -[:RELATES_TO_RISK]-> Risk (Problem relates to Risk)
  IMPORTANT: To query "how does risk connect with problems", use: (r:Risk)<-[:RELATES_TO_RISK]-(p:Problem)
  This means: Risk <- Problem (Problem points TO Risk, so to go FROM Risk TO Problem, reverse the direction)
- Industry -[:HAS_PROBLEM]-> Problem (Industry has Problem)
- Industry -[:SEEKS_BENEFIT]-> Benefit (Industry seeks Benefit)
- Industry -[:USES_TECHNOLOGY]-> Technology (Industry uses Technology)
- Trend -[:INFLUENCES]-> UseCase (Trend influences UseCase)
- Trend -[:DRIVES]-> Technology (Trend drives Technology)
- Trend -[:ADOPTED_BY]-> Organization (Trend adopted by Organization)
- Principle -[:GUIDES]-> Technology (Principle guides Technology)
- Quote -[:REFERENCES]-> UseCase (Quote references UseCase)
- Quote -[:REFERENCES]-> Technology (Quote references Technology)
- Quote -[:REFERENCES]-> Organization (Quote references Organization)
- Video -[:DISCUSSES_SIMILAR_TOPIC]-> Video (Videos with similar content)

CRITICAL: Pay attention to relationship directions. The arrow direction matters!
Example: "technologies used by organizations" means Organization -[:USES_TECHNOLOGY]-> Technology

IMPORTANT: To return relationships, ALWAYS use one of these patterns:
1. Return path: MATCH path = (a)-[r:REL_TYPE]->(b) RETURN path
2. Return relationships: MATCH (a)-[r:REL_TYPE]->(b) RETURN a, r, b
3. Return all: MATCH (a)-[r:REL_TYPE]->(b) RETURN a, r, b

PREFERRED: Use pattern 1 (return path) as it includes both nodes and relationships.
Example: MATCH path = (uc:UseCase)-[:DELIVERS]->(b:Benefit) RETURN path

Always return relationships along with nodes so the graph structure is visible.

CRITICAL: Do NOT include LIMIT clause in your query. Return ALL matching results.

Return ONLY the Cypher query, nothing else. Make it readable.`;

    const response = await llm.invoke(prompt);
    let cypher = response.content.trim();

    // Clean up the response
    if (cypher.includes('```')) {
      const match = cypher.match(/```(?:cypher)?\s*([\s\S]*?)```/);
      if (match) {
        cypher = match[1].trim();
      }
    }

    // Fix common Cypher syntax errors
    // Fix: -[:TYPE]<- should be <-[:TYPE]- (invalid pattern like -[:ADDRESSES]<-)
    cypher = cypher.replace(/-\s*\[([^\]]+)\]\s*<\s*-/g, '<-[$1]-');
    
    // Fix: ->[:TYPE]- should be -[:TYPE]-> (invalid pattern)
    cypher = cypher.replace(/-\s*>\s*\[([^\]]+)\]\s*-/g, '-[$1]->');
    
    // Fix: Mixed direction patterns in path expressions
    // Pattern: (a)-[:TYPE]<-(b) should be (a)<-[:TYPE]-(b)
    cypher = cypher.replace(/\(([^)]+)\)\s*-\s*\[([^\]]+)\]\s*<\s*-/g, '($1)<-[$2]-');
    
    // Fix RELATES_TO_RISK direction: Problem -[:RELATES_TO_RISK]-> Risk
    // If query incorrectly has (r:Risk)-[:RELATES_TO_RISK]->(p:Problem), reverse it
    // The correct direction is: (r:Risk)<-[:RELATES_TO_RISK]-(p:Problem)
    cypher = cypher.replace(/\(r:Risk\)\s*-\s*\[:RELATES_TO_RISK\]\s*-\s*>\(p:Problem\)/g, '(r:Risk)<-[:RELATES_TO_RISK]-(p:Problem)');
    
    // Ensure proper path syntax: if we have path = with mixed directions, fix them
    if (cypher.includes('path =')) {
      // Fix patterns like (p)-[:TYPE]<-(uc) in path expressions
      cypher = cypher.replace(/\(([^)]+)\)\s*-\s*\[([^\]]+)\]\s*<\s*-/g, '($1)<-[$2]-');
      // Fix RELATES_TO_RISK in path expressions
      cypher = cypher.replace(/\(r:Risk\)\s*-\s*\[:RELATES_TO_RISK\]\s*-\s*>\(p:Problem\)/g, '(r:Risk)<-[:RELATES_TO_RISK]-(p:Problem)');
    }
    
    // Post-process: If query matches relationships but doesn't return them, add them
    // Check if query has relationship patterns but RETURN doesn't include relationships
    const hasRelationshipPattern = /\[.*?\]/.test(cypher);
    const returnClause = cypher.match(/RETURN\s+(.+?)(?:\s+LIMIT|\s*$)/i);
    
    if (hasRelationshipPattern && returnClause) {
      const returnFields = returnClause[1];
      // If RETURN only has nodes (no 'r' or 'path'), try to add relationships
      if (!returnFields.includes('r') && !returnFields.includes('path') && !returnFields.includes('rel')) {
        // Try to extract relationship variable from MATCH clause
        const matchClause = cypher.match(/MATCH\s+(.+?)(?:\s+WHERE|\s+RETURN)/is);
        if (matchClause) {
          const matchPattern = matchClause[1];
          // Look for relationship patterns like (a)-[r]->(b) or (a)-[:TYPE]->(b)
          const relMatch = matchPattern.match(/\([^)]+\)\s*-\s*\[([^\]]+)\]\s*-\s*>/);
          if (relMatch) {
            const relVar = relMatch[1].replace(/^:/, '').replace(/^r\s*:/, 'r').trim();
            // If we found a relationship variable, add it to RETURN
            if (relVar && relVar !== 'r' && !relVar.startsWith(':')) {
              cypher = cypher.replace(/RETURN\s+(.+?)(\s+LIMIT|\s*$)/i, `RETURN $1, ${relVar} $2`);
            } else {
              // Use path() to return full paths
              cypher = cypher.replace(/RETURN\s+(.+?)(\s+LIMIT|\s*$)/i, (match, fields, limit) => {
                // Create a path variable if not exists
                if (!cypher.includes('path =')) {
                  // Modify MATCH to capture path
                  const firstMatch = cypher.match(/MATCH\s+/);
                  if (firstMatch) {
                    cypher = cypher.replace(/MATCH\s+/, 'MATCH path = ');
                  }
                }
                return `RETURN ${fields}, path ${limit || ''}`;
              });
            }
          }
        }
      }
    }

    // Fix: If RETURN path but path not defined, either add path = or return nodes directly
    if (cypher.includes('RETURN path') && !cypher.includes('path =')) {
      // Extract all node variables from MATCH clauses (handle comma-separated MATCH)
      const nodeVars = new Set();
      // Match everything from MATCH to RETURN, handling multiple MATCH clauses separated by commas
      const matchPattern = /MATCH\s+([\s\S]+?)(?:\s+WHERE|\s+RETURN)/i;
      const match = cypher.match(matchPattern);
      
      if (match) {
        const matchClause = match[1];
        // Find all node patterns like (v:Video), (t:Transcript), (r:Risk), (p:Problem), etc.
        // Handle both (var:Type) and (var) patterns
        const nodePatterns = matchClause.match(/\((\w+)(?::|\))/g);
        if (nodePatterns) {
          nodePatterns.forEach(pattern => {
            const varName = pattern.match(/\((\w+)/)[1];
            nodeVars.add(varName);
          });
        }
      }
      
      // If we found node variables, return them; otherwise add path =
      if (nodeVars.size > 0) {
        const returnVars = Array.from(nodeVars).join(', ');
        cypher = cypher.replace(/RETURN\s+path(\s+LIMIT|\s*$)/i, `RETURN ${returnVars} $1`);
        console.log(`Fixed: Replaced RETURN path with RETURN ${returnVars}`);
      } else {
        // Add path = to the first MATCH (wrap entire pattern in path)
        cypher = cypher.replace(/MATCH\s+([\s\S]+?)(?:\s+WHERE|\s+RETURN)/i, (fullMatch, pattern) => {
          return `MATCH path = ${pattern.trim()} RETURN`;
        });
        // Remove duplicate RETURN if created
        cypher = cypher.replace(/RETURN\s+RETURN/i, 'RETURN');
        console.log('Fixed: Added path = to MATCH clause');
      }
    }

    // Remove any LIMIT clauses that the LLM might have added
    cypher = cypher.replace(/\s+LIMIT\s+\d+/gi, '');

    console.log('Generated Cypher:', cypher);
    return cypher;
  } catch (error) {
    console.error('Error generating Cypher:', error);
    // Fallback to a simple query
    return 'MATCH (v:Video)-[:HAS_TRANSCRIPT]->(t:Transcript) RETURN v, t';
  }
}

/**
 * Graph Route - Neo4j Cypher queries (scoped to video)
 */
async function graphRoute(state) {
  try {
    const driver = getDriver();
    if (!driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const isScoped = !!state.videoId;
    console.log('Running graph query for:', state.query, isScoped ? `in video: ${state.videoId}` : 'across all videos');

    let neo4jVideoId = null;
    if (isScoped) {
      // Get video UUID from Supabase - Neo4j Video.id is the Supabase UUID, not YouTube video_id
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('id')
        .eq('video_id', state.videoId)
        .single();

      if (videoError || !videoData) {
        throw new Error(`Video not found: ${state.videoId}`);
      }

      // Neo4j Video.id is the Supabase UUID (videoRecordId), not the YouTube video_id
      neo4jVideoId = videoData.id;
    }

    // Generate Cypher query from natural language (scoped to video if videoId provided)
    const cypherQuery = await generateCypherQuery(state.query, state.intent, neo4jVideoId);

    const session = driver.session();
    try {
      const result = await session.run(cypherQuery);
      
      // Transform Neo4j result to JSON
      const nodes = new Map();
      const relationships = [];
      const records = [];

      result.records.forEach(record => {
        const recordData = {};
        record.keys.forEach(key => {
          const value = record.get(key);
          
          if (value && typeof value === 'object') {
            if (value.labels) {
              // It's a node
              const nodeId = value.identity.toString();
              const nodeData = {
                id: nodeId,
                labels: value.labels,
                properties: value.properties
              };
              nodes.set(nodeId, nodeData);
              recordData[key] = nodeData;
            } else if (value.type) {
              // It's a relationship
              const relData = {
                id: value.identity.toString(),
                type: value.type,
                start: value.start.toString(),
                end: value.end.toString(),
                properties: value.properties
              };
              relationships.push(relData);
              recordData[key] = relData;
            } else if (value.segments) {
              // It's a path - extract nodes and relationships from path
              value.segments.forEach(segment => {
                // Extract start node
                if (segment.start && segment.start.labels) {
                  const nodeId = segment.start.identity.toString();
                  const nodeData = {
                    id: nodeId,
                    labels: segment.start.labels,
                    properties: segment.start.properties
                  };
                  nodes.set(nodeId, nodeData);
                }
                // Extract relationship
                if (segment.relationship && segment.relationship.type) {
                  const relData = {
                    id: segment.relationship.identity.toString(),
                    type: segment.relationship.type,
                    start: segment.relationship.start.toString(),
                    end: segment.relationship.end.toString(),
                    properties: segment.relationship.properties
                  };
                  relationships.push(relData);
                }
                // Extract end node
                if (segment.end && segment.end.labels) {
                  const nodeId = segment.end.identity.toString();
                  const nodeData = {
                    id: nodeId,
                    labels: segment.end.labels,
                    properties: segment.end.properties
                  };
                  nodes.set(nodeId, nodeData);
                }
              });
              recordData[key] = value;
            } else {
              recordData[key] = value;
            }
          } else {
            recordData[key] = value;
          }
        });
        records.push(recordData);
      });
      
      // Also infer relationships from MATCH patterns if we have nodes but no relationships
      // This helps when queries only return nodes
      if (relationships.length === 0 && nodes.size > 0 && cypherQuery.includes('MATCH')) {
        // Try to extract relationship types from the query
        const relationshipMatches = cypherQuery.matchAll(/\[r?:\w+\]/g);
        const relTypes = Array.from(relationshipMatches).map(m => m[0].replace(/[\[\]:r]/g, ''));
        
        // If we can't extract relationships from query, try to infer from node connections
        // This is a fallback - ideally queries should return relationships
        console.log('No relationships found in result, but nodes exist. Consider updating query to return relationships.');
      }

      const graphResults = {
        nodes: Array.from(nodes.values()),
        relationships: relationships,
        records: records
      };

      console.log(`Found ${nodes.size} nodes and ${relationships.length} relationships`);

      return {
        ...state,
        graphResults: graphResults
      };
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error in graph route:', error);
    return {
      ...state,
      graphResults: { nodes: [], relationships: [], records: [] },
      graphError: error.message
    };
  }
}

/**
 * Hybrid Route - Combines semantic and graph (scoped to video)
 */
async function hybridRoute(state) {
  try {
    const isScoped = !!state.videoId;
    console.log('Running hybrid query', isScoped ? `for video: ${state.videoId}` : 'across all videos');

    // First get semantic results (already scoped to video)
    const semanticState = await semanticRoute(state);
    
    // Then run graph query (already scoped to video)
    const graphState = await graphRoute(state);

      return {
        ...state,
        semanticResults: semanticState.semanticResults,
      graphResults: graphState.graphResults,
      semanticError: semanticState.semanticError,
      graphError: graphState.graphError
    };
  } catch (error) {
    console.error('Error in hybrid route:', error);
    // Fallback to semantic only
    return await semanticRoute(state);
  }
}

/**
 * Synthesize results into natural language answer
 */
async function synthesizeResults(state) {
  try {
    if (!OPENAI_API_KEY) {
      return {
        ...state,
        summary: 'Unable to generate summary: OpenAI API key not configured'
      };
    }

    const llm = new ChatOpenAI({
      modelName: 'gpt-4o', // GPT-4o has 128k context window
      temperature: 0.3,
      openAIApiKey: OPENAI_API_KEY,
      maxTokens: 2000, // Limit response length
    });

    let context = `User Query: "${state.query}"\n\n`;
    context += `Intent: ${state.intent} (confidence: ${state.intentConfidence})\n\n`;

    if (state.semanticResults && state.semanticResults.length > 0) {
      context += `Semantic Search Results (${state.semanticResults.length} found):\n\n`;
      
      // Truncate chunks to fit within token limit
      // GPT-4o has 128k context, but we'll limit chunks to ~3000 chars each for efficiency
      // Approximate: 1 token ≈ 4 characters, so 3000 chars ≈ 750 tokens per chunk
      // With 3 chunks max, that's ~2250 tokens for content + ~1000 tokens for prompt = ~3250 tokens total (safe)
      const maxCharsPerChunk = 3000;
      
      state.semanticResults.slice(0, 3).forEach((result, idx) => {
        const chunkText = result.excerpt || result.transcript_excerpt || 'No content available';
        // Truncate if too long, but keep full text for display
        const truncatedText = chunkText.length > maxCharsPerChunk 
          ? chunkText.substring(0, maxCharsPerChunk) + '...[truncated]'
          : chunkText;
        
        context += `Result ${idx + 1}:\n`;
        context += `Title: ${result.title || 'Untitled'}\n`;
        context += `Channel: ${result.channel || 'Unknown'}\n`;
        context += `Similarity Score: ${(result.similarity || 0).toFixed(3)}\n`;
        context += `Content:\n${truncatedText}\n\n`;
        context += `---\n\n`;
      });
    }

    if (state.graphResults && state.graphResults.nodes.length > 0) {
      context += `Graph Relationships Found:\n`;
      context += `- Nodes: ${state.graphResults.nodes.length}\n`;
      context += `- Relationships: ${state.graphResults.relationships.length}\n`;
      
      // Show sample relationships
      state.graphResults.relationships.slice(0, 5).forEach(rel => {
        const startNode = state.graphResults.nodes.find(n => n.id === rel.start);
        const endNode = state.graphResults.nodes.find(n => n.id === rel.end);
        context += `  ${startNode?.properties?.name || startNode?.properties?.text || 'Node'} --[${rel.type}]--> ${endNode?.properties?.name || endNode?.properties?.text || 'Node'}\n`;
      });
    }

    const prompt = `${context}

Based on the above search results, provide a clear, concise answer to the user's query.

IMPORTANT INSTRUCTIONS:
1. Read the content carefully - the answer IS in the provided excerpts
2. Directly answer the user's question using information from the search results
3. If the question asks "who", identify the person's name from the content
4. If the question asks "what", explain the concept from the content
5. If the question asks "when", provide the time reference from the content
6. Quote or paraphrase specific parts of the content to support your answer
7. If you cannot find the answer in the provided content, say: "The provided content does not contain enough information to answer this question. Please try rephrasing your query or check if the video has been fully processed."

Provide a natural language summary that:
- Directly answers the user's question
- References specific findings from the results (quote relevant parts)
- Is informative and well-structured
- If graph relationships are shown, explain the connections clearly

Answer:`;

    const response = await llm.invoke(prompt);
    const summary = response.content;

    return {
      ...state,
      summary: summary
    };
  } catch (error) {
    console.error('Error synthesizing results:', error);
    return {
      ...state,
      summary: 'Unable to generate summary due to an error'
    };
  }
}

/**
 * Route decision node - routes to appropriate handler based on intent
 */
async function routeQuery(state) {
  const intent = state.intent || 'semantic';

  if (intent === 'semantic') {
    return await semanticRoute(state);
  } else if (intent === 'graph') {
    return await graphRoute(state);
  } else if (intent === 'hybrid') {
    return await hybridRoute(state);
  } else {
    // Default to semantic
    return await semanticRoute(state);
  }
}

/**
 * Main query router function
 */
export async function queryRouter(userQuery, videoId) {
  try {
    // videoId is now optional - if null/undefined, search across all videos

    const workflow = new StateGraph({
      channels: {
        query: {
          reducer: (x, y) => y ?? x,
        },
        videoId: {
          reducer: (x, y) => y ?? x,
        },
        intent: {
          reducer: (x, y) => y ?? x,
        },
        intentConfidence: {
          reducer: (x, y) => y ?? x,
        },
        intentReasoning: {
          reducer: (x, y) => y ?? x,
        },
        semanticResults: {
          reducer: (x, y) => y ?? x,
        },
        graphResults: {
          reducer: (x, y) => y ?? x,
        },
        summary: {
          reducer: (x, y) => y ?? x,
        },
        semanticError: {
          reducer: (x, y) => y ?? x,
        },
        graphError: {
          reducer: (x, y) => y ?? x,
        },
      },
    })
      .addNode('classifyIntent', classifyIntent)
      .addNode('routeQuery', routeQuery)
      .addNode('synthesizeResults', synthesizeResults)
      .addEdge('classifyIntent', 'routeQuery')
      .addEdge('routeQuery', 'synthesizeResults')
      .addEdge('synthesizeResults', END)
      .setEntryPoint('classifyIntent');

    const app = workflow.compile();
    const result = await app.invoke({ query: userQuery, videoId: videoId });

    return {
      query: result.query,
      intent: result.intent,
      intentConfidence: result.intentConfidence,
      intentReasoning: result.intentReasoning,
      semanticResults: result.semanticResults || [],
      graphResults: result.graphResults || { nodes: [], relationships: [], records: [] },
      summary: result.summary || '',
      errors: {
        semantic: result.semanticError,
        graph: result.graphError
      }
    };
  } catch (error) {
    console.error('Error in query router:', error);
    throw new Error(`Query routing failed: ${error.message}`);
  }
}

