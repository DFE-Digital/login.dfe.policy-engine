-- NSA-9764: Revert to separate OR'd UKRLP policies
--
-- The UKRLP team has reconsidered and confirmed they want the original OR
-- behaviour after all: an organisation should gain UKRLP service access if
-- EITHER its category is '054' OR its UKPRN starts with "1" (evaluated as
-- two separate policies, not one combined AND'd policy).
--
-- This migration reverses migration 010:
--   1. Reactivates the two original separate policies from 008 and 009
--   2. Deactivates the combined AND'd policy added in 010
--
-- Run once per environment using the environment-specific service ID below.
--
-- Dev  service ID: 0DB75A65-C27F-4700-B5F1-0448089C3E01
-- Test service ID: CFBEEBEA-05ED-413E-8240-BB5497866AA0

BEGIN TRANSACTION RevertToSeparateUKRLPPolicies

  DECLARE @ukRlpServiceId UNIQUEIDENTIFIER

  -- Set the correct service ID for the target environment before running:
  -- Dev:  SET @ukRlpServiceId = '0DB75A65-C27F-4700-B5F1-0448089C3E01'
  -- Test: SET @ukRlpServiceId = 'CFBEEBEA-05ED-413E-8240-BB5497866AA0'
  SET @ukRlpServiceId = '<ENV_SERVICE_ID>'

  -- 1. Reactivate the original separate (OR'd) policies
  UPDATE Policy
  SET Status = 1, UpdatedAt = GETDATE()
  WHERE ApplicationId = @ukRlpServiceId
    AND Name IN ('UKRLP - Category 054 Access', 'UKRLP - UKPRN starts with 1')

  -- 2. Deactivate the combined AND'd policy from migration 010
  UPDATE Policy
  SET Status = 0, UpdatedAt = GETDATE()
  WHERE ApplicationId = @ukRlpServiceId
    AND Name = 'UKRLP - Category 054 and UKPRN starts with 1'

COMMIT TRANSACTION RevertToSeparateUKRLPPolicies
