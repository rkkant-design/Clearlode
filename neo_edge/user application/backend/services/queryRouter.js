import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { StateGraph, END } from '@langchain/langgraph';
import dotenv from 'dotenv';
import { supabase, searchAllChunks } from '../db/supabase.js';
import { getDriver } from '../db/neo4j.js';

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
 * Semantic Route - Vector search in Supabase (always across all videos)
 */
async function semanticRoute(state) {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    console.log('Running semantic search for:', state.query, 'across all videos');

    // Generate embedding for user query
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002'
    });

    const queryEmbedding = await embeddings.embedQuery(state.query);

    // Search all chunks across all videos
    const chunks = await searchAllChunks(queryEmbedding, 0.5, 10);

    const results = chunks.map(chunk => ({
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
 * Generate Cypher query from natural language (always across all videos)
 */
async function generateCypherQuery(query, intent) {
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

IMPORTANT: Search across ALL videos in the database. Do NOT scope to a specific video.
You can query any nodes and relationships without video filtering.
Start directly with the entities you need (e.g., MATCH (r:Risk), MATCH (p:Problem), etc.).

Available node types: AgenticDefinition, Benefit, CrossReference, CustomerExperience, Event, Feed, FutureTrend, Industry, IndustryContext, InsightQuote, KeyInsight, Keyword, Metric, NarrativeSegment, Organization, OrgImplication, Persona, Principle, Problem, Provenance, Quote, Risk, SentimentTone, Speaker, Technology, Transcript, Trend, TrustEthics, UseCase, Video

Available relationships (IMPORTANT: Use exact relationship names and directions shown):
- Video -[:HAS_TRANSCRIPT]-> Transcript
- Problem -[:HAS_USE_CASE]-> UseCase (Problem has UseCase - this is the correct relationship name)
- UseCase -[:DELIVERS_BENEFIT]-> Benefit (UseCase delivers Benefit - use DELIVERS_BENEFIT, not DELIVERS)
- UseCase -[:USES]-> Technology OR UseCase -[:USES_TECH]-> Technology (UseCase uses Technology)
- UseCase -[:BELONGS_TO]-> Industry (UseCase belongs to Industry)
- UseCase -[:CO_OCCURS_WITH]-> UseCase (UseCases mentioned together)
- Benefit -[:MEASURED_BY]-> Metric (Benefit measured by Metric)
- Speaker -[:WORKS_AT]-> Organization (Speaker works at Organization)
- Speaker -[:DISCUSSES]-> UseCase (Speaker discusses UseCase)
- Speaker -[:DISCUSSES_PROBLEM]-> Problem (Speaker discusses Problem)
- Speaker -[:MENTIONS_TECHNOLOGY]-> Technology (Speaker mentions Technology)
- Organization -[:USES_TECHNOLOGY]-> Technology (Organization uses Technology)
- Organization -[:ADOPTS_TECHNOLOGY]-> Technology (Organization adopts Technology)
- Organization -[:HAS_USECASE]-> UseCase (Organization has UseCase)
- Organization -[:FACES_RISK]-> Risk (Organization faces Risk)
- Organization -[:MENTIONED_WITH]-> Organization (Organizations mentioned together)
- Technology -[:SOLVES]-> Problem (Technology solves Problem)
- Technology -[:USED_WITH]-> Technology (Technologies used together)
- Problem -[:RELATES_TO_RISK]-> Risk (Problem relates to Risk)
  IMPORTANT: To query "how does risk connect with problems", use: (r:Risk)<-[:RELATES_TO_RISK]-(p:Problem)
  This means: Risk <- Problem (Problem points TO Risk, so to go FROM Risk TO Problem, reverse the direction)
- Industry -[:HAS_PROBLEM]-> Problem (Industry has Problem)
- Industry -[:SEEKS_BENEFIT]-> Benefit (Industry seeks Benefit)

CRITICAL: Pay attention to relationship directions. The arrow direction matters!
Example: "technologies used by organizations" means Organization -[:USES_TECHNOLOGY]-> Technology

CRITICAL: When returning relationships, you MUST capture them in variables:
- CORRECT: MATCH (o:Organization)-[r:USES_TECHNOLOGY]->(t:Technology) RETURN o, r, t
- CORRECT: MATCH path = (o:Organization)-[:USES_TECHNOLOGY]->(t:Technology) RETURN path
- WRONG: MATCH (o:Organization)-[:USES_TECHNOLOGY]->(t:Technology) RETURN o, USES_TECHNOLOGY (cannot return relationship type name)

IMPORTANT: To return relationships, ALWAYS use one of these patterns:
1. Return path (PREFERRED): MATCH path = (a)-[:REL_TYPE]->(b) RETURN path
2. Return with relationship variable: MATCH (a)-[r:REL_TYPE]->(b) RETURN a, r, b
3. Return nodes only: MATCH (a)-[:REL_TYPE]->(b) RETURN a, b (if you don't need the relationship)

PREFERRED: Use pattern 1 (return path) as it includes both nodes and relationships.
Example: MATCH path = (p:Problem)-[:HAS_USE_CASE]->(uc:UseCase) RETURN path
Example: MATCH path = (o:Organization)-[:USES_TECHNOLOGY]->(t:Technology) RETURN path

NEVER return a relationship type name directly (like RETURN USES_TECHNOLOGY). Always use a variable or path.

CRITICAL: When filtering by node properties (name, text, etc.):
- Use case-insensitive matching: WHERE toLower(t.name) CONTAINS toLower('search term')
- OR use: WHERE t.name =~ '(?i).*search.*' (case-insensitive regex)
- Common property names: name, text, title, label (try these if exact match fails)
- For Technology nodes, properties might be: name, text, or label
- Example: WHERE toLower(t.name) CONTAINS toLower('microsoft copilot') OR toLower(t.text) CONTAINS toLower('microsoft copilot')

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

    // Fix: Remove relationship type names from RETURN clause (they're not variables)
    // Pattern: RETURN ..., RELATIONSHIP_TYPE should be removed or replaced
    // Example: RETURN o, USES_TECHNOLOGY should become RETURN o, t (if t exists) or RETURN o, r, t (if relationship captured)
    const returnMatch = cypher.match(/RETURN\s+(.+?)(?:\s+LIMIT|\s*$)/i);
    if (returnMatch) {
      const returnFields = returnMatch[1].trim();
      // Check if any field is a relationship type name (all caps with underscores, not a variable)
      const relationshipTypeNames = [
        'USES_TECHNOLOGY', 'ADOPTS_TECHNOLOGY', 'HAS_USECASE', 'HAS_USE_CASE',
        'DELIVERS_BENEFIT', 'RELATES_TO_RISK', 'CO_OCCURS_WITH', 'BELONGS_TO',
        'HAS_PROBLEM', 'SEEKS_BENEFIT', 'SOLVES', 'USED_WITH', 'FACES_RISK',
        'MENTIONED_WITH', 'WORKS_AT', 'DISCUSSES', 'DISCUSSES_PROBLEM',
        'MENTIONS_TECHNOLOGY', 'MEASURED_BY', 'HAS_TRANSCRIPT'
      ];
      
      const fields = returnFields.split(',').map(f => f.trim());
      const validFields = [];
      const hasPath = returnFields.includes('path');
      
      fields.forEach(field => {
        // If it's a relationship type name (all caps with underscores), skip it
        if (relationshipTypeNames.includes(field.toUpperCase())) {
          console.log(`Removing invalid relationship type name from RETURN: ${field}`);
          return; // Skip this field
        }
        validFields.push(field);
      });
      
      // If we removed fields and don't have path, try to add relationship variable
      if (validFields.length < fields.length && !hasPath) {
        // Try to find relationship variable in MATCH clause
        const matchClause = cypher.match(/MATCH\s+(.+?)(?:\s+WHERE|\s+RETURN)/is);
        if (matchClause) {
          const matchPattern = matchClause[1];
          // Look for relationship variable like [r:USES_TECHNOLOGY] or [:USES_TECHNOLOGY]
          const relVarMatch = matchPattern.match(/\[(\w+):/);
          if (relVarMatch) {
            const relVar = relVarMatch[1];
            if (!validFields.includes(relVar)) {
              validFields.push(relVar);
              console.log(`Added relationship variable to RETURN: ${relVar}`);
            }
          } else {
            // No relationship variable found, try to add path
            if (!cypher.includes('path =')) {
              cypher = cypher.replace(/MATCH\s+/, 'MATCH path = ');
              validFields.push('path');
              console.log('Added path variable to MATCH and RETURN');
            }
          }
        }
      }
      
      if (validFields.length > 0) {
        const newReturn = validFields.join(', ');
        cypher = cypher.replace(/RETURN\s+(.+?)(\s+LIMIT|\s*$)/i, `RETURN ${newReturn} $2`);
      }
    }

    // Fix property matching to be case-insensitive and try multiple property names
    // Pattern: WHERE t.name = 'value' should become WHERE toLower(t.name) CONTAINS toLower('value')
    // This handles case differences and partial matches
    cypher = cypher.replace(/WHERE\s+(\w+)\.(name|text|title|label)\s*=\s*['"]([^'"]+)['"]/gi, (match, nodeVar, prop, value) => {
      // Use case-insensitive CONTAINS for better matching
      return `WHERE toLower(${nodeVar}.${prop}) CONTAINS toLower('${value}')`;
    });
    
    // Also handle WHERE clauses with OR for multiple property checks
    // If we have a Technology node with name filter, also try text property
    const techNameMatch = cypher.match(/WHERE\s+toLower\((\w+):Technology\)\.name\s+CONTAINS\s+toLower\('([^']+)'\)/i);
    if (techNameMatch) {
      const nodeVar = techNameMatch[1];
      const searchTerm = techNameMatch[2];
      // Add alternative property check
      if (!cypher.includes(`${nodeVar}.text`)) {
        cypher = cypher.replace(
          new RegExp(`WHERE\\s+toLower\\(${nodeVar}\\.name\\)\\s+CONTAINS\\s+toLower\\('${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\)`, 'i'),
          `WHERE (toLower(${nodeVar}.name) CONTAINS toLower('${searchTerm}') OR toLower(${nodeVar}.text) CONTAINS toLower('${searchTerm}'))`
        );
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
 * Graph Route - Neo4j Cypher queries (always across all videos)
 */
async function graphRoute(state) {
  try {
    const driver = getDriver();
    if (!driver) {
      throw new Error('Neo4j driver not initialized');
    }

    console.log('Running graph query for:', state.query, 'across all videos');

    // Generate Cypher query from natural language (always across all videos)
    const cypherQuery = await generateCypherQuery(state.query, state.intent);

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

      // If no results found, provide helpful debugging information
      if (nodes.size === 0 && relationships.length === 0) {
        console.log('No results found. Checking available relationships in database...');
        try {
          const relCheck = await session.run(`
            MATCH ()-[r]->()
            WHERE type(r) CONTAINS 'USE' OR type(r) CONTAINS 'PROBLEM' OR type(r) CONTAINS 'BENEFIT' OR type(r) CONTAINS 'ADDRESS'
            RETURN DISTINCT type(r) as relType, count(r) as count
            ORDER BY count DESC
            LIMIT 20
          `);
          const availableRels = relCheck.records.map(r => `${r.get('relType')} (${r.get('count').toNumber()})`);
          console.log('Available relationship types:', availableRels);
          
          // Also check if UseCase and Problem nodes exist
          const nodeCheck = await session.run(`
            MATCH (n)
            WHERE n:UseCase OR n:Problem
            RETURN DISTINCT labels(n) as labels, count(n) as count
            ORDER BY count DESC
            LIMIT 10
          `);
          const availableNodes = nodeCheck.records.map(r => `${r.get('labels')} (${r.get('count').toNumber()})`);
          console.log('Available node types:', availableNodes);
        } catch (debugError) {
          console.log('Could not check database structure:', debugError.message);
        }
      }

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
 * Hybrid Route - Combines semantic and graph (always across all videos)
 */
async function hybridRoute(state) {
  try {
    console.log('Running hybrid query across all videos');

    // First get semantic results
    const semanticState = await semanticRoute(state);
    
    // Then run graph query
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
 * Synthesize results into natural language answer with conversation history
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

    // Add conversation history if available
    if (state.conversationHistory && state.conversationHistory.length > 0) {
      context += `Previous Conversation Context:\n`;
      state.conversationHistory.slice(-10).forEach((msg, idx) => {
        context += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      context += `\n`;
    }

    if (state.semanticResults && state.semanticResults.length > 0) {
      context += `Semantic Search Results (${state.semanticResults.length} found):\n\n`;
      
      const maxCharsPerChunk = 3000;
      
      state.semanticResults.slice(0, 3).forEach((result, idx) => {
        const chunkText = result.excerpt || result.transcript_excerpt || 'No content available';
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

    // Check if this is a casual conversation query (greetings, small talk, etc.)
    const isCasualQuery = !state.semanticResults || state.semanticResults.length === 0;
    const hasNoTechnicalContent = isCasualQuery && (!state.graphResults || state.graphResults.nodes.length === 0);

    let prompt = '';
    
    if (hasNoTechnicalContent) {
      // Friendly casual conversation mode
      prompt = `You are Neo, a friendly and approachable AI assistant. You help users understand enterprise technology videos, but you're also great at having normal, friendly conversations!

User Query: "${state.query}"

${state.conversationHistory && state.conversationHistory.length > 0 ? `Previous Conversation:
${state.conversationHistory.slice(-10).map((msg, idx) => `${msg.role === 'user' ? 'User' : 'Neo'}: ${msg.content}`).join('\n')}

` : ''}

INSTRUCTIONS:
- Be warm, friendly, and conversational - like talking to a helpful colleague
- If the user greets you, greet them back enthusiastically
- If they ask how you are, respond naturally and ask how they're doing
- If they make small talk, engage naturally
- If they ask about your capabilities, explain that you can help with enterprise tech questions
- Use a friendly, approachable tone - avoid being too formal or robotic
- Show personality and be engaging
- If they ask a technical question but we don't have search results yet, let them know you're ready to help once they ask about enterprise tech topics

Respond naturally and conversationally:`;
    } else {
      // Technical query with search results
      const prompt = `${context}

Based on the above search results${state.conversationHistory && state.conversationHistory.length > 0 ? ' and previous conversation context' : ''}, provide a clear, concise answer to the user's query.

IMPORTANT INSTRUCTIONS:
1. Read the content carefully - the answer IS in the provided excerpts
2. Directly answer the user's question using information from the search results
3. If the question asks "who", identify the person's name from the content
4. If the question asks "what", explain the concept from the content
5. If the question asks "when", provide the time reference from the content
6. Quote or paraphrase specific parts of the content to support your answer
7. If the conversation history is provided, use it to understand context and provide coherent follow-up answers
8. If you cannot find the answer in the provided content, say: "The provided content does not contain enough information to answer this question. Please try rephrasing your query or check if the video has been fully processed."

Provide a natural language summary that:
- Directly answers the user's question
- References specific findings from the results (quote relevant parts)
- Is informative and well-structured
- If graph relationships are shown, explain the connections clearly
- Maintains conversation context if previous messages are provided

Answer:`;
    }

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
 * Main query router function with conversation history support
 */
export async function queryRouter(userQuery, conversationHistory = []) {
  try {
    const workflow = new StateGraph({
      channels: {
        query: {
          reducer: (x, y) => y ?? x,
        },
        conversationHistory: {
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
    const result = await app.invoke({ 
      query: userQuery, 
      conversationHistory: conversationHistory 
    });

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

