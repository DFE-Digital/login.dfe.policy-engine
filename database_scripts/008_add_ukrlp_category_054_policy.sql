-- NSA-9733: UKRLP Provider Profile Integration
-- Creates a policy granting UKRLP organisations (category 054) access to the UKRLP service.
-- Run once per environment using the environment-specific service ID below.
--
-- Dev  service ID: 0DB75A65-C27F-4700-B5F1-0448089C3E01
-- Test service ID: CFBEEBEA-05ED-413E-8240-BB5497866AA0

BEGIN TRANSACTION AddUKRLPPolicy

  DECLARE @policyId    UNIQUEIDENTIFIER = NEWID()
  DECLARE @ukRlpServiceId UNIQUEIDENTIFIER

  -- Set the correct service ID for the target environment before running:
  -- Dev:  SET @ukRlpServiceId = '0DB75A65-C27F-4700-B5F1-0448089C3E01'
  -- Test: SET @ukRlpServiceId = 'CFBEEBEA-05ED-413E-8240-BB5497866AA0'
  SET @ukRlpServiceId = '<ENV_SERVICE_ID>'

  INSERT INTO Policy (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt)
  VALUES (
    @policyId,
    'UKRLP - Category 054 Access',
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

  -- Grant all roles defined for the UKRLP service
  INSERT INTO PolicyRole (PolicyId, RoleId, CreatedAt, UpdatedAt)
  SELECT @policyId, r.Id, GETDATE(), GETDATE()
  FROM Role r
  WHERE r.applicationId = @ukRlpServiceId

COMMIT TRANSACTION AddUKRLPPolicy
