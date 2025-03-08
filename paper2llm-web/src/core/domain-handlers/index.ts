// AI Summary: Central export point for all domain handlers.
// Consolidates handler imports to simplify registration with the domain handler registry.

import { ArxivHandler } from './arxiv-handler';
import { OpenReviewHandler } from './openreview-handler';
import { AclAnthologyHandler } from './acl-handler';
import { BioRxivHandler } from './biorxiv-handler';
import { MedRxivHandler } from './medrxiv-handler';
import { NipsHandler } from './nips-handler';
import { MlrpHandler } from './mlrp-handler';

// Export all handlers
export const handlers = [
  new ArxivHandler(),
  new OpenReviewHandler(),
  new AclAnthologyHandler(),
  new BioRxivHandler(),
  new MedRxivHandler(),
  new NipsHandler(),
  new MlrpHandler()
];

// Export individual handler classes for direct usage
export {
  ArxivHandler,
  OpenReviewHandler,
  AclAnthologyHandler,
  BioRxivHandler,
  MedRxivHandler,
  NipsHandler,
  MlrpHandler
};
