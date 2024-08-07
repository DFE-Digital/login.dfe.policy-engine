const SelectionConstraint = require('./../../lib/constraints/SelectionConstraint');

describe('when validating selected roles against selection constraint', () => {
  it('should not return exceptions if no selections are provided', () => {
    const firstRole = 'role-1';
    const secondRole = 'role-2';
    const constraint = new SelectionConstraint(firstRole, secondRole);
    const selections = [];

    const actual = constraint.validate(selections);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(0);
  });

  it('should not return exceptions if no selections are provided', () => {
    const firstRole = 'role-1';
    const secondRole = 'role-2';
    const constraint = new SelectionConstraint(firstRole, secondRole);
    const selections = ['role-1', 'role-2'];

    const actual = constraint.validate(selections);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(1);
    expect(actual[0]).toMatchObject({
      constraint: 'SelectionConstraint',
      message: 'These roles cannot be selected together: <br /> <br /> role-1 <br /> role-2',
      appliesTo: ['role-1', 'role-2'],
    });
  });
});
