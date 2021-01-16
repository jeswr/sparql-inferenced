# sparql-inferenced
An RDF inferencer that extends the [HyLAR](https://github.com/ucbl/HyLAR-Reasoner.git) inferencing engine to allow inferencing with SPARQL Construct queries

## Usage

```ts
import inferencer from 'sparql-inferenced'
import { Store, Parser } from 'n3';
import { owl2rl } from 'hylar-core';
import * as fs from 'fs'

const parser = new Parser();

const ontologyQuads = parser.parse(
  fs.readFileSync(/* Path to SHACL ontology */).toString()
);

const shaclConstraint = parser.parse(`
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix ex: <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

ex:myShape a sh:NodeShape ;
  sh:property [
    sh:path foaf:friend ;
  ] .
`)

const SHACLInferences = [`
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
`]

(async () => {
  // Store to hold explicitly loaded triples
  const explicit = new Store();
  // Store to hold implicitly loaded triples
  const implicit = new Store();

  await inferencer(ontologyQuads, [], explicit, implicit, owl2rl, SHACLInferences)
  await inferencer(shaclConstraint, [], explicit, implicit, owl2rl, SHACLInferences)

  /**
   * Implicit now contains inferenced triples including
   * 
   * ex:myShape sh:closed false (from Construct inferences)
   * _b:1 a sh:ProperyShape ;   (from owl2rl inferences)
   *   sh:order 0 ;             (from Construct inferences)
   *   sh:minCount 0 .          (from Construct inferences) 
   */

})
```

## Future work

 - Perform reasoning using [`sh:rule`](https://www.w3.org/TR/shacl-af/#dfn-shacl-rules)
