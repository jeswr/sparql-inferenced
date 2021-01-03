/* eslint-disable no-undef */
import { Store } from 'n3'
import { incrementalReasoning } from '../lib'
import { owl2rl } from 'hylar-core'

describe('Should run test', () => {
  const explicit = new Store();
  const implicit = new Store();
  
  it('Runs with no rules and no construct queries', async () => {
    await incrementalReasoning([], [], explicit, implicit, [], [])
    expect(explicit.getQuads(null, null, null, null).length).toEqual(0);
    expect(implicit.getQuads(null, null, null, null).length).toEqual(0);
  });

  it('Runs with rules and construct queries', async () => {
    await incrementalReasoning([], [], explicit, implicit, owl2rl, ['CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }'])
    expect(explicit.getQuads(null, null, null, null).length).toEqual(0);
    expect(implicit.getQuads(null, null, null, null).length).toEqual(0);
  });

});
