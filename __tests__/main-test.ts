/* eslint-disable no-undef */
import { Store, Parser, Writer } from 'n3';
import { owl2rl } from 'hylar-core';
import * as fs from 'fs';
import * as path from 'path';
import { namedNode, quad, blankNode } from '@rdfjs/data-model';
import { incrementalReasoning } from '../lib';

describe('Should run test', () => {
  it('Runs with no rules and no construct queries', async () => {
    const explicit = new Store();
    const implicit = new Store();
    await incrementalReasoning([], [], explicit, implicit, [], []);
    expect(explicit.getQuads(null, null, null, null).length).toEqual(0);
    expect(implicit.getQuads(null, null, null, null).length).toEqual(0);
  });

  it('Runs with rules and construct queries', async () => {
    const explicit = new Store();
    const implicit = new Store();
    await incrementalReasoning([], [], explicit, implicit, owl2rl, ['CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }']);
    expect(explicit.getQuads(null, null, null, null).length).toEqual(0);
    expect(implicit.getQuads(null, null, null, null).length).toEqual(0);
  });

  it('Reasons over the SHACL ontology', async () => {
    const explicit = new Store();
    const implicit = new Store();
    const parser = new Parser();

    const originalQuads = parser.parse(fs.readFileSync(path.join(__dirname, 'files', 'shacl.ttl')).toString());
    // console.log(originalQuads)

    await incrementalReasoning(originalQuads, [], explicit, implicit, owl2rl, []);
    // TODO: Fix issue - reasoner not handling literals
    // explicit.addQuads(originalQuads)

    const writer = new Writer({
      end: true,
    });
    writer.addQuads(implicit.getQuads(null, null, null, null));
    writer.addPrefixes({
      sh: namedNode('http://www.w3.org/ns/shacl#'),
      rdf: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
      rdfs: namedNode('http://www.w3.org/2000/01/rdf-schema#'),
      owl: namedNode('http://http://www.w3.org/2002/07/owl#'),
      xsd: namedNode('http://www.w3.org/2001/XMLSchema#'),
    });

    fs.writeFileSync(path.join(__dirname, 'out.ttl'), writer.quadsToString(implicit.getQuads(null, null, null, null)));
    fs.writeFileSync(path.join(__dirname, 'out-explicit.ttl'), writer.quadsToString(explicit.getQuads(null, null, null, null)));
    // fs.watchFile('out.ttl', undefined, () => {})

    const toAdd = [
      quad(namedNode('http://example.org/myShape'), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://www.w3.org/ns/shacl#NodeShape')),
      quad(namedNode('http://example.org/myShape'), namedNode('http://www.w3.org/ns/shacl#property'), blankNode('99999999999')),
      quad(blankNode('99999999999'), namedNode('http://www.w3.org/ns/shacl#path'), namedNode('http://example.org/myPath')),
    ];

    expect(explicit.getQuads(null, null, null, null).length).toEqual(1128);
    // expect(implicit.getQuads(null, null, null, null).length).toEqual(427);
    // console.log('-------------------------------------');
    await incrementalReasoning(toAdd, [], explicit, implicit, owl2rl, []);
    expect(explicit.getQuads(null, null, null, null).length).toEqual(1131);
    expect(implicit.getQuads(null, null, null, null).length).toEqual(428);
    // expect(implicit.getQuads(blankNode('1'), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://www.w3.org/ns/shacl#PropertyShape'), null).length).toEqual(1);
  });
});
