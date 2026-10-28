// Neo4j AuraDB Schema Setup
// Run this once to create all constraints and indexes
// Updated for new schema with 23 node types

// ============================================
// UNIQUENESS CONSTRAINTS
// ============================================

// Video and Transcript
CREATE CONSTRAINT video_id IF NOT EXISTS FOR (n:Video) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT transcript_id IF NOT EXISTS FOR (n:Transcript) REQUIRE n.id IS UNIQUE;

// Entity slugs
CREATE CONSTRAINT speaker_slug IF NOT EXISTS FOR (n:Speaker) REQUIRE n.slug IS UNIQUE;
CREATE CONSTRAINT org_slug IF NOT EXISTS FOR (n:Organization) REQUIRE n.slug IS UNIQUE;
CREATE CONSTRAINT uc_slug IF NOT EXISTS FOR (n:UseCase) REQUIRE n.slug IS UNIQUE;
CREATE CONSTRAINT principle_slug IF NOT EXISTS FOR (n:Principle) REQUIRE n.slug IS UNIQUE;
CREATE CONSTRAINT tech_slug IF NOT EXISTS FOR (n:Technology) REQUIRE n.slug IS UNIQUE;
CREATE CONSTRAINT risk_slug IF NOT EXISTS FOR (n:Risk) REQUIRE n.slug IS UNIQUE;
CREATE CONSTRAINT industry_slug IF NOT EXISTS FOR (n:Industry) REQUIRE n.slug IS UNIQUE;
CREATE CONSTRAINT event_slug IF NOT EXISTS FOR (n:Event) REQUIRE n.slug IS UNIQUE;
CREATE CONSTRAINT persona_slug IF NOT EXISTS FOR (n:Persona) REQUIRE n.slug IS UNIQUE;
CREATE CONSTRAINT futuretrend_slug IF NOT EXISTS FOR (n:FutureTrend) REQUIRE n.slug IS UNIQUE;
CREATE CONSTRAINT crossreference_slug IF NOT EXISTS FOR (n:CrossReference) REQUIRE n.slug IS UNIQUE;

// Hash-based text entities
CREATE CONSTRAINT problem_hash IF NOT EXISTS FOR (n:Problem) REQUIRE n.hash IS UNIQUE;
CREATE CONSTRAINT benefit_hash IF NOT EXISTS FOR (n:Benefit) REQUIRE n.hash IS UNIQUE;
CREATE CONSTRAINT metric_hash IF NOT EXISTS FOR (n:Metric) REQUIRE n.hash IS UNIQUE;
CREATE CONSTRAINT agenticdefinition_hash IF NOT EXISTS FOR (n:AgenticDefinition) REQUIRE n.hash IS UNIQUE;
CREATE CONSTRAINT orgimplication_hash IF NOT EXISTS FOR (n:OrgImplication) REQUIRE n.hash IS UNIQUE;
CREATE CONSTRAINT customerexperience_hash IF NOT EXISTS FOR (n:CustomerExperience) REQUIRE n.hash IS UNIQUE;
CREATE CONSTRAINT trustethics_hash IF NOT EXISTS FOR (n:TrustEthics) REQUIRE n.hash IS UNIQUE;
CREATE CONSTRAINT insightquote_hash IF NOT EXISTS FOR (n:InsightQuote) REQUIRE n.hash IS UNIQUE;
CREATE CONSTRAINT narrativesegment_hash IF NOT EXISTS FOR (n:NarrativeSegment) REQUIRE n.hash IS UNIQUE;
CREATE CONSTRAINT sentimenttone_hash IF NOT EXISTS FOR (n:SentimentTone) REQUIRE n.hash IS UNIQUE;
CREATE CONSTRAINT provenance_hash IF NOT EXISTS FOR (n:Provenance) REQUIRE n.hash IS UNIQUE;
CREATE CONSTRAINT industrycontext_hash IF NOT EXISTS FOR (n:IndustryContext) REQUIRE n.hash IS UNIQUE;

// Quote UUID (legacy)
CREATE CONSTRAINT quote_uuid IF NOT EXISTS FOR (n:Quote) REQUIRE n.uuid IS UNIQUE;

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// Video and Transcript
CREATE INDEX idx_video_video_id IF NOT EXISTS FOR (n:Video) ON (n.video_id);
CREATE INDEX idx_video_title IF NOT EXISTS FOR (n:Video) ON (n.video_title);
CREATE INDEX idx_transcript_transcript_id IF NOT EXISTS FOR (n:Transcript) ON (n.transcript_id);

// Core entities
CREATE INDEX idx_speaker_name IF NOT EXISTS FOR (n:Speaker) ON (n.name);
CREATE INDEX idx_org_name IF NOT EXISTS FOR (n:Organization) ON (n.name);
CREATE INDEX idx_event_name IF NOT EXISTS FOR (n:Event) ON (n.name);

// UseCase and related
CREATE INDEX idx_usecase_name IF NOT EXISTS FOR (n:UseCase) ON (n.name);
CREATE INDEX idx_principle_name IF NOT EXISTS FOR (n:Principle) ON (n.name);

// Problem, Benefit, Metric
CREATE INDEX idx_problem_label IF NOT EXISTS FOR (n:Problem) ON (n.label);
CREATE INDEX idx_benefit_label IF NOT EXISTS FOR (n:Benefit) ON (n.label);
CREATE INDEX idx_metric_label IF NOT EXISTS FOR (n:Metric) ON (n.label);
CREATE INDEX idx_metric_name IF NOT EXISTS FOR (n:Metric) ON (n.metric_name);

// Technology and Risk
CREATE INDEX idx_tech_text IF NOT EXISTS FOR (n:Technology) ON (n.text);
CREATE INDEX idx_risk_text IF NOT EXISTS FOR (n:Risk) ON (n.text);

// Industry
CREATE INDEX idx_industry_name IF NOT EXISTS FOR (n:Industry) ON (n.name);
CREATE INDEX idx_industry_category IF NOT EXISTS FOR (n:Industry) ON (n.category);
CREATE INDEX idx_industrycontext_text IF NOT EXISTS FOR (n:IndustryContext) ON (n.text);

// New node types
CREATE INDEX idx_persona_name IF NOT EXISTS FOR (n:Persona) ON (n.name);
CREATE INDEX idx_agenticdefinition_text IF NOT EXISTS FOR (n:AgenticDefinition) ON (n.text);
CREATE INDEX idx_orgimplication_text IF NOT EXISTS FOR (n:OrgImplication) ON (n.text);
CREATE INDEX idx_customerexperience_text IF NOT EXISTS FOR (n:CustomerExperience) ON (n.text);
CREATE INDEX idx_trustethics_text IF NOT EXISTS FOR (n:TrustEthics) ON (n.text);
CREATE INDEX idx_futuretrend_text IF NOT EXISTS FOR (n:FutureTrend) ON (n.text);
CREATE INDEX idx_insightquote_text IF NOT EXISTS FOR (n:InsightQuote) ON (n.text);
CREATE INDEX idx_crossreference_text IF NOT EXISTS FOR (n:CrossReference) ON (n.text);
CREATE INDEX idx_narrativesegment_text IF NOT EXISTS FOR (n:NarrativeSegment) ON (n.text);
CREATE INDEX idx_sentimenttone_sentiment IF NOT EXISTS FOR (n:SentimentTone) ON (n.sentiment);
CREATE INDEX idx_provenance_video_id IF NOT EXISTS FOR (n:Provenance) ON (n.video_id);







