BEGIN TRAN DASTOOLPOLICY
    DECLARE @policyId UNIQUEIDENTIFIER
    DECLARE @applicationId UNIQUEIDENTIFIER
    SET @policyId = NEWID();
    SET @applicationId = '10ac06ad-7b05-4b4c-b6c6-cf46616f5a17'

    INSERT INTO Policy (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt)
    VALUES (@policyId, 'ESFA DASTOOL', @applicationId, 1, GETDATE(), GETDATE());

    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
    VALUES (newid(), @policyId, 'organisation.id', 'is', '7fcde048-c92d-4820-85b4-88c153decb92', GETDATE(), GETDATE());

ROLLBACK TRAN DASTOOLPOLICY
