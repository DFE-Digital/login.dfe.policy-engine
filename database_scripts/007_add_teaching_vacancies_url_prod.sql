BEGIN TRAN UPDATETEACHINGVACANCIESPRODURL
  DECLARE @serviceId UNIQUEIDENTIFIER
  SET @serviceId = 'e348f7d4-93d9-4b43-9b78-c84d80c2f34c';
    INSERT INTO serviceRedirectUris (serviceId, redirectUrl)
    VALUES (@serviceId, 'https://teaching-vacancies-production.london.cloudapps.digital/auth/dfe/callback'),
    (@serviceId, 'https://teaching-vacancies-production.london.cloudapps.digital:443/auth/dfe/callback');
    INSERT INTO servicePostLogoutRedirectUris (serviceId, redirectUrl)
    VALUES (@serviceId, 'https://teaching-vacancies-production.london.cloudapps.digital/auth/dfe/signout'),
    (@serviceId, 'https://teaching-vacancies-production.london.cloudapps.digital:443/auth/dfe/signout');
ROLLBACK TRAN UPDATETEACHINGVACANCIESPRODURL
