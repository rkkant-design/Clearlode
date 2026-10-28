import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

let driver = null;

export function getDriver() {
    if (!driver) {
        const uri = process.env.NEO4J_URI;
        const user = process.env.NEO4J_USER;
        const password = process.env.NEO4J_PASSWORD;

        if (!uri || !user || !password) {
            console.warn('⚠️  Neo4j environment variables not set. Neo4j features will be disabled.');
            return null;
        }

        try {
            driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
                maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
                maxConnectionPoolSize: 50,
                connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
            });
            console.log('✅ Neo4j driver initialized');
        } catch (error) {
            console.warn('⚠️  Failed to initialize Neo4j driver:', error.message || error);
            return null;
        }
    }
    return driver;
}

/**
 * Get trending tags based on keywords, ranked by frequency in transcripts
 */
export async function getTrendingTags(limit = 10) {
    const driver = getDriver();
    if (!driver) return [];

    const session = driver.session();
    try {
        const result = await session.run(`
      MATCH (t:Transcript)-[:HAS_KEYWORD]->(k:Keyword)
      RETURN k.word as tag, count(t) as count
      ORDER BY count DESC
      LIMIT $limit
    `, { limit: neo4j.int(limit) });

        return result.records.map(record => record.get('tag'));
    } catch (error) {
        // Suppress verbose error logs for connection/auth issues
        if (error.code === 'ServiceUnavailable' || error.code === 'SessionExpired' || 
            error.code === 'Neo.ClientError.Security.Unauthorized') {
            console.warn('⚠️  Neo4j unavailable or unauthorized. Returning empty results.');
        } else {
            console.error('Error fetching trending tags:', error.message || error);
        }
        return [];
    } finally {
        await session.close();
    }
}

/**
 * Get top vendors (Organizations)
 */
export async function getTopVendors(limit = 5) {
    const driver = getDriver();
    if (!driver) return [];

    const session = driver.session();
    try {
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
        // Suppress verbose error logs for connection/auth issues
        if (error.code === 'ServiceUnavailable' || error.code === 'SessionExpired' || 
            error.code === 'Neo.ClientError.Security.Unauthorized') {
            console.warn('⚠️  Neo4j unavailable or unauthorized. Returning empty results.');
        } else {
            console.error('Error fetching top vendors:', error.message || error);
        }
        return [];
    } finally {
        await session.close();
    }
}

function normalizeIndustries(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => (item == null ? null : String(item).trim()))
        .filter((item) => item && item !== '' && !item.startsWith('{') && !item.startsWith('[') && item.length <= 80);
}

function getPrimaryIndustry(industries) {
    if (industries.length === 0) {
        return 'General';
    }
    return industries[0];
}

export async function getUseCaseIndustries() {
    const driver = getDriver();
    if (!driver) return [];

    const session = driver.session();
    try {
        const result = await session.run(`
      MATCH (:UseCase)-[:BELONGS_TO]->(i:Industry)
      RETURN DISTINCT coalesce(i.category, 'General') AS industry
      ORDER BY industry
    `);

        return result.records
            .map((record) => {
                const value = record.get('industry');
                return value ? String(value).trim() : null;
            })
            .filter((value) => value && value !== '')
            .filter((value, index, arr) => arr.indexOf(value) === index);
    } catch (error) {
        console.error('Error fetching use case industries:', error.message || error);
        return [];
    } finally {
        await session.close();
    }
}

