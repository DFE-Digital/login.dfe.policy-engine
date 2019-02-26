const Constraint = require('./Constraint');

class MinimumConstraint extends Constraint {
  constructor(minimumNumberOfRoles) {
    super();

    this._minimumNumberOfRoles = minimumNumberOfRoles;
  }

  apply(availableRoles) {
    return availableRoles.length < this._minimumNumberOfRoles ? availableRoles : [];
  }

  validate(selections) {
    if (selections.length < this._minimumNumberOfRoles) {
      return [{
        constraint: 'MinimumConstraint',
        message: `Expected a minimum of ${this._minimumNumberOfRoles} roles to be selected but received ${selections.length} selected roles`,
        appliesTo: selections,
      }];
    }
    return [];
  }
}

module.exports = MinimumConstraint;
