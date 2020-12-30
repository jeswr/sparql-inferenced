import { } from 'hylar-core';
import type { Quad } from 'rdf-js';
// TODO: Remove this dependency once this engine is re-integrated with on2ts
import {} from 'rdf-validate-shacl';

interface Store {
  query(): Promise<{ quads: Quad[] }>
  // TODO: CHECK THIS CONFORMS TO n3 store
  addQuads(quads: Quad[]): Promise<void>
}

type InferenceFunction = (store: Store) => Quad[]

interface Rules {
  description?: string,
  query?: string,
  // Accepts the store as an arguement and
  // returns any inferred triples - this is to
  // allow for the implementation of sh:rule
  other?: InferenceFunction[]
}

/**
 * Incremental reasoning which avoids complete recalculation of facts.
 * Concat is preferred over merge for evaluation purposes.
 * @param R set of rules
 * @param F set of assertions
 * @param FeAdd set of assertions to be added
 * @param FeDel set of assertions to be deleted
 */
function incremental(rules) {
  // Step 1: Run Hylar
  // Step 2: Run construct
  // Step 3: Run other
  // If there are *any* new triples; repeat
}

// Method to collect *whole* shape in one g
// If minCount < 1 then optional | optional every line



`
CONSTRUCT { ?s ?p ?o }
WHERE {
  
}
`
// PREFIX sh: <http://www.w3.org/ns/shacl#>
// PREFIX ex: <http://example.org/>

// CONSTRUCT { 

// ex:addDocumentAuthor sh:property ?o, ?closed .
// ?o sh:path ?t .

// } WHERE { 

// ex:addDocumentAuthor sh:property ?o, ?closed .
// ?o sh:path ?t .

// } LIMIT 10