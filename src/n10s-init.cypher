// Neosemantics (n10s) Initialization Script for V2.x Standards Compliance
// Phase 1: Configure RDF graph and namespace prefixes
// This script must be run after Neo4j starts with the neosemantics plugin

// Step 1: Initialize the RDF graph configuration
// This creates the necessary constraints and indexes for RDF handling
CALL n10s.graphconfig.init({
  handleVocabUris: "MAP",
  handleMultival: "ARRAY",
  handleRDFTypes: "LABELS",
  keepLangTag: true,
  keepCustomDataTypes: true,
  applyNeo4jNaming: true
});

// Step 2: Define namespace prefixes for TM Forum ontologies
// TMF620 - Product Catalog Management
CALL n10s.nsprefixes.add("tmf620", "https://www.tmforum.org/ontologies/tmf620#");

// TMF629 - Customer Management
CALL n10s.nsprefixes.add("tmf629", "https://www.tmforum.org/ontologies/tmf629#");

// TMF921 - Intent Management
CALL n10s.nsprefixes.add("tmf921", "https://www.tmforum.org/ontologies/tmf921#");

// Step 3: Define namespace prefixes for standard vocabularies
// Note: Some namespaces use standard prefixes (sch, skos, owl, rdf, rdfs)
// These are already registered by n10s, so we don't need to add them

// Dublin Core - Metadata terms (not a standard prefix, so we add it)
CALL n10s.nsprefixes.add("dc", "http://purl.org/dc/terms/");

// Step 4: Define namespace prefix for custom intent platform ontology
CALL n10s.nsprefixes.add("intent", "https://intent-platform.example.com/ontology#");

// Step 5: Verify configuration
CALL n10s.graphconfig.show() YIELD param, value
RETURN param, value;

// Step 6: List all configured namespace prefixes
CALL n10s.nsprefixes.list() YIELD prefix, namespace
RETURN prefix, namespace
ORDER BY prefix;
