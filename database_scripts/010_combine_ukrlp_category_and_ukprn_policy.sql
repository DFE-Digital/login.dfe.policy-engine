-- NSA-9764: Combine UKRLP category and UKPRN conditions into a single AND'd policy
--
-- Clarification from the UKRLP team: the UKPRN-starts-with-"1" condition is only
-- meant to apply to organisations sourced purely from UKRLP (i.e. not also a member
-- of GIAS and/or PIMS) — which is exactly the set of organisations with category
-- '054'. The two conditions must be AND'd, not OR'd, otherwise the UKPRN condition
-- alone would incorrectly grant UKRLP access to any GIAS/PIMS organisation whose
-- UKPRN happens to start with "1" (the vast majority of UKPRNs do).
--
-- This migration:
--   1. Deactivates the two separate OR'd policies added in 008 and 009
--   2. Creates one combined policy: organisation.category.id is '054'
--      AND organisation.ukprn starts_with '1'
--
-- Run once per environment using the environment-specific service ID below.
--
-- Dev  service ID: 0DB75A65-C27F-4700-B5F1-0448089C3E01
-- Test service ID: CFBEEBEA-05ED-413E-8240-BB5497866AA0

BEGIN TRANSACTION CombineUKRLPPolicies

  DECLARE @policyId       UNIQUEIDENTIFIER = NEWID()
  DECLARE @ukRlpServiceId UNIQUEIDENTIFIER

  -- Set the correct service ID for the target environment before running:
  -- Dev:  SET @ukRlpServiceId = '0DB75A65-C27F-4700-B5F1-0448089C3E01'
  -- Test: SET @ukRlpServiceId = 'CFBEEBEA-05ED-413E-8240-BB5497866AA0'
  SET @ukRlpServiceId = '<ENV_SERVICE_ID>'

  -- 1. Deactivate the previous separate (OR'd) policies
  UPDATE Policy
  SET Status = 0, UpdatedAt = GETDATE()
  WHERE ApplicationId = @ukRlpServiceId
    AND Name IN ('UKRLP - Category 054 Access', 'UKRLP - UKPRN starts with 1')

  -- 2. Create the combined policy with both conditions AND'd
  INSERT INTO Policy (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt)
  VALUES (
    @policyId,
    'UKRLP - Category 054 and UKPRN starts with 1',
    @ukRlpServiceId,
    1,
    GETDATE(),
    GETDATE()
  )

  INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
  VALUES (
    NEWID(),
    @policyId,
    'organisation.category.id',
    'is',
    '054',
    GETDATE(),
    GETDATE()
  )

  INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
  VALUES (
    NEWID(),
    @policyId,
    'organisation.ukprn',
    'starts_with',
    '1',
    GETDATE(),
    GETDATE()
  )

  -- Grant all roles defined for the UKRLP service
  INSERT INTO PolicyRole (PolicyId, RoleId, CreatedAt, UpdatedAt)
  SELECT @policyId, r.Id, GETDATE(), GETDATE()
  FROM Role r
  WHERE r.applicationId = @ukRlpServiceId

COMMIT TRANSACTION CombineUKRLPPolicies