export async function getUseCases(industryFilter = null) {
    const driver = getDriver();
    if (!driver) return [];

    const session = driver.session();
    try {
        const result = await session.run(
            `
        MATCH (uc:UseCase)
        OPTIONAL MATCH (uc)-[:BELONGS_TO]->(ind:Industry)
        WITH uc, collect(DISTINCT coalesce(ind.category, 'General')) AS industriesRaw
        WITH uc, CASE WHEN size(industriesRaw) > 0 THEN industriesRaw ELSE ['General'] END AS industries
        ${industryFilter ? 'WHERE $industryFilter IN industries' : ''}
        OPTIONAL MATCH (t:Transcript)-[:HAS_USECASE]->(uc)
        WITH uc, industries, count(DISTINCT t) AS clipCount
        OPTIONAL MATCH (p:Problem)-[:HAS_USE_CASE]->(uc)-[:DELIVERS_BENEFIT]->(b:Benefit)
        OPTIONAL MATCH (b)-[:MEASURED_BY]->(m:Metric)
        WITH uc, industries, clipCount, collect(DISTINCT {problem: p, benefit: b, metric: m}) AS chainCombos
        RETURN uc, industries, clipCount, chainCombos
        ORDER BY clipCount DESC, uc.name
        LIMIT 120
      `,
            industryFilter ? { industryFilter } : {},
        );

        return result.records.map((record) => {
            const uc = record.get('uc').properties;
            const industriesRaw = normalizeIndustries(record.get('industries'));
            const industries = industriesRaw.length ? industriesRaw : ['General'];
            const clipCountValue = record.get('clipCount');
            const clipCount =
                clipCountValue && typeof clipCountValue.toNumber === 'function'
                    ? clipCountValue.toNumber()
                    : Number(clipCountValue) || 0;
            const combos = record.get('chainCombos') || [];

            const firstCombo = combos.find(
                (combo) => combo.problem && combo.benefit,
            ) || { problem: null, benefit: null, metric: null };

            const formatNode = (node, type) => {
                if (!node) return null;
                const props = node.properties || {};
                return {
                    id: props.hash || props.slug || props.id,
                    type,
                    label: props.label || props.name || props.text || '',
                };
            };

            return {
                id: uc.slug || uc.id,
                name: uc.name || 'Unnamed Use Case',
                description: uc.description || '',
                industries,
                primaryIndustry: getPrimaryIndustry(industries),
                clipCount,
                actions: uc.actions || [],
                channels: uc.channels || [],
                tools: uc.tools_apis || [],
                summaryTags: Array.isArray(uc.tags) ? uc.tags.slice(0, 4) : [],
                exampleChain: {
                    problem: formatNode(firstCombo.problem, 'problem'),
                    useCase: {
                        id: uc.slug || uc.id,
                        type: 'useCase',
                        label: uc.name || 'Use Case',
                    },
                    benefit: formatNode(firstCombo.benefit, 'benefit'),
                    metric: formatNode(firstCombo.metric, 'metric'),
                },
            };
        });
    } catch (error) {
        console.error('Error fetching use cases:', error.message || error);
        return [];
    } finally {
        await session.close();
    }
}

