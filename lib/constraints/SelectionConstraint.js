const Constraint = require('./Constraint');

class SelectionConstraint extends Constraint {
  constructor(firstRole, secondRole) {
    super();

    this._firstRole = firstRole;
    this._secondRole = secondRole;
  }

  validate(selections) {
    if (selections.length > 0) {
      return [{
        constraint: 'SelectionConstraint',
        message: `The roles ${this._firstRole} and ${this._secondRole} cannot be selected together`,
        appliesTo: selections,
      }];
    }
    return [];
  }
}

module.exports = SelectionConstraint;
