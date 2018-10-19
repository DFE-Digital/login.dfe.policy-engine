const ApiClient = require('./../ApiClient');

class DirectoriesClient extends ApiClient {
  async getUserById(id, correlationId) {
    return this._callApi(`/users/${id}`, correlationId);
  }
}
module.exports = DirectoriesClient;