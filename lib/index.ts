/* eslint-disable no-await-in-loop */
import {
  incremental, factsToQuads, quadsToFacts, Rule, owl2rl,
} from 'hylar-core';
import type { Quad, Term } from 'rdf-js';
import type { IQueryResult } from '@comunica/actor-init-sparql';
import { newEngine } from '@comunica/actor-init-sparql-rdfjs';
import type { OTerm, Store as N3Store } from 'n3';
// TODO: Remove this dependency once this engine is re-integrated with on2ts
// @ts-ignore
import { } from 'rdf-validate-shacl';
import { quadToStringQuad } from 'rdf-string-ttl';
import md5 from 'md5';

interface Store {
  query(q: string): IQueryResult;
  // These functions are not *required* but in cases such as the presence of the
  // n3 store they can be used to optimise performance by avoiding the conversion of
  // changes to an update query
  addQuads?: N3Store['addQuads']; // (quads: Quad[]): Promise<void>
  getQuads?: N3Store['getQuads'];
  removeQuads?: N3Store['removeQuads'];
}

type InferenceFunction = (store: Store) => Quad[];

interface Rules {
  description?: string;
  query?: string;
  // Accepts the store as an arguement and
  // returns any inferred triples - this is to
  // allow for the implementation of sh:rule
  other?: InferenceFunction[];
}

class StoreExtender implements Required<Store> {
  private store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  query(q: string) {
    return this.store.query(q);
  }

  removeQuads(quads: Quad[]) {
    if (this.store.removeQuads) {
      this.store.removeQuads(quads);
    } else {
      // TODO: IMPLEMENT with update query
      throw new Error('NOT IMPLEMENTED');
      // this.store.query()
    }
  }

  addQuads(quads: Quad[]) {
    if (this.store.addQuads) {
      this.store.addQuads(quads);
    } else {
      // TODO: IMPLEMENT with update query
      throw new Error('NOT IMPLEMENTED');
      // this.store.query()
    }
  }

  getQuads(subject: OTerm, predicate: OTerm, object: string | Term | OTerm[] | null, graph: OTerm) {
    if (this.store.getQuads) {
      return this.store.getQuads(subject, predicate, object, graph);
    }
    // TODO: IMPLEMENT with construct query
    throw new Error('NOT IMPLEMENTED');
    // this.store.query()
  }
}

async function applyHyLAR(
  inserts: Quad[],
  deletes: Quad[],
  explicit: N3Store,
  implicit: N3Store,
  rules: Rule[],
) {
  // Step 1: Run Hylar
  const { additions, deletions } = await incremental(
    quadsToFacts(inserts),
    quadsToFacts(deletes),
    // TODO HANDLE SAME QUADS IN DIFFERENT GRAPHS PROPERLY
    // - requires changes in quadsToFacts function
    quadsToFacts(explicit.getQuads(null, null, null, null)),
    quadsToFacts(implicit.getQuads(null, null, null, null)),
    rules,
  );

  // Step 2: Apply Hylar updates
  implicit.addQuads(factsToQuads(additions).implicit);
  explicit.addQuads(factsToQuads(additions).explicit);

  implicit.removeQuads(factsToQuads(deletions).implicit);
  explicit.removeQuads(factsToQuads(deletions).explicit);

  return { additions, deletions };
}

/**
 * Incremental reasoning which avoids complete recalculation of facts.
 * Concat is preferred over merge for evaluation purposes.
 * @param {Quad[]} inserts set of quads to be added
 * @param {Quad[]} deletes set of quads to be deleted
 * @param {Store} StoreExplicit Quad Store of explicit quads
 * @param {Store} StoreImplicit Quad Store of implicit quads
 * @param rules set of rules
 * @param constructQueries set of construct queries to be applied
 */
export async function incrementalReasoning(
  inserts: Quad[] = [],
  deletes: Quad[] = [],
  explicit: N3Store,
  implicit: N3Store,
  rules: Rule[],
  constructQueries: string[],
) {
  const globalHash: Record<string, boolean> = {};

  // const implicit = new StoreExtender(StoreImplicit);
  // const explicit = new StoreExtender(StoreExplicit);
  const combinedEngine = newEngine();

  let ins = inserts;
  let del = deletes;

  // TODO: Refactor this - it shouldn't be here
  function combinedQuery(q: string) {
    return combinedEngine.query(q, { sources: [implicit, explicit] });
  }

  while (ins.length > 0 || del.length > 0) {
    await applyHyLAR(ins, del, explicit, implicit, rules);

    // Step 2: Run construct queries
    ins = [];
    del = [];
    const hashes: Record<string, boolean> = {};

    for (const query of constructQueries) {
      const result = await combinedQuery(query);
      if (result.type !== 'quads') {
        throw new Error('Quads Expected');
      }
      const quads = await result.quads(); // TODO: Optimize
      for (const quad of quads) {
        const stringQuad = quadToStringQuad(quad);
        const hash = md5(stringQuad.subject + stringQuad.predicate + stringQuad.object + (stringQuad.graph ?? ''));
        if (
          !(hashes[hash])
          && implicit.getQuads(quad.subject, quad.predicate, quad.object, quad.graph).length === 0
          && explicit.getQuads(quad.subject, quad.predicate, quad.object, quad.graph).length === 0
        ) { // TODO: Double check
          hashes[hash] = true;
          ins.push(quad);
        }
      }
    }

    if (ins.length > 0 || del.length > 0) {
      // TODO: Optimise & check if needed
      const hash = md5(Object.keys(hashes).sort().join(''));
      if (globalHash[hash]) {
        throw new Error('Inferencer has entered an infinite loop');
      }
      globalHash[hash] = true;
    }
  }

  // TODO:
  // Step 3: Run other (i.e. sh:rule)
  // If there are *any* new triples; repeat
}

// Method to collect *whole* shape in one g
// If minCount < 1 then optional | optional every line

// PREFIX sh: <http://www.w3.org/ns/shacl#>
// PREFIX ex: <http://example.org/>

// CONSTRUCT {

// ex:addDocumentAuthor sh:property ?o, ?closed .
// ?o sh:path ?t .

// } WHERE {

// ex:addDocumentAuthor sh:property ?o, ?closed .
// ?o sh:path ?t .

// } LIMIT 10
