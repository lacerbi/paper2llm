// AI Summary: Central export point for all domain handlers.
// Uses the generic handler approach with repository-specific configurations
// to handle multiple academic repositories with less code duplication.

import { 
  GenericDomainHandler, 
  createAllRepositoryHandlers,
  createArxivConfig,
  createOpenReviewConfig,
  createAclConfig,
  createBioRxivConfig,
  createMedRxivConfig,
  createNipsConfig,
  createMlrpConfig
} from './generic-handler';

// Export all handlers using the generic configuration-based approach
export const handlers = createAllRepositoryHandlers();

// Export the configurations and handler class for direct usage if needed
export { 
  GenericDomainHandler,
  createArxivConfig,
  createOpenReviewConfig,
  createAclConfig,
  createBioRxivConfig,
  createMedRxivConfig,
  createNipsConfig,
  createMlrpConfig
};
