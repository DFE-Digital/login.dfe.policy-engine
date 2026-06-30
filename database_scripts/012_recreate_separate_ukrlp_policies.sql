-- NSA-9764: Recreate the separate OR'd UKRLP policies
--
-- Migration 011 attempted to reactivate the original policies from 008/009
-- by setting Status = 1, but they no longer exist in this environment (they
-- were removed entirely, not just deactivated, likely via manual cleanup
-- through the manage console after migration 010 ran). This migration
-- recreates them fresh as new policies.
--
-- This also deactivates the combined AND'd policy from 010, since the
-- UKRLP team confirmed they want OR behaviour, not AND.
--
-- Run once per environment using the environment-specific service ID below.
--
-- Dev  service ID: 0DB75A65-C27F-4700-B5F1-0448089C3E01
-- Test service ID: CFBEEBEA-05ED-413E-8240-BB5497866AA0

BEGIN TRANSACTION RecreateSeparateUKRLPPolicies

  DECLARE @categoryPolicyId UNIQUEIDENTIFIER = NEWID()
  DECLARE @ukprnPolicyId    UNIQUEIDENTIFIER = NEWID()
  DECLARE @ukRlpServiceId   UNIQUEIDENTIFIER

  -- Set the correct service ID for the target environment before running:
  -- Dev:  SET @ukRlpServiceId = '0DB75A65-C27F-4700-B5F1-0448089C3E01'
  -- Test: SET @ukRlpServiceId = 'CFBEEBEA-05ED-413E-8240-BB5497866AA0'
  SET @ukRlpServiceId = '<ENV_SERVICE_ID>'

  -- 1. Deactivate the combined AND'd policy from migration 010 (if present)
  UPDATE Policy
  SET Status = 0, UpdatedAt = GETDATE()
  WHERE ApplicationId = @ukRlpServiceId
    AND Name = 'UKRLP - Category 054 and UKPRN starts with 1'

  -- 2. Recreate "UKRLP - Category 054 Access"
  INSERT INTO Policy (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt)
  VALUES (
    @categoryPolicyId,
    'UKRLP - Category 054 Access',
    @ukRlpServiceId,
    1,
    GETDATE(),
    GETDATE()
  )

  INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
  VALUES (
    NEWID(),
    @categoryPolicyId,
    'organisation.category.id',
    'is',
    '054',
    GETDATE(),
    GETDATE()
  )

  INSERT INTO PolicyRole (PolicyId, RoleId, CreatedAt, UpdatedAt)
  SELECT @categoryPolicyId, r.Id, GETDATE(), GETDATE()
  FROM Role r
  WHERE r.applicationId = @ukRlpServiceId

  -- 3. Recreate "UKRLP - UKPRN starts with 1"
  INSERT INTO Policy (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt)
  VALUES (
    @ukprnPolicyId,
    'UKRLP - UKPRN starts with 1',
    @ukRlpServiceId,
    1,
    GETDATE(),
    GETDATE()
  )

  INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
  VALUES (
    NEWID(),
    @ukprnPolicyId,
    'organisation.ukprn',
    'starts_with',
    '1',
    GETDATE(),
    GETDATE()
  )

  INSERT INTO PolicyRole (PolicyId, RoleId, CreatedAt, UpdatedAt)
  SELECT @ukprnPolicyId, r.Id, GETDATE(), GETDATE()
  FROM Role r
  WHERE r.applicationId = @ukRlpServiceId

COMMIT TRANSACTION RecreateSeparateUKRLPPolicies
