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
        message: `These roles cannot be selected together: <br /> <br /> ${this._firstRole} <br /> ${this._secondRole}`,
        appliesTo: selections,
      }];
    }
    return [];
  }
}

module.exports = SelectionConstraint;
