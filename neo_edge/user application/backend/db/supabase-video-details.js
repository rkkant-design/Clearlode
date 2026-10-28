import { supabase } from './supabase.js';

/**
 * Get full video details with 18D extraction
 */
export async function getVideoDetails(videoId) {
    if (!supabase) {
        throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase
        .from('videos')
        .select(`
      *,
      data_18d (*)
    `)
        .eq('video_id', videoId)
        .single();

    if (error) {
        console.error('Error fetching video details:', error);
        throw new Error(`Failed to fetch video details: ${error.message}`);
    }

    if (!data) {
        return null;
    }

    // Handle data_18d - it can be an object (one-to-one) or array (one-to-many)
    // Since the schema has UNIQUE constraint, it should be an object, but handle both cases
    let extraction = {};
    if (data.data_18d) {
        if (Array.isArray(data.data_18d)) {
            extraction = data.data_18d[0] || {};
        } else {
            extraction = data.data_18d;
        }
    }

    // Ensure arrays are properly formatted (handle null/undefined)
    // Convert null/undefined to empty arrays, and non-arrays to single-item arrays
    extraction.personas_roles_context = extraction.personas_roles_context == null 
        ? [] 
        : Array.isArray(extraction.personas_roles_context) 
            ? extraction.personas_roles_context 
            : [extraction.personas_roles_context];
    
    extraction.quantitative_or_qualitative_impact = extraction.quantitative_or_qualitative_impact == null 
        ? [] 
        : Array.isArray(extraction.quantitative_or_qualitative_impact) 
            ? extraction.quantitative_or_qualitative_impact 
            : [extraction.quantitative_or_qualitative_impact];
    // Normalize all array fields
    extraction.problem_statement = extraction.problem_statement == null 
        ? [] 
        : Array.isArray(extraction.problem_statement) 
            ? extraction.problem_statement 
            : [extraction.problem_statement];
    
    extraction.use_cases_applications = extraction.use_cases_applications == null 
        ? [] 
        : Array.isArray(extraction.use_cases_applications) 
            ? extraction.use_cases_applications 
            : [extraction.use_cases_applications];
    
    extraction.risks_constraints = extraction.risks_constraints == null 
        ? [] 
        : Array.isArray(extraction.risks_constraints) 
            ? extraction.risks_constraints 
            : [extraction.risks_constraints];
    
    extraction.enabling_technologies = extraction.enabling_technologies == null 
        ? [] 
        : Array.isArray(extraction.enabling_technologies) 
            ? extraction.enabling_technologies 
            : [extraction.enabling_technologies];
    
    extraction.quotable_insights = extraction.quotable_insights == null 
        ? [] 
        : Array.isArray(extraction.quotable_insights) 
            ? extraction.quotable_insights 
            : [extraction.quotable_insights];
    
    extraction.key_insight = extraction.key_insight == null 
        ? [] 
        : Array.isArray(extraction.key_insight) 
            ? extraction.key_insight 
            : [extraction.key_insight];
    
    extraction.future_vision_trend_indicators = extraction.future_vision_trend_indicators == null 
        ? [] 
        : Array.isArray(extraction.future_vision_trend_indicators) 
            ? extraction.future_vision_trend_indicators 
            : [extraction.future_vision_trend_indicators];
    
    extraction.industry_context_and_analogues = extraction.industry_context_and_analogues == null 
        ? [] 
        : Array.isArray(extraction.industry_context_and_analogues) 
            ? extraction.industry_context_and_analogues 
            : [extraction.industry_context_and_analogues];

    // Debug logging
    console.log(`[getVideoDetails] Video ID: ${videoId}`);
    console.log(`[getVideoDetails] Has personas_roles_context: ${!!extraction.personas_roles_context}, Type: ${Array.isArray(extraction.personas_roles_context) ? 'array' : typeof extraction.personas_roles_context}, Length: ${Array.isArray(extraction.personas_roles_context) ? extraction.personas_roles_context.length : 'N/A'}`);
    console.log(`[getVideoDetails] Has quantitative_or_qualitative_impact: ${!!extraction.quantitative_or_qualitative_impact}, Type: ${Array.isArray(extraction.quantitative_or_qualitative_impact) ? 'array' : typeof extraction.quantitative_or_qualitative_impact}, Length: ${Array.isArray(extraction.quantitative_or_qualitative_impact) ? extraction.quantitative_or_qualitative_impact.length : 'N/A'}`);

    return {
        ...data,
        extraction
    };
}

/**
 * Extract text from JSONB field (handles strings, objects, arrays)
 */
function extractTextFromField(field) {
    if (!field) return [];
    
    if (typeof field === 'string') {
        return [field];
    }
    
    if (Array.isArray(field)) {
        return field.flatMap(item => {
            if (typeof item === 'string') return [item];
            if (typeof item === 'object' && item !== null) {
                return [
                    item.quote || item.text || item.insight || item.narrative || 
                    item.description || item.summary || item.value || 
                    JSON.stringify(item).substring(0, 200)
                ].filter(Boolean);
            }
            return [];
        });
    }
    
    if (typeof field === 'object' && field !== null) {
        const texts = [
            field.quote || field.text || field.insight || field.narrative || 
            field.description || field.summary || field.value
        ].filter(Boolean);
        
        // Also check nested fields
        if (field.text) texts.push(field.text);
        if (field.quote) texts.push(field.quote);
        if (field.narrative) texts.push(field.narrative);
        
        return texts.length > 0 ? texts : [];
    }
    
    return [];
}

/**
 * Get key insights for a video
 */
export async function getVideoKeyInsights(videoId) {
    if (!supabase) {
        throw new Error('Supabase client not initialized');
    }

    // Query using the relationship (like getSpotlightVideo does)
    const { data, error } = await supabase
        .from('videos')
        .select(`
      video_id,
      title,
      channel_title,
      data_18d (
        key_insight,
        quotable_insights,
        key_words,
        business_value_narrative,
        use_cases_applications,
        problem_statement,
        quantitative_or_qualitative_impact,
        future_vision_trend_indicators,
        core_definition_of_agentic_ai
      )
    `)
        .eq('video_id', videoId)
        .single();

    if (error) {
        console.error('Error fetching video insights:', error);
        throw new Error(`Failed to fetch video insights: ${error.message}`);
    }

    if (!data) {
        return null;
    }

    // data_18d is returned as a single object (not array) when using relationship query
    const extraction = data.data_18d || {};
    
    // Debug logging
    console.log(`[getVideoKeyInsights] Video ID: ${videoId}, Has data_18d: ${!!data.data_18d}, Has key_insight: ${!!extraction.key_insight}`);
    if (extraction.key_insight) {
        console.log(`[getVideoKeyInsights] key_insight type: ${Array.isArray(extraction.key_insight) ? 'array' : typeof extraction.key_insight}, value:`, JSON.stringify(extraction.key_insight).substring(0, 200));
    }
    
    // Extract insights from various possible fields (priority order)
    let insights = [];
    
    // Priority 1: Direct insight fields (handle like getSpotlightVideo does)
    if (extraction.key_insight) {
        const keyInsights = Array.isArray(extraction.key_insight) 
            ? extraction.key_insight 
            : [extraction.key_insight];
        const extracted = keyInsights.map(i => typeof i === 'string' ? i : (i.quote || i.text || i)).filter(Boolean);
        console.log(`[getVideoKeyInsights] Extracted ${extracted.length} insights from key_insight`);
        insights.push(...extracted);
    }
    
    if (extraction.quotable_insights) {
        const quotable = Array.isArray(extraction.quotable_insights)
            ? extraction.quotable_insights
            : [extraction.quotable_insights];
        insights.push(...quotable.map(i => typeof i === 'string' ? i : (i.quote || i.text || i)).filter(Boolean));
    }
    
    // Priority 2: Business value and use cases
    if (insights.length < 3 && extraction.business_value_narrative) {
        const narrative = extractTextFromField(extraction.business_value_narrative);
        insights.push(...narrative.slice(0, 2));
    }
    
    if (insights.length < 5 && extraction.use_cases_applications) {
        const useCases = extractTextFromField(extraction.use_cases_applications);
        insights.push(...useCases.slice(0, 2));
    }
    
    // Priority 3: Problem statements and impact
    if (insights.length < 5 && extraction.problem_statement) {
        const problems = extractTextFromField(extraction.problem_statement);
        insights.push(...problems.slice(0, 1));
    }
    
    if (insights.length < 5 && extraction.quantitative_or_qualitative_impact) {
        const impacts = extractTextFromField(extraction.quantitative_or_qualitative_impact);
        insights.push(...impacts.slice(0, 1));
    }
    
    // Priority 4: Future vision and definitions
    if (insights.length < 5 && extraction.future_vision_trend_indicators) {
        const trends = extractTextFromField(extraction.future_vision_trend_indicators);
        insights.push(...trends.slice(0, 1));
    }
    
    if (insights.length < 3 && extraction.core_definition_of_agentic_ai) {
        const definition = extractTextFromField(extraction.core_definition_of_agentic_ai);
        insights.push(...definition.slice(0, 1));
    }
    
    // Remove duplicates and empty strings, limit to 5 insights
    insights = [...new Set(insights.filter(insight => insight && insight.trim().length > 10))].slice(0, 5);

    return {
        videoId: data.video_id,
        title: data.title,
        channel: data.channel_title,
        insights: insights.length > 0 ? insights : ['No key insights available for this video yet. The video may need to be processed through the extraction workflow.'],
        keyWords: extraction.key_words || []
    };
}
