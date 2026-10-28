import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { supabase } from './supabase.js';

dotenv.config();

// AuraDB connection - use neo4j+s:// or neo4j:// protocol
// IMPORTANT: Username is always 'neo4j', not your email address
const NEO4J_URI = process.env.NEO4J_URI || 'neo4j+s://9a6a883d.databases.neo4j.io';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j'; // Always 'neo4j' for AuraDB
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

if (!NEO4J_PASSWORD) {
  console.warn('Warning: NEO4J_PASSWORD not set in environment variables');
}

let driver = null;

/**
 * Initialize Neo4j driver for AuraDB
 */
export function initNeo4j() {
  if (!NEO4J_PASSWORD) {
    console.warn('Neo4j not configured, graph operations will be skipped');
    return null;
  }

  try {
    console.log('Initializing Neo4j AuraDB connection...');
    console.log('URI:', NEO4J_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
    console.log('User:', NEO4J_USER);

    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
      maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
      maxConnectionPoolSize: 50,
      // No timeout - connection can take as long as needed
    });

    // Verify connection
    driver.verifyConnectivity().then(() => {
      console.log('✓ Neo4j AuraDB connection verified successfully');
    }).catch((error) => {
      console.error('✗ Neo4j AuraDB connection verification failed:', error.message);
      console.error('Please check:');
      console.error('  1. NEO4J_URI is correct (should be neo4j+s://...)');
      console.error('  2. NEO4J_PASSWORD is correct');
      console.error('  3. AuraDB instance is running and not paused');
      console.error('  4. IP whitelist allows your IP (if enabled)');
    });

    return driver;
  } catch (error) {
    console.error('Error initializing Neo4j driver:', error);
    return null;
  }
}

/**
 * Get Neo4j driver instance
 */
export function getDriver() {
  if (!driver) {
    driver = initNeo4j();
  }
  return driver;
}

/**
 * Normalize value to string - handles objects, arrays, and strings
 */
function normalizeToString(value) {
  if (!value) return null;

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.length > 0 ? normalizeToString(value[0]) : null;
    }
    return value.name || value.value || value.title || value.text ||
      value.label || value.description || JSON.stringify(value).substring(0, 100);
  }

  return String(value).trim();
}

/**
 * Slugify a string to create a canonical identifier
 */
