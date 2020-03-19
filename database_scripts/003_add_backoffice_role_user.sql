BEGIN TRAN addBackofficeUser
    INSERT INTO PolicyCondition (Id, PolicyId, Field, Operator, Value, CreatedAt,
UpdatedAt)
    VALUES (newid(), '88df18ad-7a0f-4617-ba76-13f48ae3149e', 'id', 'is', '9C961696-CBE4-40A9-B65C-847AD2EC75B6', getdate(),
getdate());
ROLLBACK TRAN addBackofficeUser
