const getJwtStrategy = require('login.dfe.jwt-strategies');
const { fetchApi } = require('login.dfe.async-retry');

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
      return await fetchApi(`${this._baseUri}${resource}`, {
        method: method || 'GET',
        headers:{
          authorization: `bearer ${token}`,
        },
        body,
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