function slugify(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Map low-level industry names to high-level industry categories
 * @param {string} industryName - The specific/low-level industry name
 * @returns {string} - High-level industry category
 */
function mapIndustryToCategory(industryName) {
  if (!industryName) return 'General';

  const normalized = String(industryName).toLowerCase().trim();

  // Finance & Banking
  if (normalized.includes('finance') || normalized.includes('financial') ||
    normalized.includes('banking') || normalized.includes('bank') ||
    normalized.includes('accounting') || normalized.includes('account') ||
    normalized.includes('payable') || normalized.includes('receivable') ||
    normalized.includes('treasury') || normalized.includes('cfo') ||
    normalized.includes('fintech') || normalized.includes('payment')) {
    return 'Finance';
  }

  // Healthcare
  if (normalized.includes('healthcare') || normalized.includes('health') ||
    normalized.includes('medical') || normalized.includes('hospital') ||
    normalized.includes('patient') || normalized.includes('clinical') ||
    normalized.includes('pharma') || normalized.includes('pharmaceutical') ||
    normalized.includes('biotech') || normalized.includes('diagnostic')) {
    return 'Healthcare';
  }

  // Retail
  if (normalized.includes('retail') || normalized.includes('store') ||
    normalized.includes('merchandise') || normalized.includes('shopping') ||
    normalized.includes('consumer') || normalized.includes('grocery') ||
    normalized.includes('supermarket') || normalized.includes('e-commerce') ||
    normalized.includes('ecommerce')) {
    return 'Retail';
  }

  // Technology
  if (normalized.includes('technology') || normalized.includes('tech') ||
    normalized.includes('software') || normalized.includes('saas') ||
    normalized.includes('it ') || normalized.includes('information technology') ||
    normalized.includes('cloud') || normalized.includes('ai') ||
    normalized.includes('data') || normalized.includes('digital')) {
    return 'Technology';
  }

  // Manufacturing
  if (normalized.includes('manufacturing') || normalized.includes('factory') ||
    normalized.includes('production') || normalized.includes('industrial') ||
    normalized.includes('supply chain') || normalized.includes('logistics')) {
    return 'Manufacturing';
  }

  // Education
  if (normalized.includes('education') || normalized.includes('school') ||
    normalized.includes('university') || normalized.includes('learning') ||
    normalized.includes('academic') || normalized.includes('student')) {
    return 'Education';
  }

  // Media & Entertainment
  if (normalized.includes('media') || normalized.includes('entertainment') ||
    normalized.includes('broadcast') || normalized.includes('publishing') ||
    normalized.includes('content') || normalized.includes('streaming') ||
    normalized.includes('news') || normalized.includes('journalism')) {
    return 'Media & Entertainment';
  }

  // Telecommunications
  if (normalized.includes('telecom') || normalized.includes('telecommunication') ||
    normalized.includes('wireless') || normalized.includes('mobile network') ||
    normalized.includes('5g') || normalized.includes('4g')) {
    return 'Telecom';
  }

  // Energy
  if (normalized.includes('energy') || normalized.includes('power') ||
    normalized.includes('oil') || normalized.includes('gas') ||
    normalized.includes('renewable') || normalized.includes('solar') ||
    normalized.includes('wind') || normalized.includes('electric')) {
    return 'Energy';
  }

  // Transportation
  if (normalized.includes('transportation') || normalized.includes('transport') ||
    normalized.includes('logistics') || normalized.includes('shipping') ||
    normalized.includes('automotive') || normalized.includes('vehicle') ||
    normalized.includes('aviation') || normalized.includes('airline')) {
    return 'Transportation';
  }

  // Government
  if (normalized.includes('government') || normalized.includes('public sector') ||
    normalized.includes('federal') || normalized.includes('state') ||
    normalized.includes('municipal') || normalized.includes('civic')) {
    return 'Government';
  }

  // Insurance
  if (normalized.includes('insurance') || normalized.includes('underwriting') ||
    normalized.includes('actuarial') || normalized.includes('claims')) {
    return 'Insurance';
  }

  // Real Estate
  if (normalized.includes('real estate') || normalized.includes('property') ||
    normalized.includes('construction') || normalized.includes('building')) {
    return 'Real Estate';
  }

  // Hospitality
  if (normalized.includes('hospitality') || normalized.includes('hotel') ||
    normalized.includes('restaurant') || normalized.includes('tourism') ||
    normalized.includes('travel')) {
    return 'Hospitality';
  }

  // Consulting
  if (normalized.includes('consulting') || normalized.includes('consultant') ||
    normalized.includes('advisory') || normalized.includes('professional services')) {
    return 'Consulting';
  }

  // Legal
  if (normalized.includes('legal') || normalized.includes('law') ||
    normalized.includes('attorney') || normalized.includes('lawyer')) {
    return 'Legal';
  }

  // Aerospace
  if (normalized.includes('aerospace') || normalized.includes('defense') ||
    normalized.includes('military') || normalized.includes('aviation')) {
    return 'Aerospace';
  }

  // Agriculture
  if (normalized.includes('agriculture') || normalized.includes('farming') ||
    normalized.includes('agri') || normalized.includes('crop')) {
    return 'Agriculture';
  }

  // Default to General if no match
  return 'General';
}

/**
 * Generate SHA256 hash for text-based entities
 */
function generateHash(text) {
  if (!text) return null;
  const normalized = String(text).toLowerCase().trim().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Extract speaker name, role, and organization from speaker string
 */
function parseSpeaker(speakerStr) {
  if (!speakerStr) return null;

  const match = speakerStr.match(/^(.+?)\s*\((.+?)\)/);
  if (match) {
    const name = match[1].trim();
    const roleOrg = match[2].trim();
    const parts = roleOrg.split(',').map(s => s.trim());
    return {
      name,
      role: parts[0] || null,
      orgName: parts[1] || null
    };
  }

  return {
    name: speakerStr.trim(),
    role: null,
    orgName: null
  };
}

/**
 * Push graph facts to Neo4j AuraDB from 18-D extraction
 * Updated for new schema: reads from data_18d structure, creates all 23 node types
 */
export async function pushGraphFacts(extraction, videoId, videoUrl, videoRecordId) {
  const driver = getDriver();
  if (!driver) {
    console.warn('Neo4j driver not available, skipping graph push');
    return { success: false, message: 'Neo4j not configured' };
  }

  const session = driver.session();

  try {
    // Test connection first
    await session.run('RETURN 1 as test');
    const metadata = extraction.metadata || {};
    const provenance = extraction.provenance || {};

    // Extract data from 18-D extraction (new structure)
    const speakers = metadata.speakers || [];
    const organizations = metadata.organizations || [];
    const event = metadata.event || null;
    const useCases = extraction.use_cases_applications || [];
    const technologies = extraction.enabling_technologies || [];
    const problemStatement = extraction.problem_statement || {}; // Single object now
    const industries = extraction.industry_context_and_analogues || [];
    const brands = extraction.cross_references_brands_examples || [];
    const risks = extraction.risks_constraints || [];
    const trends = extraction.future_vision_trend_indicators || [];
    const quotes = extraction.quotable_insights || [];
    const impacts = extraction.quantitative_or_qualitative_impact || []; // Combined benefits + metrics
    const agenticDefinition = extraction.core_definition_of_agentic_ai || {};
    const orgImplications = extraction.organizational_implications || {};
    const customerExperience = extraction.customer_experience_dimension || {};
    const trustEthics = extraction.trust_ethics_narrative || {};
    const personas = extraction.personas_roles_context || [];
    const narrativeSegments = extraction.structural_narrative_segments || [];
    const sentimentTone = extraction.sentiment_and_tone || {};
    const feeds = Array.isArray(extraction.feeds) ? extraction.feeds : [];

    // Create transcript ID from videoRecordId (use data_18d.id concept)
    const transcriptId = videoRecordId; // Use video UUID as transcript identifier

    // ============================================
    // Feeds (social updates)
    // ============================================
    for (const feed of feeds) {
      if (!feed) continue;
      const feedId = feed.feed_id || generateHash(`${videoRecordId}-${feed.headline || feed.summary || JSON.stringify(feed)}`);
      if (!feedId) continue;

      await session.run(
        `MERGE (f:Feed {feed_id: $feedId})
         ON CREATE SET f.author_name = $authorName,
                       f.author_handle = $authorHandle,
                       f.author_role = $authorRole,
                       f.vendor = $vendor,
                       f.product = $product,
                       f.impact = $impact,
                       f.headline = $headline,
                       f.summary = $summary,
                       f.highlights = $highlights,
                       f.tags = $tags,
                       f.trending_label = $trendingLabel,
                       f.trending_reason = $trendingReason,
                       f.read_more_url = $readMoreUrl,
                       f.time_ago = $timeAgo,
                       f.timestamp = $timestamp
         ON MATCH SET  f.author_name = $authorName,
                       f.author_handle = $authorHandle,
                       f.author_role = $authorRole,
                       f.vendor = $vendor,
                       f.product = $product,
                       f.impact = $impact,
                       f.headline = $headline,
                       f.summary = $summary,
                       f.highlights = $highlights,
                       f.tags = $tags,
                       f.trending_label = $trendingLabel,
                       f.trending_reason = $trendingReason,
                       f.read_more_url = $readMoreUrl,
                       f.time_ago = $timeAgo,
                       f.timestamp = $timestamp
         WITH f
         MATCH (v:Video {id: $videoId})
         MERGE (v)-[:HAS_FEED]->(f)`,
        {
          feedId,
          authorName: feed.author_name || null,
          authorHandle: feed.author_handle || null,
          authorRole: feed.author_role || null,
          vendor: feed.vendor || null,
          product: feed.product || null,
          impact: feed.impact || null,
          headline: feed.headline || null,
          summary: feed.summary || null,
          highlights: Array.isArray(feed.highlights) ? feed.highlights : [],
          tags: Array.isArray(feed.tags) ? feed.tags : [],
          trendingLabel: feed.trending_label || null,
          trendingReason: feed.trending_reason || null,
          readMoreUrl: feed.read_more_url || videoUrl,
          timeAgo: feed.time_ago || null,
          timestamp: feed.timestamp || null,
          videoId: videoRecordId
        }
      );
    }

    // ============================================
    // 1. Upsert Video & Transcript
    // ============================================
    await session.run(
      `MERGE (v:Video {id: $videoId})
       ON CREATE SET v.video_id = $videoIdStr,
                     v.video_title = $title, 
                     v.video_url = $videoUrl, 
                     v.recorded_at = CASE WHEN $recordedAt IS NOT NULL THEN datetime($recordedAt) ELSE null END,
                     v.duration_min = $durationMin,
                     v.language = $language,
                     v.source_type = $sourceType
       ON MATCH SET v.video_title = $title, 
                    v.video_url = $videoUrl,
                    v.recorded_at = CASE WHEN $recordedAt IS NOT NULL THEN datetime($recordedAt) ELSE null END,
                    v.duration_min = $durationMin,
                    v.source_type = $sourceType
       WITH v
       MERGE (t:Transcript {transcript_id: $transcriptId})
       ON CREATE SET t.excerpt = $excerpt,
                     t.extracted_at = datetime($extractedAt)
       ON MATCH SET t.excerpt = $excerpt,
                    t.extracted_at = datetime($extractedAt)
       MERGE (v)-[:HAS_TRANSCRIPT]->(t)
       RETURN v, t`,
      {
        videoId: videoRecordId,
        videoIdStr: videoId,
        title: metadata.video_title || '',
        videoUrl: videoUrl,
        recordedAt: metadata.recorded_at || null,
        durationMin: metadata.duration_min || 0,
        language: metadata.language || 'en',
        sourceType: metadata.source_type || null,
        transcriptId: transcriptId,
        excerpt: '', // Can be extracted from transcript if needed
        extractedAt: provenance.extracted_at || new Date().toISOString()
      }
    );

    // ============================================
    // 2. Speakers & Organizations
    // ============================================
    for (const speaker of speakers) {
      const speakerStr = normalizeToString(speaker);
      if (!speakerStr) continue;

      const parsed = parseSpeaker(speakerStr);
      if (!parsed || !parsed.name) continue;

      const speakerSlug = slugify(parsed.name);
      const orgSlug = parsed.orgName ? slugify(parsed.orgName) : null;

      // Create Speaker
      await session.run(
        `MERGE (s:Speaker {slug: $speakerSlug})
         ON CREATE SET s.name = $name, 
                       s.role = $role, 
                       s.organization = $orgName
         WITH s
         MATCH (v:Video {id: $videoId})
         MERGE (s)-[:APPEARS_IN]->(v)`,
        {
          speakerSlug,
          name: parsed.name,
          role: parsed.role,
          orgName: parsed.orgName,
          videoId: videoRecordId
        }
      );

      // Create Organization and WORKS_AT relationship
      if (parsed.orgName && orgSlug) {
        await session.run(
          `MERGE (o:Organization {slug: $orgSlug})
           ON CREATE SET o.name = $orgName, o.type = null
           WITH o
           MATCH (s:Speaker {slug: $speakerSlug})
           MERGE (s)-[:WORKS_AT]->(o)`,
          {
            orgSlug,
            orgName: parsed.orgName,
            speakerSlug
          }
        );
      }
    }

    // ============================================
    // 3. Organizations (from metadata and brands)
    // ============================================
    const allOrgs = [...new Set([...organizations, ...brands])];
    for (const org of allOrgs) {
      const orgName = normalizeToString(org);
      if (!orgName) continue;

      const orgSlug = slugify(orgName);

      await session.run(
        `MERGE (o:Organization {slug: $orgSlug})
         ON CREATE SET o.name = $orgName
         WITH o
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:MENTIONED_IN]->(o)`,
        {
          orgSlug,
          orgName,
          transcriptId
        }
      );
    }

    // ============================================
    // 4. Use Cases (new structure: name, description, actions, channels, tools_apis, confidence, quote)
    // ============================================
    for (const useCase of useCases) {
      if (!useCase || typeof useCase !== 'object') continue;

      const ucName = useCase.name || '';
      if (!ucName) continue;

      const ucSlug = slugify(ucName);
      const ucDesc = useCase.description || '';
      const ucActions = Array.isArray(useCase.actions) ? useCase.actions : [];
      const ucChannels = Array.isArray(useCase.channels) ? useCase.channels : [];
      const ucTools = Array.isArray(useCase.tools_apis) ? useCase.tools_apis : [];
      const ucConfidence = useCase.confidence || 0.0;
      const ucQuote = useCase.quote || '';

      await session.run(
        `MERGE (u:UseCase {slug: $ucSlug})
         ON CREATE SET u.name = $ucName, 
                       u.description = $ucDesc,
                       u.actions = $actions,
                       u.channels = $channels,
                       u.tools_apis = $tools,
                       u.confidence = $confidence,
                       u.quote = $quote
         WITH u
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:HAS_USECASE]->(u)`,
        {
          ucSlug,
          ucName,
          ucDesc,
          actions: ucActions,
          channels: ucChannels,
          tools: ucTools,
          confidence: ucConfidence,
          quote: ucQuote,
          transcriptId
        }
      );
    }

    // ============================================
    // 5. Problem (now single object: label, text, confidence, quote)
    // ============================================
    if (problemStatement && problemStatement.label) {
      const problemLabel = problemStatement.label || '';
      const problemText = problemStatement.text || '';
      const problemConfidence = problemStatement.confidence || 0.0;
      const problemQuote = problemStatement.quote || '';

      if (problemLabel || problemText) {
        const problemHash = generateHash(problemLabel + problemText);

        await session.run(
          `MERGE (p:Problem {hash: $problemHash})
           ON CREATE SET p.label = $label,
                         p.text = $text,
                         p.confidence = $confidence,
                         p.quote = $quote
           WITH p
           MATCH (t:Transcript {transcript_id: $transcriptId})
           MERGE (t)-[:HAS_PROBLEM]->(p)`,
          {
            problemHash,
            label: problemLabel,
            text: problemText,
            confidence: problemConfidence,
            quote: problemQuote,
            transcriptId
          }
        );

        // Link Problem to UseCases
        for (const useCase of useCases) {
          if (!useCase || typeof useCase !== 'object') continue;
          const ucName = useCase.name || '';
          if (!ucName) continue;
          const ucSlug = slugify(ucName);

          await session.run(
            `MATCH (u:UseCase {slug: $ucSlug})
             MATCH (p:Problem {hash: $problemHash})
             MERGE (p)-[:HAS_USE_CASE]->(u)`,
            {
              ucSlug,
              problemHash
            }
          );
        }
      }
    }

    // ============================================
    // 6. Benefits & Metrics (from quantitative_or_qualitative_impact)
    // Each impact item creates both Benefit and Metric nodes
    // ============================================
    for (const impact of impacts) {
      if (!impact || typeof impact !== 'object') continue;

      const benefitLabel = impact.benefit_label || '';
      const benefitText = impact.benefit_text || '';
      const metricLabel = impact.metric_label || '';
      const metricName = impact.metric_name || '';
      const valueOrDesc = impact.value_or_description || '';
      const unit = impact.unit || '';
      const timeframe = impact.timeframe || '';
      const confidence = impact.confidence || 0.0;
      const quote = impact.quote || '';

      if (!benefitLabel && !benefitText) continue;

      // Create Benefit node
      const benefitHash = generateHash(benefitLabel + benefitText);
      await session.run(
        `MERGE (b:Benefit {hash: $benefitHash})
         ON CREATE SET b.label = $label,
                       b.text = $text,
                       b.confidence = $confidence,
                       b.quote = $quote
         WITH b
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:HAS_BENEFIT]->(b)`,
        {
          benefitHash,
          label: benefitLabel,
          text: benefitText,
          confidence,
          quote,
          transcriptId
        }
      );

      // Link Benefits to UseCases
      for (const useCase of useCases) {
        if (!useCase || typeof useCase !== 'object') continue;
        const ucName = useCase.name || '';
        if (!ucName) continue;
        const ucSlug = slugify(ucName);

        await session.run(
          `MATCH (u:UseCase {slug: $ucSlug})
           MATCH (b:Benefit {hash: $benefitHash})
           MERGE (u)-[:DELIVERS_BENEFIT]->(b)`,
          {
            ucSlug,
            benefitHash
          }
        );
      }

      // Create Metric node if metric data exists
      if (metricLabel || metricName || valueOrDesc) {
        const metricHash = generateHash(metricLabel + metricName + valueOrDesc);
        await session.run(
          `MERGE (m:Metric {hash: $metricHash})
           ON CREATE SET m.label = $label,
                         m.metric_name = $metricName,
                         m.value_or_description = $valueDesc,
                         m.unit = $unit,
                         m.timeframe = $timeframe,
                         m.confidence = $confidence,
                         m.quote = $quote
           WITH m
           MATCH (b:Benefit {hash: $benefitHash})
           MERGE (b)-[:MEASURED_BY]->(m)`,
          {
            metricHash,
            label: metricLabel,
            metricName,
            valueDesc: valueOrDesc,
            unit,
            timeframe,
            confidence,
            quote,
            benefitHash
          }
        );
      }
    }

    // ============================================
    // 7. Technologies
    // ============================================
    for (const tech of technologies) {
      const techName = normalizeToString(tech);
      if (!techName) continue;

      const techSlug = slugify(techName);

      await session.run(
        `MERGE (tech:Technology {slug: $techSlug})
         ON CREATE SET tech.text = $techName
         WITH tech
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:USES_TECH]->(tech)`,
        {
          techSlug,
          techName,
          transcriptId
        }
      );

      // Link Technologies to UseCases
      for (const useCase of useCases) {
        const ucName = normalizeToString(useCase);
        if (!ucName) continue;
        const ucSlug = slugify(ucName);

        await session.run(
          `MATCH (u:UseCase {slug: $ucSlug})
           MATCH (tech:Technology {slug: $techSlug})
           MERGE (u)-[:USES]->(tech)`,
          {
            ucSlug,
            techSlug
          }
        );
      }
    }

    // ============================================
    // 8. AgenticDefinition (core_definition_of_agentic_ai)
    // ============================================
    if (agenticDefinition && (agenticDefinition.text || agenticDefinition.quote)) {
      const adText = agenticDefinition.text || '';
      const adConfidence = agenticDefinition.confidence || 0.0;
      const adQuote = agenticDefinition.quote || '';

      if (adText || adQuote) {
        const adHash = generateHash(adText + adQuote);
        await session.run(
          `MERGE (ad:AgenticDefinition {hash: $hash})
           ON CREATE SET ad.text = $text,
                         ad.confidence = $confidence,
                         ad.quote = $quote
           WITH ad
           MATCH (t:Transcript {transcript_id: $transcriptId})
           MERGE (t)-[:DEFINES_AGENTIC_AI]->(ad)`,
          {
            hash: adHash,
            text: adText,
            confidence: adConfidence,
            quote: adQuote,
            transcriptId
          }
        );
      }
    }

    // ============================================
    // 9. Principles (legacy - removed, using AgenticDefinition instead)
    // ============================================
    // Principles are now handled via AgenticDefinition node above
    // Keeping this section commented out for reference
    /*
    const principles = null; // Not in new schema
    if (principles && Object.keys(principles).length > 0) {
      const principleText = typeof principles === 'string' 
        ? principles 
        : JSON.stringify(principles);
      
      if (principleText && principleText.trim()) {
        const principleName = typeof principles === 'string' 
          ? principles.substring(0, 100) 
          : (principles.name || 'Agentic AI Principle');
        const prSlug = slugify(principleName);
        const prDesc = typeof principles === 'string' ? principles : (principles.description || principleText);

        await session.run(
          `MERGE (p:Principle {slug: $prSlug})
           ON CREATE SET p.name = $prName,
                         p.category = $prCategory,
                         p.description = $prDesc
           WITH p
           MATCH (t:Transcript {transcript_id: $transcriptId})
           MERGE (t)-[:MENTIONS_PRINCIPLE]->(p)`,
          {
            prSlug,
            prName: principleName,
            prCategory: 'Agentic AI',
            prDesc,
            transcriptId
          }
        );

        // Link Principles to UseCases
        for (const useCase of useCases) {
          const ucName = normalizeToString(useCase);
          if (!ucName) continue;
          const ucSlug = slugify(ucName);

          await session.run(
            `MATCH (u:UseCase {slug: $ucSlug})
             MATCH (p:Principle {slug: $prSlug})
             MERGE (u)-[:BASED_ON]->(p)`,
            {
              ucSlug,
              prSlug
            }
          );
        }
      }
    }
    */

    // ============================================
    // 9. Industries
    // ============================================
    for (const industry of industries) {
      const industryName = normalizeToString(industry);
      if (!industryName) continue;

      const industrySlug = slugify(industryName);

      const industryCategory = mapIndustryToCategory(industryName);

      await session.run(
        `MERGE (i:Industry {slug: $industrySlug})
         ON CREATE SET i.name = $industryName, 
                       i.category = $industryCategory,
                       i.maturity_level = null
         ON MATCH SET i.category = $industryCategory
         WITH i
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:HAS_INDUSTRY_CONTEXT]->(i)`,
        {
          industrySlug,
          industryName,
          industryCategory,
          transcriptId
        }
      );

      // Link Industries to UseCases
      for (const useCase of useCases) {
        const ucName = normalizeToString(useCase);
        if (!ucName) continue;
        const ucSlug = slugify(ucName);

        await session.run(
          `MATCH (u:UseCase {slug: $ucSlug})
           MATCH (i:Industry {slug: $industrySlug})
           MERGE (u)-[:BELONGS_TO]->(i)`,
          {
            ucSlug,
            industrySlug
          }
        );
      }
    }

    // ============================================
    // 10. Risks
    // ============================================
    for (const risk of risks) {
      const riskName = normalizeToString(risk);
      if (!riskName) continue;

      const riskSlug = slugify(riskName);
      const riskDesc = typeof risk === 'object' ? (risk.description || riskName) : riskName;

      await session.run(
        `MERGE (r:Risk {slug: $riskSlug})
         ON CREATE SET r.name = $riskName,
                       r.description = $riskDesc
         WITH r
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:HAS_RISK]->(r)`,
        {
          riskSlug,
          riskName,
          riskDesc,
          transcriptId
        }
      );

      // Link Risks to UseCases
      for (const useCase of useCases) {
        const ucName = normalizeToString(useCase);
        if (!ucName) continue;
        const ucSlug = slugify(ucName);

        await session.run(
          `MATCH (u:UseCase {slug: $ucSlug})
           MATCH (r:Risk {slug: $riskSlug})
           MERGE (u)-[:HAS_RISK]->(r)`,
          {
            ucSlug,
            riskSlug
          }
        );
      }
    }

    // ============================================
    // 11. Key Words
    // ============================================
    let keyWords = extraction.key_words || [];
    if (typeof keyWords === 'string') keyWords = [keyWords];

    for (const word of keyWords) {
      const wordStr = normalizeToString(word);
      if (!wordStr) continue;

      const wordSlug = slugify(wordStr);

      await session.run(
        `MERGE (k:Keyword {slug: $wordSlug})
         ON CREATE SET k.word = $wordStr
         WITH k
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:HAS_KEYWORD]->(k)`,
        {
          wordSlug,
          wordStr,
          transcriptId
        }
      );
    }

    // ============================================
    // 12. Key Insights
    // ============================================
    let keyInsights = extraction.key_insight || [];
    if (typeof keyInsights === 'string') keyInsights = [keyInsights];

    for (const insight of keyInsights) {
      const insightText = normalizeToString(insight);
      if (!insightText) continue;

      const insightHash = generateHash(insightText);

      await session.run(
        `MERGE (i:KeyInsight {hash: $insightHash})
         ON CREATE SET i.text = $insightText
         WITH i
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:HAS_INSIGHT]->(i)`,
        {
          insightHash,
          insightText,
          transcriptId
        }
      );
    }


    // Trends are handled later in section 16 (FutureTrend)

    // ============================================
    // 12. InsightQuote (from quotable_insights)
    // ============================================
    for (const quote of quotes) {
      // Handle both string and object formats
      let quoteText, quoteConfidence, quoteQuote;
      if (typeof quote === 'object' && quote !== null) {
        quoteText = quote.text || normalizeToString(quote);
        quoteConfidence = quote.confidence || 0.0;
        quoteQuote = quote.quote || quoteText;
      } else {
        quoteText = normalizeToString(quote);
        quoteConfidence = 0.0;
        quoteQuote = quoteText;
      }

      if (!quoteText) continue;

      // Generate hash for quote
      const quoteHash = generateHash(quoteText);
      const quoteSpeaker = speakers.length > 0 ? normalizeToString(speakers[0]) : null;

      await session.run(
        `MERGE (iq:InsightQuote {hash: $quoteHash})
         ON CREATE SET iq.text = $quoteText,
                       iq.speaker = $quoteSpeaker,
                       iq.confidence = $confidence,
                       iq.quote = $quote
         WITH iq
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:HAS_QUOTE]->(iq)`,
        {
          quoteHash,
          quoteText,
          quoteSpeaker,
          confidence: quoteConfidence,
          quote: quoteQuote,
          transcriptId
        }
      );
    }

    // ============================================
    // 13. COMPREHENSIVE RELATIONSHIP MATCHING
    // Automatically creates ALL possible relationships
    // ============================================
    console.log('Agent 5: Creating comprehensive relationships...');

    // 13.1 Co-occurrence Relationships (entities mentioned together)
    const useCaseSlugs = useCases
      .map(uc => slugify(normalizeToString(uc)))
      .filter(slug => slug);
    for (let i = 0; i < useCaseSlugs.length; i++) {
      for (let j = i + 1; j < useCaseSlugs.length; j++) {
        await session.run(
          `MATCH (u1:UseCase {slug: $slug1})
           MATCH (u2:UseCase {slug: $slug2})
           MERGE (u1)-[r:CO_OCCURS_WITH]->(u2)
           ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
           ON MATCH SET r.count = r.count + 1`,
          { slug1: useCaseSlugs[i], slug2: useCaseSlugs[j], transcriptId }
        );
      }
    }

    const techSlugs = technologies
      .map(t => slugify(normalizeToString(t)))
      .filter(slug => slug);
    for (let i = 0; i < techSlugs.length; i++) {
      for (let j = i + 1; j < techSlugs.length; j++) {
        await session.run(
          `MATCH (t1:Technology {slug: $slug1})
           MATCH (t2:Technology {slug: $slug2})
           MERGE (t1)-[r:USED_WITH]->(t2)
           ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
           ON MATCH SET r.count = r.count + 1`,
          { slug1: techSlugs[i], slug2: techSlugs[j], transcriptId }
        );
      }
    }

    const orgSlugs = allOrgs
      .map(org => slugify(normalizeToString(org)))
      .filter(slug => slug);
    for (let i = 0; i < orgSlugs.length; i++) {
      for (let j = i + 1; j < orgSlugs.length; j++) {
        await session.run(
          `MATCH (o1:Organization {slug: $slug1})
           MATCH (o2:Organization {slug: $slug2})
           MERGE (o1)-[r:MENTIONED_WITH]->(o2)
           ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
           ON MATCH SET r.count = r.count + 1`,
          { slug1: orgSlugs[i], slug2: orgSlugs[j], transcriptId }
        );
      }
    }

    // 13.2 Cross-Entity Relationships
    // Technologies solve Problems
    for (const tech of technologies) {
      const techSlug = slugify(normalizeToString(tech));
      if (problemStatement && problemStatement.label) {
        const problemHash = generateHash(problemStatement.label + problemStatement.text);
        await session.run(
          `MATCH (tech:Technology {slug: $techSlug})
           MATCH (p:Problem {hash: $problemHash})
           MERGE (tech)-[r:SOLVES]->(p)
           ON CREATE SET r.sourceTranscriptId = $transcriptId, r.confidence = 0.8`,
          { techSlug, problemHash, transcriptId }
        );
      }
    }

    // Organizations use Technologies
    for (const org of allOrgs) {
      const orgSlug = slugify(normalizeToString(org));
      for (const tech of technologies) {
        const techSlug = slugify(normalizeToString(tech));
        await session.run(
          `MATCH (o:Organization {slug: $orgSlug})
           MATCH (tech:Technology {slug: $techSlug})
           MERGE (o)-[r:USES_TECHNOLOGY]->(tech)
           ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
           ON MATCH SET r.count = r.count + 1`,
          { orgSlug, techSlug, transcriptId }
        );
      }
    }

    // Speakers discuss UseCases
    for (const speaker of speakers) {
      const parsed = parseSpeaker(normalizeToString(speaker));
      if (!parsed || !parsed.name) continue;
      const speakerSlug = slugify(parsed.name);
      for (const useCase of useCases) {
        const ucSlug = slugify(normalizeToString(useCase));
        await session.run(
          `MATCH (s:Speaker {slug: $speakerSlug})
           MATCH (u:UseCase {slug: $ucSlug})
           MERGE (s)-[r:DISCUSSES]->(u)
           ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
           ON MATCH SET r.count = r.count + 1`,
          { speakerSlug, ucSlug, transcriptId }
        );
      }
    }

    // Organizations adopt Technologies
    for (const org of allOrgs) {
      const orgSlug = slugify(normalizeToString(org));
      for (const tech of technologies) {
        const techSlug = slugify(normalizeToString(tech));
        await session.run(
          `MATCH (o:Organization {slug: $orgSlug})
           MATCH (tech:Technology {slug: $techSlug})
           MERGE (o)-[r:ADOPTS_TECHNOLOGY]->(tech)
           ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
           ON MATCH SET r.count = r.count + 1`,
          { orgSlug, techSlug, transcriptId }
        );
      }
    }

    // Technologies enable Benefits
    for (const tech of technologies) {
      const techSlug = slugify(normalizeToString(tech));
      for (const impact of impacts) {
        const benefitHash = generateHash(normalizeToString(impact));
        await session.run(
          `MATCH (tech:Technology {slug: $techSlug})
           MATCH (b:Benefit {hash: $benefitHash})
           MERGE (tech)-[r:ENABLES]->(b)
           ON CREATE SET r.sourceTranscriptId = $transcriptId, r.confidence = 0.8`,
          { techSlug, benefitHash, transcriptId }
        );
      }
    }

    // Industries use Technologies
    for (const industry of industries) {
      const industrySlug = slugify(normalizeToString(industry));
      for (const tech of technologies) {
        const techSlug = slugify(normalizeToString(tech));
        await session.run(
          `MATCH (i:Industry {slug: $industrySlug})
           MATCH (tech:Technology {slug: $techSlug})
           MERGE (i)-[r:USES_TECHNOLOGY]->(tech)
           ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
           ON MATCH SET r.count = r.count + 1`,
          { industrySlug, techSlug, transcriptId }
        );
      }
    }

    // Problems relate to Risks
    if (problemStatement && problemStatement.label) {
      const problemHash = generateHash(problemStatement.label + problemStatement.text);
      for (const risk of risks) {
        const riskSlug = slugify(normalizeToString(risk));
        await session.run(
          `MATCH (p:Problem {hash: $problemHash})
           MATCH (r:Risk {slug: $riskSlug})
           MERGE (p)-[rel:RELATES_TO_RISK]->(r)
           ON CREATE SET rel.sourceTranscriptId = $transcriptId`,
          { problemHash, riskSlug, transcriptId }
        );
      }
    }

    // 13.3 Quote-to-Entity Relationships
    for (const quote of quotes) {
      const quoteText = normalizeToString(quote);
      if (!quoteText) continue;

      // Match quote by text (since we don't have the UUID here)
      // Link quotes to UseCases they mention
      for (const useCase of useCases) {
        const ucName = normalizeToString(useCase);
        if (ucName && quoteText.toLowerCase().includes(ucName.toLowerCase().substring(0, Math.min(20, ucName.length)))) {
          const ucSlug = slugify(ucName);
          await session.run(
            `MATCH (q:Quote)
             WHERE q.text CONTAINS $quoteText
             MATCH (u:UseCase {slug: $ucSlug})
             MERGE (q)-[:REFERENCES]->(u)`,
            { quoteText: quoteText.substring(0, 50), ucSlug }
          );
        }
      }

      // Link quotes to Technologies they mention
      for (const tech of technologies) {
        const techName = normalizeToString(tech);
        if (techName && quoteText.toLowerCase().includes(techName.toLowerCase().substring(0, Math.min(20, techName.length)))) {
          const techSlug = slugify(techName);
          await session.run(
            `MATCH (q:Quote)
             WHERE q.text CONTAINS $quoteText
             MATCH (tech:Technology {slug: $techSlug})
             MERGE (q)-[:REFERENCES]->(tech)`,
            { quoteText: quoteText.substring(0, 50), techSlug }
          );
        }
      }

      // Link quotes to Organizations they mention
      for (const org of allOrgs) {
        const orgName = normalizeToString(org);
        if (orgName && quoteText.toLowerCase().includes(orgName.toLowerCase().substring(0, Math.min(20, orgName.length)))) {
          const orgSlug = slugify(orgName);
          await session.run(
            `MATCH (q:Quote)
             WHERE q.text CONTAINS $quoteText
             MATCH (o:Organization {slug: $orgSlug})
             MERGE (q)-[:REFERENCES]->(o)`,
            { quoteText: quoteText.substring(0, 50), orgSlug }
          );
        }
      }
    }

    // 13.4 Speaker-to-Entity Relationships
    for (const speaker of speakers) {
      const parsed = parseSpeaker(normalizeToString(speaker));
      if (!parsed || !parsed.name) continue;
      const speakerSlug = slugify(parsed.name);

      // Speakers mention Technologies
      for (const tech of technologies) {
        const techSlug = slugify(normalizeToString(tech));
        await session.run(
          `MATCH (s:Speaker {slug: $speakerSlug})
           MATCH (tech:Technology {slug: $techSlug})
           MERGE (s)-[r:MENTIONS_TECHNOLOGY]->(tech)
           ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
           ON MATCH SET r.count = r.count + 1`,
          { speakerSlug, techSlug, transcriptId }
        );
      }

      // Speakers discuss Problems
      if (problemStatement && problemStatement.label) {
        const problemHash = generateHash(problemStatement.label + problemStatement.text);
        await session.run(
          `MATCH (s:Speaker {slug: $speakerSlug})
           MATCH (p:Problem {hash: $problemHash})
           MERGE (s)-[r:DISCUSSES_PROBLEM]->(p)
           ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
           ON MATCH SET r.count = r.count + 1`,
          { speakerSlug, problemHash, transcriptId }
        );
      }
    }

    // 13.5 Organization-to-Entity Relationships
    for (const org of allOrgs) {
      const orgSlug = slugify(normalizeToString(org));

      // Organizations have UseCases
      for (const useCase of useCases) {
        const ucSlug = slugify(normalizeToString(useCase));
        await session.run(
          `MATCH (o:Organization {slug: $orgSlug})
           MATCH (u:UseCase {slug: $ucSlug})
           MERGE (o)-[r:HAS_USECASE]->(u)
           ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
           ON MATCH SET r.count = r.count + 1`,
          { orgSlug, ucSlug, transcriptId }
        );
      }

      // Organizations face Risks
      for (const risk of risks) {
        const riskSlug = slugify(normalizeToString(risk));
        await session.run(
          `MATCH (o:Organization {slug: $orgSlug})
           MATCH (r:Risk {slug: $riskSlug})
           MERGE (o)-[:FACES_RISK]->(r)
           ON CREATE SET r.sourceTranscriptId = $transcriptId`,
          { orgSlug, riskSlug, transcriptId }
        );
      }
    }

    // 13.6 Industry-to-Entity Relationships
    for (const industry of industries) {
      const industrySlug = slugify(normalizeToString(industry));

      // Industries have Problems
      if (problemStatement && problemStatement.label) {
        const problemHash = generateHash(problemStatement.label + problemStatement.text);
        await session.run(
          `MATCH (i:Industry {slug: $industrySlug})
           MATCH (p:Problem {hash: $problemHash})
           MERGE (i)-[r:HAS_PROBLEM]->(p)
           ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
           ON MATCH SET r.count = r.count + 1`,
          { industrySlug, problemHash, transcriptId }
        );
      }

      // Industries have Benefits
      for (const impact of impacts) {
        if (!impact || typeof impact !== 'object') continue;
        const benefitHash = generateHash((impact.benefit_label || '') + (impact.benefit_text || ''));
        await session.run(
          `MATCH (i:Industry {slug: $industrySlug})
           MATCH (b:Benefit {hash: $benefitHash})
           MERGE (i)-[r:SEEKS_BENEFIT]->(b)
           ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
           ON MATCH SET r.count = r.count + 1`,
          { industrySlug, benefitHash, transcriptId }
        );
      }
    }

    // 13.7 Trend-to-Entity Relationships
    // Trends are handled in section 16 (FutureTrend) - relationships created there

    // 13.8 Principle-to-Entity Relationships
    // Principles removed - using AgenticDefinition instead
    // (commented out - not in new schema)

    // ============================================
    // 11. Event
    // ============================================
    if (event) {
      const eventName = normalizeToString(event);
      if (eventName) {
        const eventSlug = slugify(eventName);
        await session.run(
          `MERGE (e:Event {slug: $eventSlug})
           ON CREATE SET e.name = $eventName
           WITH e
           MATCH (v:Video {id: $videoId})
           MERGE (e)-[:FEATURES]->(v)`,
          {
            eventSlug,
            eventName,
            videoId: videoRecordId
          }
        );
      }
    }

    // ============================================
    // 12. Personas
    // ============================================
    for (const persona of personas) {
      if (!persona || typeof persona !== 'object') continue;
      const personaName = persona.name || normalizeToString(persona);
      const personaDesc = persona.description || '';
      if (!personaName) continue;

      const personaSlug = slugify(personaName);
      await session.run(
        `MERGE (p:Persona {slug: $personaSlug})
         ON CREATE SET p.name = $name,
                       p.description = $description
         WITH p
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:HAS_PERSONA]->(p)`,
        {
          personaSlug,
          name: personaName,
          description: personaDesc,
          transcriptId
        }
      );
    }

    // ============================================
    // 13. OrgImplication
    // ============================================
    if (orgImplications && orgImplications.text) {
      const oiText = orgImplications.text || '';
      const oiConfidence = orgImplications.confidence || 0.0;
      const oiQuote = orgImplications.quote || '';

      if (oiText) {
        const oiHash = generateHash(oiText);
        await session.run(
          `MERGE (oi:OrgImplication {hash: $hash})
           ON CREATE SET oi.text = $text,
                         oi.confidence = $confidence,
                         oi.quote = $quote
           WITH oi
           MATCH (t:Transcript {transcript_id: $transcriptId})
           MERGE (t)-[:HAS_ORG_IMPLICATION]->(oi)`,
          {
            hash: oiHash,
            text: oiText,
            confidence: oiConfidence,
            quote: oiQuote,
            transcriptId
          }
        );
      }
    }

    // ============================================
    // 14. CustomerExperience
    // ============================================
    if (customerExperience && customerExperience.text) {
      const ceText = customerExperience.text || '';
      const ceConfidence = customerExperience.confidence || 0.0;
      const ceQuote = customerExperience.quote || '';

      if (ceText) {
        const ceHash = generateHash(ceText);
        await session.run(
          `MERGE (ce:CustomerExperience {hash: $hash})
           ON CREATE SET ce.text = $text,
                         ce.confidence = $confidence,
                         ce.quote = $quote
           WITH ce
           MATCH (t:Transcript {transcript_id: $transcriptId})
           MERGE (t)-[:HAS_CUSTOMER_EXPERIENCE]->(ce)`,
          {
            hash: ceHash,
            text: ceText,
            confidence: ceConfidence,
            quote: ceQuote,
            transcriptId
          }
        );
      }
    }

    // ============================================
    // 15. TrustEthics
    // ============================================
    if (trustEthics && trustEthics.text) {
      const teText = trustEthics.text || '';
      const teConfidence = trustEthics.confidence || 0.0;
      const teQuote = trustEthics.quote || '';

      if (teText) {
        const teHash = generateHash(teText);
        await session.run(
          `MERGE (te:TrustEthics {hash: $hash})
           ON CREATE SET te.text = $text,
                         te.confidence = $confidence,
                         te.quote = $quote
           WITH te
           MATCH (t:Transcript {transcript_id: $transcriptId})
           MERGE (t)-[:HAS_TRUST_ETHICS]->(te)`,
          {
            hash: teHash,
            text: teText,
            confidence: teConfidence,
            quote: teQuote,
            transcriptId
          }
        );
      }
    }

    // ============================================
    // 16. FutureTrend
    // ============================================
    for (const trend of trends) {
      const trendText = normalizeToString(trend);
      if (!trendText) continue;

      const trendSlug = slugify(trendText);
      await session.run(
        `MERGE (ft:FutureTrend {slug: $trendSlug})
         ON CREATE SET ft.text = $trendText
         WITH ft
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:HAS_FUTURE_TREND]->(ft)`,
        {
          trendSlug,
          trendText,
          transcriptId
        }
      );
    }

    // ============================================
    // 17. InsightQuote
    // ============================================
    for (const quote of quotes) {
      const quoteText = normalizeToString(quote);
      if (!quoteText) continue;

      const quoteHash = generateHash(quoteText);
      await session.run(
        `MERGE (iq:InsightQuote {hash: $quoteHash})
         ON CREATE SET iq.text = $quoteText
         WITH iq
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:HAS_QUOTE]->(iq)`,
        {
          quoteHash,
          quoteText,
          transcriptId
        }
      );
    }

    // ============================================
    // 18. CrossReference
    // ============================================
    for (const ref of brands) {
      const refText = normalizeToString(ref);
      if (!refText) continue;

      const refSlug = slugify(refText);
      await session.run(
        `MERGE (cr:CrossReference {slug: $refSlug})
         ON CREATE SET cr.text = $refText
         WITH cr
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:HAS_REFERENCE]->(cr)`,
        {
          refSlug,
          refText,
          transcriptId
        }
      );
    }

    // ============================================
    // 19. NarrativeSegment
    // ============================================
    for (const segment of narrativeSegments) {
      const segmentText = normalizeToString(segment);
      if (!segmentText) continue;

      const segmentHash = generateHash(segmentText);
      await session.run(
        `MERGE (ns:NarrativeSegment {hash: $segmentHash})
         ON CREATE SET ns.text = $segmentText
         WITH ns
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:HAS_SEGMENT]->(ns)`,
        {
          segmentHash,
          segmentText,
          transcriptId
        }
      );
    }

    // ============================================
    // 20. SentimentTone
    // ============================================
    if (sentimentTone && (sentimentTone.sentiment || sentimentTone.description)) {
      const stSentiment = sentimentTone.sentiment || 'neutral';
      const stDescription = sentimentTone.description || '';
      const stConfidence = sentimentTone.confidence || 0.0;

      if (stSentiment || stDescription) {
        const stHash = generateHash(stSentiment + stDescription);
        await session.run(
          `MERGE (st:SentimentTone {hash: $hash})
           ON CREATE SET st.sentiment = $sentiment,
                         st.description = $description,
                         st.confidence = $confidence
           WITH st
           MATCH (t:Transcript {transcript_id: $transcriptId})
           MERGE (t)-[:HAS_SENTIMENT]->(st)`,
          {
            hash: stHash,
            sentiment: stSentiment,
            description: stDescription,
            confidence: stConfidence,
            transcriptId
          }
        );
      }
    }

    // ============================================
    // 21. Provenance
    // ============================================
    if (provenance) {
      const provVideoId = provenance.video_id || videoId;
      const provSnippets = Array.isArray(provenance.snippets) ? provenance.snippets : [];
      const provExtractedAt = provenance.extracted_at || new Date().toISOString();

      const provHash = generateHash(provVideoId + provExtractedAt);
      await session.run(
        `MERGE (prov:Provenance {hash: $hash})
         ON CREATE SET prov.video_id = $videoId,
                       prov.snippets = $snippets,
                       prov.extracted_at = datetime($extractedAt)
         WITH prov
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:HAS_PROVENANCE]->(prov)`,
        {
          hash: provHash,
          videoId: provVideoId,
          snippets: provSnippets,
          extractedAt: provExtractedAt,
          transcriptId
        }
      );
    }

    // ============================================
    // 22. IndustryContext (from industry_context_and_analogues)
    // ============================================
    for (const industry of industries) {
      const industryText = normalizeToString(industry);
      if (!industryText) continue;

      const industryContextHash = generateHash(industryText);
      await session.run(
        `MERGE (ic:IndustryContext {hash: $hash})
         ON CREATE SET ic.text = $text
         WITH ic
         MATCH (t:Transcript {transcript_id: $transcriptId})
         MERGE (t)-[:HAS_INDUSTRY_CONTEXT]->(ic)`,
        {
          hash: industryContextHash,
          text: industryText,
          transcriptId
        }
      );
    }

    console.log('Agent 5: Comprehensive relationships created successfully');
    console.log('Agent 5: Graph facts pushed successfully to AuraDB');
    return { success: true, message: 'Graph facts pushed successfully' };
  } catch (error) {
    console.error('Error pushing graph facts to Neo4j:', error);
    throw new Error(`Failed to push graph facts: ${error.message}`);
  } finally {
    await session.close();
  }
}

/**
 * Create cross-video relationships
 * Call this after processing multiple videos to link videos with similar content
 */
export async function createCrossVideoRelationships() {
  const driver = getDriver();
  if (!driver) {
    console.warn('Neo4j driver not available, skipping cross-video relationships');
    return { success: false, message: 'Neo4j not configured' };
  }

  const session = driver.session();

  try {
    console.log('Creating cross-video relationships...');

    // 1. Link videos with overlapping UseCases
    const useCaseResult = await session.run(`
      MATCH (v1:Video)-[:HAS_TRANSCRIPT]->(t1:Transcript)-[:MENTIONS_USECASE]->(u:UseCase)<-[:MENTIONS_USECASE]-(t2:Transcript)<-[:HAS_TRANSCRIPT]-(v2:Video)
      WHERE v1.id <> v2.id
      WITH v1, v2, count(DISTINCT u) as commonUseCases
      WHERE commonUseCases > 0
      MERGE (v1)-[r:DISCUSSES_SIMILAR_TOPIC]->(v2)
      ON CREATE SET r.commonUseCases = commonUseCases,
                    r.commonTechnologies = 0,
                    r.commonOrganizations = 0,
                    r.similarityScore = 0.0
      ON MATCH SET r.commonUseCases = commonUseCases
      RETURN count(r) as relationshipsCreated
    `);

    // 2. Link videos with overlapping Technologies
    const techResult = await session.run(`
      MATCH (v1:Video)-[:HAS_TRANSCRIPT]->(t1:Transcript)-[:MENTIONS_TECHNOLOGY]->(tech:Technology)<-[:MENTIONS_TECHNOLOGY]-(t2:Transcript)<-[:HAS_TRANSCRIPT]-(v2:Video)
      WHERE v1.id <> v2.id
      WITH v1, v2, count(DISTINCT tech) as commonTechs
      WHERE commonTechs > 0
      MERGE (v1)-[r:DISCUSSES_SIMILAR_TOPIC]->(v2)
      ON CREATE SET r.commonUseCases = 0,
                    r.commonTechnologies = commonTechs,
                    r.commonOrganizations = 0,
                    r.similarityScore = 0.0
      ON MATCH SET r.commonTechnologies = commonTechs
      RETURN count(r) as relationshipsCreated
    `);

    // 3. Link videos with overlapping Organizations
    const orgResult = await session.run(`
      MATCH (v1:Video)-[:HAS_TRANSCRIPT]->(t1:Transcript)-[:MENTIONS_ORGANIZATION]->(o:Organization)<-[:MENTIONS_ORGANIZATION]-(t2:Transcript)<-[:HAS_TRANSCRIPT]-(v2:Video)
      WHERE v1.id <> v2.id
      WITH v1, v2, count(DISTINCT o) as commonOrgs
      WHERE commonOrgs > 0
      MERGE (v1)-[r:DISCUSSES_SIMILAR_TOPIC]->(v2)
      ON CREATE SET r.commonUseCases = 0,
                    r.commonTechnologies = 0,
                    r.commonOrganizations = commonOrgs,
                    r.similarityScore = 0.0
      ON MATCH SET r.commonOrganizations = commonOrgs
      RETURN count(r) as relationshipsCreated
    `);

    // 4. Calculate similarity scores
    await session.run(`
      MATCH (v1:Video)-[r:DISCUSSES_SIMILAR_TOPIC]->(v2:Video)
      SET r.similarityScore = 
        (COALESCE(r.commonUseCases, 0) * 0.4 + 
         COALESCE(r.commonTechnologies, 0) * 0.3 + 
         COALESCE(r.commonOrganizations, 0) * 0.3) / 10.0
    `);

    console.log('Cross-video relationships created successfully');
    return {
      success: true,
      message: 'Cross-video relationships created',
      stats: {
        useCaseLinks: useCaseResult.records[0]?.get('relationshipsCreated') || 0,
        techLinks: techResult.records[0]?.get('relationshipsCreated') || 0,
        orgLinks: orgResult.records[0]?.get('relationshipsCreated') || 0
      }
    };
  } catch (error) {
    console.error('Error creating cross-video relationships:', error);
    throw new Error(`Failed to create cross-video relationships: ${error.message}`);
  } finally {
    await session.close();
  }
}

/**
 * Backfill comprehensive relationships for existing transcripts
 * Run this ONCE to add relationships for videos processed before this feature was added
 */
export async function backfillComprehensiveRelationships() {
  const driver = getDriver();
  if (!driver) {
    console.warn('Neo4j driver not available, skipping backfill');
    return { success: false, message: 'Neo4j not configured' };
  }

  const session = driver.session();

  try {
    console.log('Starting backfill of comprehensive relationships for existing data...');

    // Get all transcripts that have extraction data
    const transcriptResult = await session.run(`
      MATCH (t:Transcript)
      WHERE t.transcript_id IS NOT NULL
      RETURN t.transcript_id as transcriptId
      ORDER BY t.transcript_id
    `);

    const transcriptIds = transcriptResult.records.map(record => record.get('transcriptId'));
    console.log(`Found ${transcriptIds.length} transcripts to process`);

    let processed = 0;
    let errors = 0;

    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    for (const transcriptId of transcriptIds) {
      try {
        // Get extraction data from data_18d table (new schema)
        const { data: data18d, error: supabaseError } = await supabase
          .from('data_18d')
          .select('*, videos(video_id, video_url)')
          .eq('video_id', transcriptId)
          .single();

        if (supabaseError || !data18d) {
          console.warn(`Skipping transcript ${transcriptId}: No 18-D data found`);
          continue;
        }

        // Reconstruct extraction object from data_18d columns
        const extraction = {
          metadata: data18d.metadata || {},
          personas_roles_context: data18d.personas_roles_context || [],
          core_definition_of_agentic_ai: data18d.core_definition_of_agentic_ai || {},
          problem_statement: Array.isArray(data18d.problem_statement) && data18d.problem_statement.length > 0
            ? data18d.problem_statement[0]
            : {},
          use_cases_applications: data18d.use_cases_applications || [],
          business_value_narrative: data18d.business_value_narrative || {},
          quantitative_or_qualitative_impact: data18d.quantitative_or_qualitative_impact || [],
          risks_constraints: data18d.risks_constraints || [],
          enabling_technologies: data18d.enabling_technologies || [],
          organizational_implications: data18d.organizational_implications || {},
          industry_context_and_analogues: data18d.industry_context_and_analogues || [],
          customer_experience_dimension: data18d.customer_experience_dimension || {},
          trust_ethics_narrative: data18d.trust_ethics_narrative || {},
          future_vision_trend_indicators: data18d.future_vision_trend_indicators || [],
          quotable_insights: data18d.quotable_insights || [],
          sentiment_and_tone: data18d.sentiment_and_tone || {},
          cross_references_brands_examples: data18d.cross_references_brands_examples || [],
          structural_narrative_segments: data18d.structural_narrative_segments || [],
          provenance: data18d.provenance || {}
        };

        const videoRecordId = data18d.video_id;

        // Get video URL from joined data
        const videoUrl = data18d.videos?.video_url || '';
        const videoId = data18d.videos?.video_id || '';

        // Re-run comprehensive relationship creation for this transcript
        // We'll create a simplified version that just creates the relationships
        // without re-creating nodes (they already exist)

        const metadata = extraction.metadata || {};
        const speakers = metadata.speakers || [];
        const organizations = metadata.organizations || [];
        const useCases = extraction.use_cases_applications || [];
        const technologies = extraction.enabling_technologies || [];
        const problemStatement = extraction.problem_statement || {}; // Single object now
        const industries = extraction.industry_context_and_analogues || [];
        const brands = extraction.cross_references_brands_examples || [];
        const risks = extraction.risks_constraints || [];
        const trends = extraction.future_vision_trend_indicators || [];
        const quotes = extraction.quotable_insights || [];
        const impacts = extraction.quantitative_or_qualitative_impact || [];
        const agenticDefinition = extraction.core_definition_of_agentic_ai || {};
        const allOrgs = [...new Set([...organizations, ...brands])];

        const defaultConfidence = 0.8;

        // Create comprehensive relationships (same logic as in pushGraphFacts)
        // Co-occurrence relationships
        const useCaseSlugs = useCases
          .map(uc => slugify(normalizeToString(uc)))
          .filter(slug => slug);
        for (let i = 0; i < useCaseSlugs.length; i++) {
          for (let j = i + 1; j < useCaseSlugs.length; j++) {
            await session.run(
              `MATCH (u1:UseCase {slug: $slug1})
               MATCH (u2:UseCase {slug: $slug2})
               MERGE (u1)-[r:CO_OCCURS_WITH]->(u2)
               ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
               ON MATCH SET r.count = r.count + 1`,
              { slug1: useCaseSlugs[i], slug2: useCaseSlugs[j], transcriptId }
            );
          }
        }

        const techSlugs = technologies
          .map(t => slugify(normalizeToString(t)))
          .filter(slug => slug);
        for (let i = 0; i < techSlugs.length; i++) {
          for (let j = i + 1; j < techSlugs.length; j++) {
            await session.run(
              `MATCH (t1:Technology {slug: $slug1})
               MATCH (t2:Technology {slug: $slug2})
               MERGE (t1)-[r:USED_WITH]->(t2)
               ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
               ON MATCH SET r.count = r.count + 1`,
              { slug1: techSlugs[i], slug2: techSlugs[j], transcriptId }
            );
          }
        }

        // Cross-entity relationships
        for (const tech of technologies) {
          const techSlug = slugify(normalizeToString(tech));
          if (problemStatement && problemStatement.label) {
            const problemHash = generateHash(problemStatement.label + problemStatement.text);
            await session.run(
              `MATCH (tech:Technology {slug: $techSlug})
               MATCH (p:Problem {hash: $problemHash})
               MERGE (tech)-[r:SOLVES]->(p)
               ON CREATE SET r.sourceTranscriptId = $transcriptId, r.confidence = 0.8`,
              { techSlug, problemHash, transcriptId }
            );
          }
        }

        for (const org of allOrgs) {
          const orgSlug = slugify(normalizeToString(org));
          for (const tech of technologies) {
            const techSlug = slugify(normalizeToString(tech));
            await session.run(
              `MATCH (o:Organization {slug: $orgSlug})
               MATCH (tech:Technology {slug: $techSlug})
               MERGE (o)-[r:USES_TECHNOLOGY]->(tech)
               ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
               ON MATCH SET r.count = r.count + 1`,
              { orgSlug, techSlug, transcriptId }
            );
          }
        }

        // Organizations adopt Technologies
        for (const org of allOrgs) {
          const orgSlug = slugify(normalizeToString(org));
          for (const tech of technologies) {
            const techSlug = slugify(normalizeToString(tech));
            await session.run(
              `MATCH (o:Organization {slug: $orgSlug})
               MATCH (tech:Technology {slug: $techSlug})
               MERGE (o)-[r:ADOPTS_TECHNOLOGY]->(tech)
               ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
               ON MATCH SET r.count = r.count + 1`,
              { orgSlug, techSlug, transcriptId }
            );
          }
        }

        // Speakers discuss UseCases
        for (const speaker of speakers) {
          const parsed = parseSpeaker(normalizeToString(speaker));
          if (!parsed || !parsed.name) continue;
          const speakerSlug = slugify(parsed.name);
          for (const useCase of useCases) {
            const ucSlug = slugify(normalizeToString(useCase));
            await session.run(
              `MATCH (s:Speaker {slug: $speakerSlug})
               MATCH (u:UseCase {slug: $ucSlug})
               MERGE (s)-[r:DISCUSSES]->(u)
               ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
               ON MATCH SET r.count = r.count + 1`,
              { speakerSlug, ucSlug, transcriptId }
            );
          }
        }

        // Technologies enable Benefits
        for (const tech of technologies) {
          const techSlug = slugify(normalizeToString(tech));
          for (const impact of impacts) {
            const benefitHash = generateHash(normalizeToString(impact));
            await session.run(
              `MATCH (tech:Technology {slug: $techSlug})
               MATCH (b:Benefit {hash: $benefitHash})
               MERGE (tech)-[r:ENABLES]->(b)
               ON CREATE SET r.sourceTranscriptId = $transcriptId, r.confidence = $confidence`,
              { techSlug, benefitHash, transcriptId, confidence: defaultConfidence }
            );
          }
        }

        // Industries use Technologies
        for (const industry of industries) {
          const industrySlug = slugify(normalizeToString(industry));
          for (const tech of technologies) {
            const techSlug = slugify(normalizeToString(tech));
            await session.run(
              `MATCH (i:Industry {slug: $industrySlug})
               MATCH (tech:Technology {slug: $techSlug})
               MERGE (i)-[r:USES_TECHNOLOGY]->(tech)
               ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
               ON MATCH SET r.count = r.count + 1`,
              { industrySlug, techSlug, transcriptId }
            );
          }
        }

        // Problems relate to Risks
        if (problemStatement && problemStatement.label) {
          const problemHash = generateHash(problemStatement.label + problemStatement.text);
          for (const risk of risks) {
            const riskSlug = slugify(normalizeToString(risk));
            await session.run(
              `MATCH (p:Problem {hash: $problemHash})
               MATCH (r:Risk {slug: $riskSlug})
               MERGE (p)-[rel:RELATES_TO_RISK]->(r)
               ON CREATE SET rel.sourceTranscriptId = $transcriptId`,
              { problemHash, riskSlug, transcriptId }
            );
          }
        }

        // Quote-to-Entity Relationships
        for (const quote of quotes) {
          const quoteText = normalizeToString(quote);
          if (!quoteText) continue;

          for (const useCase of useCases) {
            const ucName = normalizeToString(useCase);
            if (ucName && quoteText.toLowerCase().includes(ucName.toLowerCase().substring(0, Math.min(20, ucName.length)))) {
              const ucSlug = slugify(ucName);
              await session.run(
                `MATCH (q:Quote)
                 WHERE q.text CONTAINS $quoteText
                 MATCH (u:UseCase {slug: $ucSlug})
                 MERGE (q)-[:REFERENCES]->(u)`,
                { quoteText: quoteText.substring(0, 50), ucSlug }
              );
            }
          }

          for (const tech of technologies) {
            const techName = normalizeToString(tech);
            if (techName && quoteText.toLowerCase().includes(techName.toLowerCase().substring(0, Math.min(20, techName.length)))) {
              const techSlug = slugify(techName);
              await session.run(
                `MATCH (q:Quote)
                 WHERE q.text CONTAINS $quoteText
                 MATCH (tech:Technology {slug: $techSlug})
                 MERGE (q)-[:REFERENCES]->(tech)`,
                { quoteText: quoteText.substring(0, 50), techSlug }
              );
            }
          }

          for (const org of allOrgs) {
            const orgName = normalizeToString(org);
            if (orgName && quoteText.toLowerCase().includes(orgName.toLowerCase().substring(0, Math.min(20, orgName.length)))) {
              const orgSlug = slugify(orgName);
              await session.run(
                `MATCH (q:Quote)
                 WHERE q.text CONTAINS $quoteText
                 MATCH (o:Organization {slug: $orgSlug})
                 MERGE (q)-[:REFERENCES]->(o)`,
                { quoteText: quoteText.substring(0, 50), orgSlug }
              );
            }
          }
        }

        // Speaker-to-Entity Relationships
        for (const speaker of speakers) {
          const parsed = parseSpeaker(normalizeToString(speaker));
          if (!parsed || !parsed.name) continue;
          const speakerSlug = slugify(parsed.name);

          for (const tech of technologies) {
            const techSlug = slugify(normalizeToString(tech));
            await session.run(
              `MATCH (s:Speaker {slug: $speakerSlug})
               MATCH (tech:Technology {slug: $techSlug})
               MERGE (s)-[r:MENTIONS_TECHNOLOGY]->(tech)
               ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
               ON MATCH SET r.count = r.count + 1`,
              { speakerSlug, techSlug, transcriptId }
            );
          }

          if (problemStatement && problemStatement.label) {
            const problemHash = generateHash(problemStatement.label + problemStatement.text);
            await session.run(
              `MATCH (s:Speaker {slug: $speakerSlug})
               MATCH (p:Problem {hash: $problemHash})
               MERGE (s)-[r:DISCUSSES_PROBLEM]->(p)
               ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
               ON MATCH SET r.count = r.count + 1`,
              { speakerSlug, problemHash, transcriptId }
            );
          }
        }

        // Organization-to-Entity Relationships
        for (const org of allOrgs) {
          const orgSlug = slugify(normalizeToString(org));

          for (const useCase of useCases) {
            const ucSlug = slugify(normalizeToString(useCase));
            await session.run(
              `MATCH (o:Organization {slug: $orgSlug})
               MATCH (u:UseCase {slug: $ucSlug})
               MERGE (o)-[r:HAS_USECASE]->(u)
               ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
               ON MATCH SET r.count = r.count + 1`,
              { orgSlug, ucSlug, transcriptId }
            );
          }

          for (const risk of risks) {
            const riskSlug = slugify(normalizeToString(risk));
            await session.run(
              `MATCH (o:Organization {slug: $orgSlug})
               MATCH (r:Risk {slug: $riskSlug})
               MERGE (o)-[:FACES_RISK]->(r)
               ON CREATE SET r.sourceTranscriptId = $transcriptId`,
              { orgSlug, riskSlug, transcriptId }
            );
          }
        }

        // Industry-to-Entity Relationships
        for (const industry of industries) {
          const industrySlug = slugify(normalizeToString(industry));

          if (problemStatement && problemStatement.label) {
            const problemHash = generateHash(problemStatement.label + problemStatement.text);
            await session.run(
              `MATCH (i:Industry {slug: $industrySlug})
               MATCH (p:Problem {hash: $problemHash})
               MERGE (i)-[r:HAS_PROBLEM]->(p)
               ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
               ON MATCH SET r.count = r.count + 1`,
              { industrySlug, problemHash, transcriptId }
            );
          }

          for (const impact of impacts) {
            const benefitHash = generateHash(normalizeToString(impact));
            await session.run(
              `MATCH (i:Industry {slug: $industrySlug})
               MATCH (b:Benefit {hash: $benefitHash})
               MERGE (i)-[r:SEEKS_BENEFIT]->(b)
               ON CREATE SET r.count = 1, r.sourceTranscriptId = $transcriptId
               ON MATCH SET r.count = r.count + 1`,
              { industrySlug, benefitHash, transcriptId }
            );
          }
        }

        // Trend-to-Entity Relationships
        // Trends are handled in section 16 (FutureTrend) - relationships created there

        // Principle-to-Entity Relationships
        // Principles removed - using AgenticDefinition instead
        // (commented out - not in new schema)

        processed++;
        if (processed % 10 === 0) {
          console.log(`Processed ${processed}/${transcriptIds.length} transcripts...`);
        }
      } catch (error) {
        errors++;
        console.error(`Error processing transcript ${transcriptId}:`, error.message);
        // Continue with next transcript
      }
    }

    console.log(`Backfill completed: ${processed} processed, ${errors} errors`);
    return {
      success: true,
      message: 'Backfill completed',
      stats: {
        total: transcriptIds.length,
        processed,
        errors
      }
    };
  } catch (error) {
    console.error('Error in backfill:', error);
    throw new Error(`Failed to backfill relationships: ${error.message}`);
  } finally {
    await session.close();
  }
}

/**
 * Get all insight chains (Problem → UseCase → Benefit → Metric)
 * @param {string} industryFilter - Optional industry name to filter by
 * @returns {Promise<Array>} Array of chain objects
 */
export async function getInsightChains(industryFilter = null) {
  const driver = getDriver();
  if (!driver) {
    throw new Error('Neo4j driver not available');
  }

  const session = driver.session();

  try {
    let query = `
      MATCH (p:Problem)-[:HAS_USE_CASE]->(uc:UseCase)-[:DELIVERS_BENEFIT]->(b:Benefit)
      OPTIONAL MATCH (b)-[:MEASURED_BY]->(m:Metric)
      ${industryFilter ? 'WHERE EXISTS { MATCH (uc)-[:BELONGS_TO]->(i:Industry) WHERE i.category = $industryFilter }' : ''}
      WITH p, uc, b, m
      OPTIONAL MATCH (uc)-[:BELONGS_TO]->(ind:Industry)
      WITH p, uc, b, m, collect(DISTINCT COALESCE(ind.category, 'General')) as industriesRaw
      WITH p, uc, b, m, 
           [cat IN industriesRaw 
            WHERE cat IS NOT NULL 
              AND toString(cat) <> '' 
           ] as industries
      WITH p, uc, b, m, industries, 
           CASE WHEN size(industries) > 0 THEN industries[0] ELSE 'General' END as primaryIndustry
      // Count transcripts mentioning each entity (use minimum as occurrence count)
      OPTIONAL MATCH (t1:Transcript)-[:HAS_PROBLEM]->(p)
      WITH p, uc, b, m, industries, primaryIndustry, count(DISTINCT t1) as problemCount
      OPTIONAL MATCH (t2:Transcript)-[:HAS_USECASE]->(uc)
      WITH p, uc, b, m, industries, primaryIndustry, problemCount, count(DISTINCT t2) as useCaseCount
      OPTIONAL MATCH (t3:Transcript)-[:HAS_BENEFIT]->(b)
      WITH p, uc, b, m, industries, primaryIndustry, problemCount, useCaseCount, count(DISTINCT t3) as benefitCount
      OPTIONAL MATCH (t4:Transcript)-[:HAS_BENEFIT]->(b)
      WHERE m IS NOT NULL AND (b)-[:MEASURED_BY]->(m)
      WITH p, uc, b, m, industries, primaryIndustry, problemCount, useCaseCount, benefitCount, count(DISTINCT t4) as metricCount
      WITH p, uc, b, m, industries, primaryIndustry, problemCount, useCaseCount, benefitCount, metricCount,
           min([problemCount, useCaseCount, benefitCount, COALESCE(metricCount, 0)]) as occurrenceCount
      // Temporarily allow chains with 0 occurrenceCount to see all chains
      ${industryFilter ? 'WHERE primaryIndustry = $industryFilter' : ''}
      RETURN p, uc, b, m, industries, primaryIndustry, occurrenceCount
      ORDER BY occurrenceCount DESC, uc.name
      LIMIT 100
    `;

    const params = industryFilter ? { industryFilter } : {};

    const result = await session.run(query, params);

    console.log(`getInsightChains: Found ${result.records.length} chains from query`);

    if (result.records.length === 0) {
      // Debug: Check if chains exist without transcript requirement
      const debugQuery = `
        MATCH (p:Problem)-[:HAS_USE_CASE]->(uc:UseCase)-[:DELIVERS_BENEFIT]->(b:Benefit)
        RETURN count(*) as chainCount
      `;
      const debugResult = await session.run(debugQuery);
      const chainCount = debugResult.records[0].get('chainCount').toNumber();
      console.log(`getInsightChains: Debug - ${chainCount} chains exist without transcript filter`);

      // Check if any chains have transcripts - test with a specific chain
      const sampleQuery = `
        MATCH (p:Problem)-[:HAS_USE_CASE]->(uc:UseCase)-[:DELIVERS_BENEFIT]->(b:Benefit)
        WITH p, uc, b LIMIT 1
        OPTIONAL MATCH (t1:Transcript)-[:HAS_PROBLEM]->(p)
        OPTIONAL MATCH (t2:Transcript)-[:HAS_USECASE]->(uc)
        OPTIONAL MATCH (t3:Transcript)-[:HAS_BENEFIT]->(b)
        RETURN p.hash as problemHash, uc.slug as useCaseSlug, b.hash as benefitHash,
               count(DISTINCT t1) as pCount, 
               count(DISTINCT t2) as ucCount, 
               count(DISTINCT t3) as bCount
      `;
      const sampleResult = await session.run(sampleQuery);
      if (sampleResult.records.length > 0) {
        const rec = sampleResult.records[0];
        console.log(`getInsightChains: Sample chain - Problem: ${rec.get('problemHash')}, UseCase: ${rec.get('useCaseSlug')}, Benefit: ${rec.get('benefitHash')}`);
        console.log(`getInsightChains: Sample counts - Problem: ${rec.get('pCount')}, UseCase: ${rec.get('ucCount')}, Benefit: ${rec.get('bCount')}`);
      }

      // Check total transcript relationships
      const relCountQuery = `
        MATCH ()-[r:HAS_PROBLEM]->() RETURN count(r) as count
        UNION ALL
        MATCH ()-[r:HAS_USECASE]->() RETURN count(r) as count
        UNION ALL
        MATCH ()-[r:HAS_BENEFIT]->() RETURN count(r) as count
      `;
      const relResult = await session.run(relCountQuery);
      console.log(`getInsightChains: Total MENTIONS relationships: ${relResult.records.map(r => r.get('count').toNumber()).join(', ')}`);

      // Test the exact query structure
      const testQuery = `
        MATCH (p:Problem)-[:HAS_USE_CASE]->(uc:UseCase)-[:DELIVERS_BENEFIT]->(b:Benefit)
        WITH p, uc, b
        OPTIONAL MATCH (uc)-[:BELONGS_TO]->(ind:Industry)
        WITH p, uc, b, collect(DISTINCT COALESCE(ind.category, 'General')) as industriesRaw
        RETURN count(*) as countAfterIndustry
      `;
      const testResult = await session.run(testQuery);
      const countAfterIndustry = testResult.records[0].get('countAfterIndustry').toNumber();
      console.log(`getInsightChains: Debug - ${countAfterIndustry} chains after industry collection`);
    }

    const chains = result.records.map(record => {
      const p = record.get('p').properties;
      const uc = record.get('uc').properties;
      const b = record.get('b').properties;
      const mNode = record.get('m');
      const m = mNode ? mNode.properties : null;
      const industriesRaw = record.get('industries') || [];
      const primaryIndustryRaw = record.get('primaryIndustry');

      const industries = industriesRaw.filter(ind => {
        if (!ind) return false;
        const str = String(ind).trim();
        if (!str || str === '') return false;
        if (str.startsWith('{') || str.startsWith('[')) return false;
        if (str.length > 60) return false;
        return true;
      });

      let primaryIndustry = 'General';
      if (primaryIndustryRaw) {
        const str = String(primaryIndustryRaw).trim();
        if (str && str !== '' && !str.startsWith('{') && !str.startsWith('[') && str.length <= 60) {
          primaryIndustry = str;
        } else if (industries.length > 0) {
          primaryIndustry = String(industries[0]).trim();
        }
      } else if (industries.length > 0) {
        primaryIndustry = String(industries[0]).trim();
      }

      const occurrenceCountRaw = record.get('occurrenceCount');
      const occurrenceCount = occurrenceCountRaw && typeof occurrenceCountRaw.toNumber === 'function'
        ? occurrenceCountRaw.toNumber()
        : (Number(occurrenceCountRaw) || 0);

      const chainId = `${p.hash || p.id}:::${uc.slug || uc.id}:::${b.hash || b.id}${m ? `:::${m.hash || m.id}` : ''}`;
      const title = `${uc.name || 'Use Case'} - ${primaryIndustry}`;

      return {
        id: chainId,
        title,
        industry: primaryIndustry,
        occurrenceCount,
        problem: {
          id: p.hash || p.id,
          type: 'problem',
          label: p.label || p.text || 'Unknown Problem',
          description: p.text || p.description || '',
          text: p.text || '',
          quote: p.quote || '',
          industries: industries,
          confidence: p.confidence || 0.8,
        },
        useCase: {
          id: uc.slug || uc.id,
          type: 'useCase',
          label: uc.name || 'Unknown Use Case',
          description: uc.description || uc.name || '',
          text: uc.description || '',
          quote: uc.quote || '',
          actions: uc.actions || [],
          channels: uc.channels || [],
          tools_apis: uc.tools_apis || [],
          industries: industries,
          confidence: uc.confidence || 0.8,
        },
        benefit: {
          id: b.hash || b.id,
          type: 'benefit',
          label: b.label || b.text || 'Unknown Benefit',
          description: b.text || b.description || '',
          text: b.text || '',
          quote: b.quote || '',
          industries: industries,
          confidence: b.confidence || 0.8,
        },
        metric: m ? {
          id: m.hash || m.id,
          type: 'metric',
          label: m.label || m.metric_name || 'Unknown Metric',
          description: m.value_or_description || m.metric_name || 'Metric data not available',
          text: m.value_or_description || '',
          metric_name: m.metric_name || '',
          value_or_description: m.value_or_description || '',
          unit: m.unit || '',
          timeframe: m.timeframe || '',
          quote: m.quote || '',
          industries: industries,
          confidence: m.confidence || 0.8,
        } : {
          id: 'no-metric',
          type: 'metric',
          label: 'No Metric Available',
          description: 'Metric data not available',
          text: '',
          metric_name: '',
          value_or_description: '',
          unit: '',
          timeframe: '',
          quote: '',
          industries: industries,
          confidence: 0,
        },
      };
    });

    return chains;
  } catch (error) {
    console.error('Error getting insight chains:', error);
    throw new Error(`Failed to get insight chains: ${error.message}`);
  } finally {
    await session.close();
  }
}

/**
 * Get detailed information for a specific chain
 * @param {string} chainId - Chain ID (composite key)
 * @returns {Promise<Object>} Chain detail object
 */
export async function getChainDetail(chainId) {
  const driver = getDriver();
  if (!driver) {
    throw new Error('Neo4j driver not available');
  }

  const session = driver.session();

  try {
    const parts = chainId.split(':::');
    if (parts.length < 3 || parts.length > 4) {
      throw new Error(`Invalid chain ID format: ${chainId}`);
    }
    const problemHash = parts[0];
    const useCaseSlug = parts[1];
    const benefitHash = parts[2];
    // Metric hash is optional (parts[3])

    const query = `
      MATCH (p:Problem {hash: $problemHash})
      MATCH (uc:UseCase {slug: $useCaseSlug})
      MATCH (b:Benefit {hash: $benefitHash})
      WHERE (p)-[:HAS_USE_CASE]->(uc) AND (uc)-[:DELIVERS_BENEFIT]->(b)
      OPTIONAL MATCH (b)-[:MEASURED_BY]->(m:Metric)
      
      OPTIONAL MATCH (uc)-[:BELONGS_TO]->(ind:Industry)
      WITH p, uc, b, m, collect(DISTINCT COALESCE(ind.category, 'General')) as industriesRaw
      WITH p, uc, b, m, 
           [cat IN industriesRaw WHERE cat IS NOT NULL AND toString(cat) <> '' AND toString(cat) <> 'General'] as industries
      
      OPTIONAL MATCH (uc)-[:BASED_ON]->(pr:Principle)
      WITH p, uc, b, m, industries, collect(DISTINCT pr.name) as principles
      
      OPTIONAL MATCH (ft:FutureTrend)-[:INFLUENCES]->(uc)
      WITH p, uc, b, m, industries, principles, collect(DISTINCT ft.text) as trends
      
      OPTIONAL MATCH (uc)-[:USES]->(tech:Technology)
      WITH p, uc, b, m, industries, principles, trends, collect(DISTINCT tech.text) as technologies
      
      OPTIONAL MATCH (t:Transcript)-[:HAS_PROBLEM]->(p)
      WITH p, uc, b, m, industries, principles, trends, technologies, count(DISTINCT t) as problemVideoCount
      
      OPTIONAL MATCH (t2:Transcript)-[:HAS_USECASE]->(uc)
      WITH p, uc, b, m, industries, principles, trends, technologies, problemVideoCount, count(DISTINCT t2) as useCaseVideoCount
      
      OPTIONAL MATCH (t3:Transcript)-[:HAS_BENEFIT]->(b)
      WITH p, uc, b, m, industries, principles, trends, technologies, problemVideoCount, useCaseVideoCount, count(DISTINCT t3) as benefitVideoCount
      
      OPTIONAL MATCH (t4:Transcript)-[:HAS_BENEFIT]->(b)
      WHERE m IS NOT NULL AND (b)-[:MEASURED_BY]->(m)
      WITH p, uc, b, m, industries, principles, trends, technologies, problemVideoCount, useCaseVideoCount, benefitVideoCount, count(DISTINCT t4) as metricVideoCount
      
      RETURN p, uc, b, m, industries, principles, trends, technologies,
             problemVideoCount, useCaseVideoCount, benefitVideoCount, metricVideoCount
    `;

    const result = await session.run(query, {
      problemHash,
      useCaseSlug,
      benefitHash,
    });

    if (result.records.length === 0) {
      throw new Error('Chain not found');
    }

    const record = result.records[0];
    const p = record.get('p').properties;
    const uc = record.get('uc').properties;
    const b = record.get('b').properties;
    const mNode = record.get('m');
    const m = mNode ? mNode.properties : null;
    const industriesRaw = record.get('industries') || [];
    const principles = (record.get('principles') || []).filter(p => p && String(p).trim() !== '');
    const trends = (record.get('trends') || []).filter(t => t && String(t).trim() !== '');
    const technologies = (record.get('technologies') || []).filter(tech => tech && String(tech).trim() !== '');
    const problemVideoCount = record.get('problemVideoCount').toNumber();
    const useCaseVideoCount = record.get('useCaseVideoCount').toNumber();
    const benefitVideoCount = record.get('benefitVideoCount').toNumber();
    const metricVideoCount = mNode ? record.get('metricVideoCount').toNumber() : 0;

    const industries = industriesRaw.filter(ind => {
      if (!ind) return false;
      const str = String(ind).trim();
      if (!str || str === '' || str === 'General') return false;
      if (str.startsWith('{') || str.startsWith('[')) return false;
      if (str.length > 60) return false;
      return true;
    });

    let primaryIndustry = 'General';
    if (industries.length > 0) {
      primaryIndustry = String(industries[0]).trim();
    }

    const occurrenceCount = Math.min(problemVideoCount, useCaseVideoCount, benefitVideoCount, m ? metricVideoCount : 0);

    return {
      id: chainId,
      title: `${uc.name || 'Use Case'} - ${primaryIndustry}`,
      industry: primaryIndustry,
      occurrenceCount,
      problem: {
        id: p.hash || p.id,
        type: 'problem',
        label: p.label || p.text || 'Unknown Problem',
        description: p.text || p.description || '',
        text: p.text || '',
        quote: p.quote || '',
        industries: industries,
        confidence: p.confidence || 0.8,
        videoCount: problemVideoCount,
      },
      useCase: {
        id: uc.slug || uc.id,
        type: 'useCase',
        label: uc.name || 'Unknown Use Case',
        description: uc.description || uc.name || '',
        text: uc.description || '',
        quote: uc.quote || '',
        actions: uc.actions || [],
        channels: uc.channels || [],
        tools_apis: uc.tools_apis || [],
        industries: industries,
        principles: principles,
        trends: trends,
        confidence: uc.confidence || 0.8,
        videoCount: useCaseVideoCount,
      },
      benefit: {
        id: b.hash || b.id,
        type: 'benefit',
        label: b.label || b.text || 'Unknown Benefit',
        description: b.text || b.description || '',
        text: b.text || '',
        quote: b.quote || '',
        industries: industries,
        metrics: [],
        confidence: b.confidence || 0.8,
        videoCount: benefitVideoCount,
      },
      metric: m ? {
        id: m.hash || m.id,
        type: 'metric',
        label: m.label || m.metric_name || 'Unknown Metric',
        description: m.value_or_description || m.metric_name || 'Metric data not available',
        text: m.value_or_description || '',
        metric_name: m.metric_name || '',
        value_or_description: m.value_or_description || '',
        unit: m.unit || '',
        timeframe: m.timeframe || '',
        quote: m.quote || '',
        industries: industries,
        confidence: m.confidence || 0.8,
        videoCount: metricVideoCount,
      } : {
        id: 'no-metric',
        type: 'metric',
        label: 'No Metric Available',
        description: 'Metric data not available',
        text: '',
        metric_name: '',
        value_or_description: '',
        unit: '',
        timeframe: '',
        quote: '',
        industries: industries,
        confidence: 0,
        videoCount: 0,
      },
    };
  } catch (error) {
    console.error('Error getting chain detail:', error);
    throw new Error(`Failed to get chain detail: ${error.message}`);
  } finally {
    await session.close();
  }
}

/**
 * Get related chains for a specific chain
 * @param {string} chainId - Chain ID
 * @param {number} limit - Maximum number of related chains to return
 * @returns {Promise<Array>} Array of related chain objects
 */
export async function getRelatedChains(chainId, limit = 5) {
  const driver = getDriver();
  if (!driver) {
    throw new Error('Neo4j driver not available');
  }

  const session = driver.session();

  try {
    const parts = chainId.split(':::');
    if (parts.length < 3 || parts.length > 4) {
      throw new Error(`Invalid chain ID format: ${chainId}`);
    }
    const problemHash = parts[0];
    const useCaseSlug = parts[1];
    const benefitHash = parts[2];
    // Metric hash is optional (parts[3])

    const query = `
      MATCH (p:Problem {hash: $problemHash})
      MATCH (uc:UseCase {slug: $useCaseSlug})
      MATCH (b:Benefit {hash: $benefitHash})
      
      MATCH (p2:Problem)-[:HAS_USE_CASE]->(uc2:UseCase)-[:DELIVERS_BENEFIT]->(b2:Benefit)
      WHERE (p2.hash <> $problemHash OR uc2.slug <> $useCaseSlug OR b2.hash <> $benefitHash)
      
      WITH p2, uc2, b2,
           CASE WHEN p2.hash = $problemHash THEN 1 ELSE 0 END as sameProblem,
           CASE WHEN uc2.slug = $useCaseSlug THEN 1 ELSE 0 END as sameUseCase,
           CASE WHEN b2.hash = $benefitHash THEN 1 ELSE 0 END as sameBenefit
      
      OPTIONAL MATCH (uc2)-[:BELONGS_TO]->(ind:Industry)
      WITH p2, uc2, b2, sameProblem, sameUseCase, sameBenefit,
           collect(DISTINCT COALESCE(ind.category, 'General')) as industriesRaw
      WITH p2, uc2, b2, sameProblem, sameUseCase, sameBenefit,
           [cat IN industriesRaw WHERE cat IS NOT NULL AND toString(cat) <> '' AND toString(cat) <> 'General'] as industries
      
      OPTIONAL MATCH (t:Transcript)-[:HAS_PROBLEM]->(p2)
      WITH p2, uc2, b2, sameProblem, sameUseCase, sameBenefit, industries,
           count(DISTINCT t) as problemCount
      OPTIONAL MATCH (t2:Transcript)-[:HAS_USECASE]->(uc2)
      WITH p2, uc2, b2, sameProblem, sameUseCase, sameBenefit, industries,
           problemCount, count(DISTINCT t2) as useCaseCount
      OPTIONAL MATCH (t3:Transcript)-[:HAS_BENEFIT]->(b2)
      WITH p2, uc2, b2, sameProblem, sameUseCase, sameBenefit, industries,
           problemCount, useCaseCount, count(DISTINCT t3) as benefitCount
      
      WITH p2, uc2, b2, industries,
           (sameProblem + sameUseCase + sameBenefit) as similarityScore,
           min([problemCount, useCaseCount, benefitCount]) as occurrenceCount
      
      WHERE occurrenceCount > 0
      RETURN p2, uc2, b2, industries, similarityScore, occurrenceCount
      ORDER BY similarityScore DESC, occurrenceCount DESC
      LIMIT $limit
    `;

    const result = await session.run(query, {
      problemHash,
      useCaseSlug,
      benefitHash,
      limit,
    });

    const chains = result.records.map(record => {
      const p = record.get('p2').properties;
      const uc = record.get('uc2').properties;
      const b = record.get('b2').properties;
      const industriesRaw = record.get('industries') || [];
      const similarityScore = record.get('similarityScore').toNumber();
      const occurrenceCountRaw = record.get('occurrenceCount');
      const occurrenceCount = occurrenceCountRaw && typeof occurrenceCountRaw.toNumber === 'function'
        ? occurrenceCountRaw.toNumber()
        : (Number(occurrenceCountRaw) || 0);

      const industries = industriesRaw.filter(ind => {
        if (!ind) return false;
        const str = String(ind).trim();
        if (!str || str === '' || str === 'General') return false;
        if (str.startsWith('{') || str.startsWith('[')) return false;
        if (str.length > 60) return false;
        return true;
      });

      let primaryIndustry = 'General';
      if (industries.length > 0) {
        primaryIndustry = String(industries[0]).trim();
      }

      const relatedChainId = `${p.hash || p.id}:::${uc.slug || uc.id}:::${b.hash || b.id}`;
      const title = `${uc.name || 'Use Case'} - ${primaryIndustry}`;

      return {
        id: relatedChainId,
        title,
        industry: primaryIndustry,
        occurrenceCount,
        similarityScore,
        problem: {
          id: p.hash || p.id,
          type: 'problem',
          label: p.label || p.text || 'Unknown Problem',
          description: p.text || p.description || '',
          industries: industries,
          confidence: p.confidence || 0.8,
        },
        useCase: {
          id: uc.slug || uc.id,
          type: 'useCase',
          label: uc.name || 'Unknown Use Case',
          description: uc.description || uc.name || '',
          industries: industries,
          confidence: uc.confidence || 0.8,
        },
        benefit: {
          id: b.hash || b.id,
          type: 'benefit',
          label: b.label || b.text || 'Unknown Benefit',
          description: b.text || b.description || '',
          industries: industries,
          confidence: b.confidence || 0.8,
        },
        metric: {
          id: 'no-metric',
          type: 'metric',
          label: 'No Metric Available',
          description: 'Metric data not available',
          industries: industries,
        },
      };
    });

    return chains;
  } catch (error) {
    console.error('Error getting related chains:', error);
    throw new Error(`Failed to get related chains: ${error.message}`);
  } finally {
    await session.close();
  }
}

/**
 * Get list of all industries that have chains
 * @returns {Promise<Array>} Array of industry names
 */
export async function getIndustries() {
  const driver = getDriver();
  if (!driver) {
    throw new Error('Neo4j driver not available');
  }

  const session = driver.session();

  try {
    const query = `
      MATCH (i:Industry)<-[:BELONGS_TO]-(uc:UseCase)
      WHERE EXISTS {
        MATCH (p:Problem)-[:HAS_USE_CASE]->(uc)-[:DELIVERS_BENEFIT]->(b:Benefit)
      }
      RETURN DISTINCT COALESCE(i.category, i.name) as industry
      ORDER BY industry
    `;

    const result = await session.run(query);

    const commonIndustries = ['Retail', 'Finance', 'Healthcare', 'Technology', 'Manufacturing', 'Education', 'Media & Entertainment', 'Telecom', 'Government', 'Energy', 'Transportation', 'Real Estate', 'Hospitality', 'Aerospace', 'Insurance', 'Consulting', 'Legal', 'Agriculture'];

    const industries = result.records
      .map(record => record.get('industry'))
      .filter(ind => {
        if (!ind) return false;
        const str = String(ind).trim();

        if (!str || str === '' || str === 'General') return false;
        if (str.startsWith('{') || str.startsWith('[')) return false;
        if (str.length > 60) return false;

        return true;
      })
      .map(ind => String(ind).trim())
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();

    return industries.length > 0 ? industries : commonIndustries;
  } catch (error) {
    console.error('Error getting industries:', error);
    throw new Error(`Failed to get industries: ${error.message}`);
  } finally {
    await session.close();
  }
}

/**
 * Update all existing Industry nodes with high-level categories
 * This function maps low-level industry names to high-level categories
 * @returns {Promise<Object>} Summary of updates
 */
export async function updateIndustryCategories() {
  const driver = getDriver();
  if (!driver) {
    throw new Error('Neo4j driver not available');
  }

  const session = driver.session();

  try {
    console.log('Starting industry category update...');

    // Get all Industry nodes
    const getAllQuery = `
      MATCH (i:Industry)
      RETURN i.slug as slug, i.name as name, i.category as currentCategory
    `;

    const allResult = await session.run(getAllQuery);
    const totalIndustries = allResult.records.length;
    console.log(`Found ${totalIndustries} Industry nodes to update`);

    let updatedCount = 0;
    let skippedCount = 0;
    const categoryMap = {};

    // Process each industry
    for (const record of allResult.records) {
      const slug = record.get('slug');
      const name = record.get('name');
      const currentCategory = record.get('currentCategory');

      if (!name) {
        skippedCount++;
        continue;
      }

      const newCategory = mapIndustryToCategory(name);

      // Track category distribution
      categoryMap[newCategory] = (categoryMap[newCategory] || 0) + 1;

      // Update the Industry node with the new category
      const updateQuery = `
        MATCH (i:Industry {slug: $slug})
        SET i.category = $category
        RETURN i.name as name, i.category as category
      `;

      await session.run(updateQuery, {
        slug,
        category: newCategory
      });

      updatedCount++;

      if (updatedCount % 10 === 0) {
        console.log(`Updated ${updatedCount}/${totalIndustries} industries...`);
      }
    }

    console.log(`\nIndustry category update completed:`);
    console.log(`  - Total industries: ${totalIndustries}`);
    console.log(`  - Updated: ${updatedCount}`);
    console.log(`  - Skipped: ${skippedCount}`);
    console.log(`\nCategory distribution:`);
    Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`  - ${category}: ${count}`);
      });

    return {
      total: totalIndustries,
      updated: updatedCount,
      skipped: skippedCount,
      categoryDistribution: categoryMap
    };
  } catch (error) {
    console.error('Error updating industry categories:', error);
    throw new Error(`Failed to update industry categories: ${error.message}`);
  } finally {
    await session.close();
  }
}

