const getJwtStrategy = require('login.dfe.jwt-strategies');
const rp = require('login.dfe.request-promise-retry');

class ApiClient {
  constructor(config) {
    this._config = config;

    this._baseUri = config.service.url.endsWith('/')
      ? config.service.url.substr(0, config.service.url.length - 1)
      : config.service.url;
  }

  async _callApi(resource, correlationId, method = 'GET', body = undefined) {
    const token = await getJwtStrategy(this._config.service).getBearerToken();
    try {
      return await rp({
        method: method || 'GET',
        uri: `${this._baseUri}${resource}`,
        headers:{
          authorization: `bearer ${token}`,
        },
        body,
        json: true,
      });
    } catch (e) {
      if (e.statusCode === 404) {
        return undefined;
      }
      throw e;
    }
  }
}

module.exports = ApiClient;
