BEGIN TRAN GIASPRISMESFACRMROLE
    DECLARE @roleId UNIQUEIDENTIFIER
    DECLARE @policyId UNIQUEIDENTIFIER

    SET @roleId = NEWID();
    SET @policyId = NEWID();

    INSERT INTO Role (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt, Code, NumericId, ParentId)
    VALUES (@roleId, 'GIAS PRISM - ESFA CRM', '2354cb2e-f559-4bf4-9981-4f6c6890aa5e', 1, GETDATE(), GETDATE(), 'ESFACRM', (SELECT MAX(NumericId) FROM Role) + 1, null)

    INSERT INTO Policy (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt)
    VALUES (@policyId, 'ESFA CRM', '2354cb2e-f559-4bf4-9981-4f6c6890aa5e', 1, GETDATE(), GETDATE());

    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
    VALUES (newid(), @policyId, 'id', 'is', '3d65ad2a-43ce-4fc4-bd15-75bbd6dc16fd', GETDATE(), GETDATE());

    INSERT INTO PolicyRole (PolicyId, RoleId, CreatedAt, UpdatedAt)
    VALUES (@policyId, @roleId, GETDATE(), GETDATE());

ROLLBACK TRAN GIASPRISMESFACRMROLE