/**
 * Insert mock data for testing Insight Chains
 * Creates sample Problems, UseCases, Benefits, Industries, and their relationships
 * @returns {Promise<Object>} Summary of inserted data
 */
export async function insertMockData() {
  const driver = getDriver();
  if (!driver) {
    throw new Error('Neo4j driver not available');
  }

  const session = driver.session();

  try {
    console.log('Starting mock data insertion...');

    // Mock data structure
    const mockChains = [
      {
        problem: {
          name: 'Manual invoice processing is time-consuming and error-prone',
          text: 'Finance teams spend hours manually entering invoice data, leading to delays and human errors in accounts payable processes.',
          hash: 'mock-problem-1'
        },
        useCase: {
          name: 'Automated Invoice Processing',
          slug: 'automated-invoice-processing',
          description: 'AI-powered system that automatically extracts, validates, and processes invoices from various sources.'
        },
        benefit: {
          name: 'Reduced processing time by 80%',
          text: 'Invoice processing time reduced from 5 days to 1 day, with 95% accuracy rate.',
          hash: 'mock-benefit-1'
        },
        industry: 'Finance',
        transcriptIds: ['mock-transcript-1', 'mock-transcript-2']
      },
      {
        problem: {
          name: 'Patient data scattered across multiple systems',
          text: 'Healthcare providers struggle to access complete patient records due to fragmented data across EHR systems.',
          hash: 'mock-problem-2'
        },
        useCase: {
          name: 'Unified Patient Records',
          slug: 'unified-patient-records',
          description: 'AI system that aggregates patient data from multiple sources into a single, accessible view for healthcare providers.'
        },
        benefit: {
          name: 'Improved patient care coordination',
          text: 'Doctors can access complete patient history in seconds, reducing misdiagnosis by 40%.',
          hash: 'mock-benefit-2'
        },
        industry: 'Healthcare',
        transcriptIds: ['mock-transcript-3', 'mock-transcript-4']
      },
      {
        problem: {
          name: 'Inventory stockouts and overstocking',
          text: 'Retailers face challenges predicting demand, leading to lost sales from stockouts and excess inventory costs.',
          hash: 'mock-problem-3'
        },
        useCase: {
          name: 'Demand Forecasting',
          slug: 'demand-forecasting',
          description: 'ML models that predict product demand based on historical sales, seasonality, and market trends.'
        },
        benefit: {
          name: 'Optimized inventory levels',
          text: 'Reduced stockouts by 60% and excess inventory by 35%, improving cash flow.',
          hash: 'mock-benefit-3'
        },
        industry: 'Retail',
        transcriptIds: ['mock-transcript-5', 'mock-transcript-6', 'mock-transcript-7']
      },
      {
        problem: {
          name: 'Slow customer support response times',
          text: 'Technology companies struggle to provide timely customer support, leading to customer dissatisfaction and churn.',
          hash: 'mock-problem-4'
        },
        useCase: {
          name: 'AI Chatbot Support',
          slug: 'ai-chatbot-support',
          description: 'Intelligent chatbots that handle customer inquiries 24/7, escalating complex issues to human agents.'
        },
        benefit: {
          name: 'Faster response times',
          text: 'Average response time reduced from 2 hours to 2 minutes, with 85% of queries resolved automatically.',
          hash: 'mock-benefit-4'
        },
        industry: 'Technology',
        transcriptIds: ['mock-transcript-8', 'mock-transcript-9']
      },
      {
        problem: {
          name: 'Production line inefficiencies',
          text: 'Manufacturing plants experience downtime and quality issues due to lack of real-time monitoring and predictive maintenance.',
          hash: 'mock-problem-5'
        },
        useCase: {
          name: 'Predictive Maintenance',
          slug: 'predictive-maintenance',
          description: 'IoT sensors and AI models that predict equipment failures before they occur, enabling proactive maintenance.'
        },
        benefit: {
          name: 'Reduced downtime',
          text: 'Unplanned downtime reduced by 50%, maintenance costs decreased by 30%.',
          hash: 'mock-benefit-5'
        },
        industry: 'Manufacturing',
        transcriptIds: ['mock-transcript-10', 'mock-transcript-11', 'mock-transcript-12']
      },
      {
        problem: {
          name: 'Student engagement and personalized learning',
          text: 'Educational institutions struggle to provide personalized learning experiences at scale for diverse student needs.',
          hash: 'mock-problem-6'
        },
        useCase: {
          name: 'Adaptive Learning Platform',
          slug: 'adaptive-learning-platform',
          description: 'AI-powered platform that adapts content and pacing to individual student learning styles and progress.'
        },
        benefit: {
          name: 'Improved learning outcomes',
          text: 'Student test scores improved by 25%, with 90% of students reporting better engagement.',
          hash: 'mock-benefit-6'
        },
        industry: 'Education',
        transcriptIds: ['mock-transcript-13']
      },
      {
        problem: {
          name: 'Content recommendation accuracy',
          text: 'Media platforms need better algorithms to recommend relevant content to users, increasing engagement and retention.',
          hash: 'mock-problem-7'
        },
        useCase: {
          name: 'Personalized Content Recommendations',
          slug: 'personalized-content-recommendations',
          description: 'ML algorithms that analyze user behavior and preferences to recommend highly relevant content.'
        },
        benefit: {
          name: 'Increased user engagement',
          text: 'User watch time increased by 40%, subscription retention improved by 20%.',
          hash: 'mock-benefit-7'
        },
        industry: 'Media & Entertainment',
        transcriptIds: ['mock-transcript-14', 'mock-transcript-15']
      },
      {
        problem: {
          name: 'Network optimization and capacity planning',
          text: 'Telecom operators need to optimize network resources and predict capacity needs to maintain service quality.',
          hash: 'mock-problem-8'
        },
        useCase: {
          name: 'Network Traffic Optimization',
          slug: 'network-traffic-optimization',
          description: 'AI systems that analyze network traffic patterns and optimize resource allocation in real-time.'
        },
        benefit: {
          name: 'Better network performance',
          text: 'Network efficiency improved by 35%, customer complaints reduced by 45%.',
          hash: 'mock-benefit-8'
        },
        industry: 'Telecom',
        transcriptIds: ['mock-transcript-16']
      }
    ];

    let insertedCount = 0;
    const industryMap = {};

    // Process each chain
    for (const chain of mockChains) {
      const { problem, useCase, benefit, industry, transcriptIds } = chain;

      // 1. Create/Update Industry
      const industrySlug = slugify(industry);
      const industryCategory = mapIndustryToCategory(industry);

      await session.run(
        `MERGE (i:Industry {slug: $slug})
         ON CREATE SET i.name = $name, 
                       i.category = $category,
                       i.maturity_level = null
         ON MATCH SET i.category = $category`,
        {
          slug: industrySlug,
          name: industry,
          category: industryCategory
        }
      );

      if (!industryMap[industry]) {
        industryMap[industry] = 0;
      }

      // 2. Create Problem
      await session.run(
        `MERGE (p:Problem {hash: $hash})
         ON CREATE SET p.name = $name,
                       p.text = $text,
                       p.description = $text`,
        {
          hash: problem.hash,
          name: problem.name,
          text: problem.text
        }
      );

      // 3. Create UseCase
      await session.run(
        `MERGE (uc:UseCase {slug: $slug})
         ON CREATE SET uc.name = $name,
                       uc.description = $description`,
        {
          slug: useCase.slug,
          name: useCase.name,
          description: useCase.description
        }
      );

      // 4. Create Benefit
      await session.run(
        `MERGE (b:Benefit {hash: $hash})
         ON CREATE SET b.name = $name,
                       b.text = $text,
                       b.description = $text`,
        {
          hash: benefit.hash,
          name: benefit.name,
          text: benefit.text
        }
      );

      // 5. Create relationships
      await session.run(
        `MATCH (uc:UseCase {slug: $ucSlug})
         MATCH (p:Problem {hash: $pHash})
         MERGE (uc)-[:ADDRESSES]->(p)`,
        {
          ucSlug: useCase.slug,
          pHash: problem.hash
        }
      );

      await session.run(
        `MATCH (uc:UseCase {slug: $ucSlug})
         MATCH (b:Benefit {hash: $bHash})
         MERGE (uc)-[:DELIVERS]->(b)`,
        {
          ucSlug: useCase.slug,
          bHash: benefit.hash
        }
      );

      await session.run(
        `MATCH (uc:UseCase {slug: $ucSlug})
         MATCH (i:Industry {slug: $iSlug})
         MERGE (uc)-[:BELONGS_TO]->(i)`,
        {
          ucSlug: useCase.slug,
          iSlug: industrySlug
        }
      );

      // 6. Create Transcript nodes and link them
      for (const transcriptId of transcriptIds) {
        await session.run(
          `MERGE (t:Transcript {id: $id})
           ON CREATE SET t.language = 'en',
                         t.recorded_at = datetime()`,
          { id: transcriptId }
        );

        // Link transcript to Problem
        await session.run(
          `MATCH (t:Transcript {id: $tId})
           MATCH (p:Problem {hash: $pHash})
           MERGE (t)-[:MENTIONS_PROBLEM]->(p)`,
          {
            tId: transcriptId,
            pHash: problem.hash
          }
        );

        // Link transcript to UseCase
        await session.run(
          `MATCH (t:Transcript {id: $tId})
           MATCH (uc:UseCase {slug: $ucSlug})
           MERGE (t)-[:MENTIONS_USECASE]->(uc)`,
          {
            tId: transcriptId,
            ucSlug: useCase.slug
          }
        );

        // Link transcript to Benefit
        await session.run(
          `MATCH (t:Transcript {id: $tId})
           MATCH (b:Benefit {hash: $bHash})
           MERGE (t)-[:MENTIONS_BENEFIT]->(b)`,
          {
            tId: transcriptId,
            bHash: benefit.hash
          }
        );

        // Link transcript to Industry
        await session.run(
          `MATCH (t:Transcript {id: $tId})
           MATCH (i:Industry {slug: $iSlug})
           MERGE (t)-[:MENTIONS_INDUSTRY]->(i)`,
          {
            tId: transcriptId,
            iSlug: industrySlug
          }
        );
      }

      industryMap[industry] += transcriptIds.length;
      insertedCount++;
    }

    console.log(`\nMock data insertion completed:`);
    console.log(`  - Chains created: ${insertedCount}`);
    console.log(`  - Industries: ${Object.keys(industryMap).length}`);
    console.log(`  - Total transcripts: ${Object.values(industryMap).reduce((a, b) => a + b, 0)}`);
    console.log(`\nIndustry distribution:`);
    Object.entries(industryMap).forEach(([industry, count]) => {
      console.log(`  - ${industry}: ${count} transcripts`);
    });

    return {
      success: true,
      chainsCreated: insertedCount,
      industries: Object.keys(industryMap).length,
      totalTranscripts: Object.values(industryMap).reduce((a, b) => a + b, 0),
      industryDistribution: industryMap
    };
  } catch (error) {
    console.error('Error inserting mock data:', error);
    throw new Error(`Failed to insert mock data: ${error.message}`);
  } finally {
    await session.close();
  }
}

