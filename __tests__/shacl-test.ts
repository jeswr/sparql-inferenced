import { Store, Parser, Writer } from 'n3';
import { owl2rl } from 'hylar-core';
import * as fs from 'fs';
import path from 'path';
import { namedNode, literal } from '@rdfjs/data-model';
import inferencer from '../lib';

const parser = new Parser();

const ontologyQuads = parser.parse(
  fs.readFileSync(path.join('__tests__', 'files', 'shacl.ttl')).toString(),
);

const shaclConstraint = parser.parse(`
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix ex: <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

ex:myShape a sh:NodeShape ;
  sh:property [
    sh:path foaf:friend ;
  ] .
`);

const SHACLInferences: string[] = [`
PREFIX sh: <http://www.w3.org/ns/shacl#>

CONSTRUCT {
 ?s sh:minCount 0
} WHERE {
  ?s a sh:PropertyShape
  FILTER(NOT EXISTS { ?s sh:minCount ?o })
}
`, `
PREFIX sh: <http://www.w3.org/ns/shacl#>

CONSTRUCT {
 ?s sh:order 0
} WHERE {
  ?s a sh:PropertyShape
  FILTER(NOT EXISTS { ?s sh:order ?o })
}
`, `
PREFIX sh: <http://www.w3.org/ns/shacl#>

CONSTRUCT {
 ?s sh:closed false
} WHERE {
  ?s a sh:PropertyShape
  FILTER(NOT EXISTS { ?s sh:closed ?o })
}
`];

describe('Testing properties of inferencing over shacl constraints with shacl ontology & shacl rules', () => {
  it('should contain class inferences', async () => {
    // Store to hold explicitly loaded triples
    const explicit = new Store();
    // Store to hold implicitly loaded triples
    const implicit = new Store();

    await inferencer(ontologyQuads, [], explicit, implicit, owl2rl, SHACLInferences);
    await inferencer(shaclConstraint, [], explicit, implicit, owl2rl, SHACLInferences);

    /**
     * The expectation is that implicit now contains inferenced triples including
     *
     * ex:myShape sh:closed false (from Construct inferences)
     * _b:1 a sh:ProperyShape ;   (from owl2rl inferences)
     *   sh:order 0 ;             (from Construct inferences)
     *   sh:minCount 0 .          (from Construct inferences)
     */

    // For visualisation of data when debugging
    // const quads = implicit.getQuads(null, null, null, null);
    // const writer = new Writer();

    // writer.addPrefix('sh', 'http://www.w3.org/ns/shacl#');
    // writer.addPrefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#');
    // writer.addPrefix('rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
    // writer.addPrefix('xsd', 'http://www.w3.org/2001/XMLSchema#');

    // console.log(writer.quadsToString(quads));

    const subjects = implicit.getSubjects(
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode('http://www.w3.org/ns/shacl#PropertyShape'),
      null,
    );

    // console.log(subjects);

    // Testing to make sure that `shaclConstraint` property is there
    expect(subjects.filter((elem) => elem.termType === 'BlankNode').length).toEqual(1);

    // This is the property from the nodeShape above
    const propertyShape = subjects.find((elem) => elem.termType === 'BlankNode');

    // console.log(implicit.getQuads(propertyShape, null, null, null))

    // Testing to make sure that the path is retained
    expect(explicit.countQuads(
      propertyShape,
      namedNode('http://www.w3.org/ns/shacl#path'),
      namedNode('http://xmlns.com/foaf/0.1/friend'),
      null,
    )).toEqual(1);

    expect(implicit.countQuads(
      propertyShape,
      namedNode('http://www.w3.org/ns/shacl#minCount'),
      literal('0', 'http://www.w3.org/2001/XMLSchema#integer'),
      null,
    )).toEqual(1);

    expect(implicit.countQuads(
      propertyShape,
      namedNode('http://www.w3.org/ns/shacl#order'),
      literal('0', 'http://www.w3.org/2001/XMLSchema#integer'),
      null,
    )).toEqual(1);

    expect(implicit.countQuads(
      propertyShape,
      namedNode('http://www.w3.org/ns/shacl#closed'),
      literal('false', 'http://www.w3.org/2001/XMLSchema#boolean'),
      null,
    )).toEqual(1);
  });
});
