BEGIN TRAN RemoveHardcodedValues
DELETE FROM
        PolicyCondition
    WHERE 
        PolicyId in ( 
            SELECT
        Id
    FROM
        [Policy]
    WHERE 
                ApplicationId='913ba321-9547-46b2-93c3-a7a7ffc2e3e2' )
    AND
    Field='organisation.id'
ROLLBACK TRAN RemoveHardcodedValues