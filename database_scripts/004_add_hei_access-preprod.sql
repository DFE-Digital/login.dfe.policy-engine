BEGIN TRAN AdditionalPolicy
 DECLARE @policyid UNIQUEIDENTIFIER
 DECLARE @ittProviderRoleId UNIQUEIDENTIFIER
 DECLARE @covUniOrgId UNIQUEIDENTIFIER
 DECLARE @boltonUniOrgId UNIQUEIDENTIFIER
 DECLARE @bathUniOrgId UNIQUEIDENTIFIER
 DECLARE @teacherITTServiceId UNIQUEIDENTIFIER
 DECLARE @teacherEmpServiceId UNIQUEIDENTIFIER
 DECLARE @evolveEmpMatPolicyId UNIQUEIDENTIFIER
 DECLARE @evolveEmpPolicyId UNIQUEIDENTIFIER
 DECLARE @evolveEmpRoleId UNIQUEIDENTIFIER
 DECLARE @evolveEmpMatRoleId UNIQUEIDENTIFIER
 SET @policyid = NEWID();
 SET @teacherEmpServiceId = (SELECT TOP 1 id FROM [service] WHERE Name = 'Teacher Services - Employer Access - Agent');
 SET @teacherITTServiceId = (SELECT TOP 1 Id FROM [service] WHERE Name = 'Teacher Services - ITT Provider');
 SET @ittProviderRoleId = (SELECT TOP 1 Id FROM [role] WHERE ApplicationId = @teacherITTServiceId AND Name= 'ITT Provider');
 SET @evolveEmpRoleId = (SELECT TOP 1 Id from role where ApplicationId = @teacherEmpServiceId AND Name = 'Evolve - Employer Access - Prod');
 SET @covUniOrgId = (SELECT TOP 1 Id FROM [organisation] WHERE UKPRN = '10001726' AND URN = '133808');
 SET @boltonUniOrgId = (SELECT TOP 1 Id FROM [organisation] WHERE UKPRN = '10006841' AND URN = '133794');
 SET @bathUniOrgId = (SELECT TOP 1 Id FROM [organisation] WHERE UKPRN = '10000571' AND URN = '133790');
     INSERT INTO Policy (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt)
     VALUES (@policyid, 'Teacher Services - HEI Org Access Corrections', NEWID(), 1, GETDATE(), GETDATE());
     INSERT INTO Role (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt, NumericId, ParentId)
     VALUES (@ittProviderRoleId, 'Teacher Services - HEI Org Access', @teacherITTServiceId, 1, GETDATE(), GETDATE(), (SELECT MAX(NumericId) FROM Role) + 1, null);
     INSERT INTO PolicyRole (PolicyId, RoleId, CreatedAt, UpdatedAt)
     VALUES (@policyId, @ittProviderRoleId, GETDATE(), GETDATE());
     INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
     VALUES (NEWID(), @policyid, 'organisation.category.id', 'is', @covUniOrgId, GETDATE(), GETDATE());
     INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
     VALUES (NEWID(), @policyid, 'organisation.category.id', 'is', @boltonUniOrgId, GETDATE(), GETDATE());
     INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
     VALUES (NEWID(), @policyid, 'organisation.category.id', 'is', @bathUniOrgId, GETDATE(), GETDATE());
     INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
     VALUES (NEWID(), @policyid, 'organisation.category.id', 'is', @teacherITTServiceId, GETDATE(), GETDATE());
SET @evolveEmpMatRoleId = (SELECT TOP 1 Id from role where ApplicationId = @teacherEmpServiceId AND Name = 'Evolve - Employer Access - Agent');
SET @evolveEmpMatPolicyId = (SELECT TOP 1 Id from policy where ApplicationId=@teacherEmpServiceId AND Name = 'Evolve - Employer Access - Agent MAT');
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
    VALUES (NEWID(), @policyid, 'organisation.category.id', 'is', @evolveEmpMatPolicyId, GETDATE(), GETDATE());
    INSERT INTO Role (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt, NumericId, ParentId)
    VALUES (@evolveEmpMatRoleId, 'Teacher Services - HEI Org Access', @evolveEmpMatRoleId, 1, GETDATE(), GETDATE(), (SELECT MAX(NumericId) FROM Role) + 1, null);
    INSERT INTO PolicyRole (PolicyId, RoleId, CreatedAt, UpdatedAt)
    VALUES (@policyId, @evolveEmpMatRoleId, GETDATE(), GETDATE());
SET @evolveEmpRoleId = (SELECT TOP 1 Id from role where ApplicationId = @teacherEmpServiceId AND Name = 'Evolve - Employer Access - Prod');
SET @evolveEmpPolicyId = (SELECT TOP 1 Id FROM [policy] WHERE ApplicationId=@teacherEmpServiceId AND Name = 'Evolve - Employer Access - Agent');
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt, UpdatedAt)
    VALUES (NEWID(), @policyid, 'organisation.category.id', 'is', @evolveEmpPolicyId, GETDATE(), GETDATE());
    INSERT INTO Role (Id, Name, ApplicationId, Status, CreatedAt, UpdatedAt, NumericId, ParentId)
    VALUES (@evolveEmpRoleId, 'Teacher Services - HEI Org Access', @evolveEmpRoleId, 1, GETDATE(), GETDATE(), (SELECT MAX(NumericId) FROM Role) + 1, null);
    INSERT INTO PolicyRole (PolicyId, RoleId, CreatedAt, UpdatedAt)
    VALUES (@policyId, @evolveEmpRoleId, GETDATE(), GETDATE());
ROLLBACK TRAN AdditionalPolicy
