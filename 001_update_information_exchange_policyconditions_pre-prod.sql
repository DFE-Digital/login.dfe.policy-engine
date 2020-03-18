BEGIN TRAN AdditionalPolicy
 DECLARE @policyid uniqueidentifier;
 SET @policyid = newid();
    INSERT INTO Policy (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt)
    VALUES (@policyid, 'EFA Information Exchange - FE/TP/OSH/EYS', '913ba321-9547-46b2-93c3-a7a7ffc2e3e2', 1, getdate(), getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.category.id', 'is', '009', getdate(), getdate());
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.category.id', 'is', '051', getdate(), getdate());
ROLLBACK TRAN AdditionalPolicy