/**
 * Test function to verify mock data exists
 * @returns {Promise<Object>} Test results
 */
export async function testMockData() {
  const driver = getDriver();
  if (!driver) {
    throw new Error('Neo4j driver not available');
  }

  const session = driver.session();

  try {
    // Test 1: Count Problems
    const problemResult = await session.run('MATCH (p:Problem) RETURN count(p) as count');
    const problemCount = problemResult.records[0].get('count').toNumber();

    // Test 2: Count UseCases
    const useCaseResult = await session.run('MATCH (uc:UseCase) RETURN count(uc) as count');
    const useCaseCount = useCaseResult.records[0].get('count').toNumber();

    // Test 3: Count Benefits
    const benefitResult = await session.run('MATCH (b:Benefit) RETURN count(b) as count');
    const benefitCount = benefitResult.records[0].get('count').toNumber();

    // Test 4: Count ADDRESSES relationships
    const addressesResult = await session.run('MATCH (uc:UseCase)-[r:ADDRESSES]->(p:Problem) RETURN count(r) as count');
    const addressesCount = addressesResult.records[0].get('count').toNumber();

    // Test 5: Count DELIVERS relationships
    const deliversResult = await session.run('MATCH (uc:UseCase)-[r:DELIVERS]->(b:Benefit) RETURN count(r) as count');
    const deliversCount = deliversResult.records[0].get('count').toNumber();

    // Test 6: Count complete chains
    const chainResult = await session.run(`
      MATCH (p:Problem)<-[:ADDRESSES]-(uc:UseCase)-[:DELIVERS]->(b:Benefit)
      RETURN count(*) as count
    `);
    const chainCount = chainResult.records[0].get('count').toNumber();

    // Test 7: Count transcripts
    const transcriptResult = await session.run('MATCH (t:Transcript) RETURN count(t) as count');
    const transcriptCount = transcriptResult.records[0].get('count').toNumber();

    // Test 8: Count MENTIONS relationships
    const mentionsProblemResult = await session.run('MATCH (t:Transcript)-[r:MENTIONS_PROBLEM]->(p:Problem) RETURN count(r) as count');
    const mentionsProblemCount = mentionsProblemResult.records[0].get('count').toNumber();

    const mentionsUseCaseResult = await session.run('MATCH (t:Transcript)-[r:MENTIONS_USECASE]->(uc:UseCase) RETURN count(r) as count');
    const mentionsUseCaseCount = mentionsUseCaseResult.records[0].get('count').toNumber();

    const mentionsBenefitResult = await session.run('MATCH (t:Transcript)-[r:MENTIONS_BENEFIT]->(b:Benefit) RETURN count(r) as count');
    const mentionsBenefitCount = mentionsBenefitResult.records[0].get('count').toNumber();

    return {
      problems: problemCount,
      useCases: useCaseCount,
      benefits: benefitCount,
      addressesRelationships: addressesCount,
      deliversRelationships: deliversCount,
      completeChains: chainCount,
      transcripts: transcriptCount,
      mentionsProblem: mentionsProblemCount,
      mentionsUseCase: mentionsUseCaseCount,
      mentionsBenefit: mentionsBenefitCount
    };
  } catch (error) {
    console.error('Error testing mock data:', error);
    throw new Error(`Failed to test mock data: ${error.message}`);
  } finally {
    await session.close();
  }
}