export async function getUseCaseChains(useCaseId) {
    const driver = getDriver();
    if (!driver) return null;

    const session = driver.session();
    try {
        const result = await session.run(
            `
        MATCH (uc:UseCase)
        WHERE uc.slug = $useCaseId OR uc.id = $useCaseId
        OPTIONAL MATCH (uc)-[:BELONGS_TO]->(ind:Industry)
        WITH uc, collect(DISTINCT coalesce(ind.category, 'General')) AS industriesRaw
        WITH uc, CASE WHEN size(industriesRaw) > 0 THEN industriesRaw ELSE ['General'] END AS industries
        MATCH (p:Problem)-[:HAS_USE_CASE]->(uc)-[:DELIVERS_BENEFIT]->(b:Benefit)
        OPTIONAL MATCH (b)-[:MEASURED_BY]->(m:Metric)
        WITH uc, industries, p, b, m
        OPTIONAL MATCH (t1:Transcript)-[:HAS_PROBLEM]->(p)
        OPTIONAL MATCH (t2:Transcript)-[:HAS_USECASE]->(uc)
        OPTIONAL MATCH (t3:Transcript)-[:HAS_BENEFIT]->(b)
        OPTIONAL MATCH (t4:Transcript)-[:HAS_BENEFIT]->(b)
        WHERE m IS NOT NULL AND (b)-[:MEASURED_BY]->(m)
        WITH uc, industries, p, b, m,
             count(DISTINCT t1) AS problemCount,
             count(DISTINCT t2) AS useCaseCount,
             count(DISTINCT t3) AS benefitCount,
             count(DISTINCT t4) AS metricCount
        RETURN uc, industries, p, b, m, problemCount, useCaseCount, benefitCount, metricCount
      `,
            { useCaseId },
        );

        if (result.records.length === 0) {
            return null;
        }

        const formatNode = (node, type, industries) => {
            if (!node) return null;
            const props = node.properties || {};
            return {
                id: props.hash || props.slug || props.id,
                type,
                label: props.label || props.name || props.text || '',
                description: props.description || props.text || '',
                text: props.text || '',
                quote: props.quote || '',
                industries,
            };
        };

        const chains = result.records.map((record) => {
            const uc = record.get('uc').properties;
            const industriesRaw = normalizeIndustries(record.get('industries'));
            const industries = industriesRaw.length ? industriesRaw : ['General'];
            const occurrenceCount = Math.min(
                ...[
                    record.get('problemCount'),
                    record.get('useCaseCount'),
                    record.get('benefitCount'),
                    record.get('metricCount') || neo4j.int(0),
                ]
                    .filter((value) => value != null)
                    .map((value) => (typeof value.toNumber === 'function' ? value.toNumber() : Number(value) || 0)),
            );

            const useCaseNode = {
                id: uc.slug || uc.id,
                type: 'useCase',
                label: uc.name || 'Use Case',
                description: uc.description || '',
                industries,
                actions: uc.actions || [],
                channels: uc.channels || [],
                tools_apis: uc.tools_apis || [],
            };

            const metricNode = record.get('m');
            const metricFormatted = metricNode
                ? {
                      id: metricNode.properties.hash || metricNode.properties.id,
                      type: 'metric',
                      label: metricNode.properties.label || metricNode.properties.metric_name || 'Metric',
                      description:
                          metricNode.properties.value_or_description || metricNode.properties.metric_name || '',
                      industries,
                      metric_name: metricNode.properties.metric_name || '',
                      value_or_description: metricNode.properties.value_or_description || '',
                      unit: metricNode.properties.unit || '',
                      timeframe: metricNode.properties.timeframe || '',
                  }
                : null;

            return {
                problem: formatNode(record.get('p'), 'problem', industries),
                useCase: useCaseNode,
                benefit: formatNode(record.get('b'), 'benefit', industries),
                metric:
                    metricFormatted ||
                    {
                        id: 'metric-missing',
                        type: 'metric',
                        label: 'Metric coming soon',
                        description: 'Metric data not yet captured',
                        industries,
                    },
                occurrenceCount: Number.isFinite(occurrenceCount) ? occurrenceCount : 0,
            };
        });

        const useCaseRecord = result.records[0];
        const useCaseProps = useCaseRecord.get('uc').properties;
        const industriesRaw = normalizeIndustries(useCaseRecord.get('industries'));
        const industries = industriesRaw.length ? industriesRaw : ['General'];

        return {
            useCase: {
                id: useCaseProps.slug || useCaseProps.id,
                name: useCaseProps.name || 'Use Case',
                description: useCaseProps.description || '',
                industries,
                clipCount: chains.reduce((max, chain) => Math.max(max, chain.occurrenceCount), 0),
                actions: useCaseProps.actions || [],
                channels: useCaseProps.channels || [],
                tools_apis: useCaseProps.tools_apis || [],
            },
            industries,
            chains,
        };
    } catch (error) {
        console.error('Error fetching use case chains:', error.message || error);
        return null;
    } finally {
        await session.close();
    }
}

/**
 * Close the Neo4j driver connection
 */
export async function closeDriver() {
    if (driver) {
        await driver.close();
        driver = null;
    }
}
