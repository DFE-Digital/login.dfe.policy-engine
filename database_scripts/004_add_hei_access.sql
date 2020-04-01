BEGIN TRAN AdditionalPolicy
 DECLARE @policyid UNIQUEIDENTIFIER
 DECLARE @covUniOrgId UNIQUEIDENTIFIER
 DECLARE @boltonUniOrgId UNIQUEIDENTIFIER
 DECLARE @bathUniOrgId UNIQUEIDENTIFIER
 DECLARE @teacherITTServiceId UNIQUEIDENTIFIER
 DECLARE @teacherEmpServiceId UNIQUEIDENTIFIER
 DECLARE @evolveEmpMatPolicyId UNIQUEIDENTIFIER
 DECLARE @evolveEmpPolicyId UNIQUEIDENTIFIER
 SET @policyid = newid();
 SET @teacherITTServiceId = (select top 1 id from [service] where name = 'Teacher Services - ITT Provider');
 SET @covUniOrgId = (select top 1 Id from [organisation] where UKPRN = '10001726' and URN = '133808');
 SET @boltonUniOrgId = (select top 1 Id from [organisation] where UKPRN = '10006841' and URN = '133794');
 SET @bathUniOrgId = (select top 1 Id from [organisation] where UKPRN = '10000571' and URN = '133790');
     INSERT INTO Policy (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt)
     VALUES (@policyid, 'HEI Access', newid(), 1, getdate(), getdate());
     INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
     VALUES (newid(), @policyid, 'organisation.category.id', 'is', @covUniOrgId, getdate(), getdate());
     INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
     VALUES (newid(), @policyid, 'organisation.category.id', 'is', @boltonUniOrgId, getdate(), getdate());
     INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
     VALUES (newid(), @policyid, 'organisation.category.id', 'is', @bathUniOrgId, getdate(), getdate());
     INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
     VALUES (newid(), @policyid, 'organisation.category.id', 'is', @teacherITTServiceId, getdate(), getdate());
SET @teacherEmpServiceId = (select top 1 id from [service] where Name = 'Teacher Services - Employer Access - Agent');
SET @evolveEmpMatPolicyId = (select top 1 Id from policy where ApplicationId=@teacherEmpServiceId and Name = 'Evolve - Employer Access - Agent MAT');
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.category.id', 'is', @evolveEmpMatPolicyId, getdate(), getdate());
SET @evolveEmpPolicyId = (select top 1 Id from policy where ApplicationId=@teacherEmpServiceId and Name = 'Evolve - Employer Access - Agent');
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
    VALUES (newid(), @policyid, 'organisation.category.id', 'is', @evolveEmpPolicyId, getdate(), getdate());
ROLLBACK TRAN AdditionalPolicy