/**
 * Close Neo4j driver
 */
export async function closeNeo4j() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

/**
 * Get trending tags (Technologies or UseCases)
 */
export async function getTrendingTags(limit = 10) {
  const driver = getDriver();
  if (!driver) return [];

  const session = driver.session();
  try {
    // Count occurrences of Technology nodes connected to Transcripts
    const result = await session.run(`
      MATCH (t:Transcript)-[:USES_TECH]->(tech:Technology)
      RETURN tech.text as tag, count(t) as count
      ORDER BY count DESC
      LIMIT $limit
    `, { limit: neo4j.int(limit) });

    return result.records.map(record => record.get('tag'));
  } catch (error) {
    console.error('Error fetching trending tags:', error);
    return [];
  } finally {
    await session.close();
  }
}

/**
 * Get top vendors (Organizations)
 */
/**
 * Delete video and all related nodes/relationships from Neo4j
 * @param {string} videoIdStr - YouTube video_id string (e.g., "abc123")
 */
export async function deleteVideoFromNeo4j(videoIdStr) {
  const driver = getDriver();
  if (!driver) {
    console.warn('Neo4j driver not available, skipping deletion');
    return {
      success: false,
      message: 'Neo4j not configured',
      videoId: videoIdStr
    };
  }

  const session = driver.session();
  try {
    // Neo4j stores videos with both 'id' (UUID) and 'video_id' (YouTube ID string)
    // Try to match by video_id property first
    const result = await session.run(
      `MATCH (v:Video {video_id: $videoIdStr})
       OPTIONAL MATCH (v)-[r]-()
       DETACH DELETE v, r
       RETURN count(v) as deleted`,
      { videoIdStr: videoIdStr }
    );

    const deletedCount = result.records[0]?.get('deleted')?.toNumber() || 0;

    if (deletedCount > 0) {
      return {
        success: true,
        message: `Video deleted from Neo4j: ${videoIdStr}`,
        videoId: videoIdStr
      };
    } else {
      // Video might not exist in Neo4j, which is okay
      return {
        success: true,
        message: `Video not found in Neo4j (may not have been synced): ${videoIdStr}`,
        videoId: videoIdStr
      };
    }
  } catch (error) {
    console.error(`Error deleting video from Neo4j ${videoIdStr}:`, error);
    return {
      success: false,
      message: error.message || `Failed to delete video from Neo4j: ${videoIdStr}`,
      videoId: videoIdStr
    };
  } finally {
    await session.close();
  }
}

