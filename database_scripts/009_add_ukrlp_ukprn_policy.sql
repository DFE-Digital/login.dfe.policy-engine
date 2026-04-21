-- NSA-9764: UKRLP UKPRN-based access policy
-- Creates a second policy granting access to the UKRLP service for any organisation
-- whose UKPRN begins with '1'. This works alongside the category-054 policy from
-- migration 008 (NSA-9733) — together they implement the OR logic:
--   "org category = UKRLP (054)" OR "org has a UKPRN starting with 1"
--
-- The policy engine evaluates multiple policies as OR: if ANY policy's conditions
-- are met, the user is granted access. Two policies are required here because
-- conditions within a single policy are AND'd.
--
-- Service IDs (environment-specific):
--   Dev:  0DB75A65-C27F-4700-B5F1-0448089C3E01
--   Test: CFBEEBEA-05ED-413E-8240-BB5497866AA0

BEGIN TRANSACTION AddUKRLPUkprnPolicy

  DECLARE @policyId       UNIQUEIDENTIFIER = NEWID()
  DECLARE @ukRlpServiceId UNIQUEIDENTIFIER

  -- Set the correct service ID for the target environment before running:
  -- Dev:  SET @ukRlpServiceId = '0DB75A65-C27F-4700-B5F1-0448089C3E01'
  -- Test: SET @ukRlpServiceId = 'CFBEEBEA-05ED-413E-8240-BB5497866AA0'
  SET @ukRlpServiceId = '<ENV_SERVICE_ID>'

  INSERT INTO Policy (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt)
  VALUES (
    @policyId,
    'UKRLP - UKPRN starts with 1',
    @ukRlpServiceId,
    1,
    GETDATE(),
    GETDATE()
  )

  -- Condition: organisation.ukprn starts_with '1'
  -- Requires the starts_with operator added to the policy engine in NSA-9764
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

COMMIT TRANSACTION AddUKRLPUkprnPolicy
