const ApiClient = require('./../ApiClient');

class ApplicationsClient extends ApiClient {
  async getService(serviceId, correlationId) {
    return this._callApi(`/services/${serviceId}`, correlationId);
  }
}
module.exports = ApplicationsClient;