/**
 * Delete multiple videos from Neo4j
 * @param {string[]} videoIdStrs - Array of YouTube video_id strings
 */
export async function deleteVideosFromNeo4j(videoIdStrs) {
  if (!Array.isArray(videoIdStrs) || videoIdStrs.length === 0) {
    return [];
  }

  const driver = getDriver();
  if (!driver) {
    console.warn('Neo4j driver not available, skipping deletion');
    return videoIdStrs.map(videoId => ({
      success: false,
      message: 'Neo4j not configured',
      videoId: videoId
    }));
  }

  const results = await Promise.allSettled(
    videoIdStrs.map(videoId => deleteVideoFromNeo4j(videoId))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        success: false,
        message: result.reason?.message || 'Unknown error',
        videoId: videoIdStrs[index]
      };
    }
  });
}

export async function getTopVendors(limit = 5) {
  const driver = getDriver();
  if (!driver) return [];

  const session = driver.session();
  try {
    // Count occurrences of Organization nodes mentioned in Transcripts
    // Filtering for 'Vendor' type if possible, otherwise all organizations
    const result = await session.run(`
      MATCH (t:Transcript)-[:MENTIONED_IN]->(org:Organization)
      RETURN org.name as name, count(t) as count
      ORDER BY count DESC
      LIMIT $limit
    `, { limit: neo4j.int(limit) });

    const colors = ["bg-red-500", "bg-blue-600", "bg-sky-500", "bg-blue-400", "bg-orange-500"];

    return result.records.map((record, index) => ({
      name: record.get('name'),
      count: record.get('count').toNumber(),
      color: colors[index % colors.length]
    }));
  } catch (error) {
    console.error('Error fetching top vendors:', error);
    return [];
  } finally {
    await session.close();
  }
}
