const MaximumConstraint = require('./../../lib/constraints/MaximumConstraint');

describe('when validating selected roles against maximum constraint', () => {
  it('then it should not return exceptions if maximum number is met', () => {
    const selections = ['role-1', 'role-2', 'role-3'];
    const constraint = new MaximumConstraint(3);

    const actual = constraint.validate(selections);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(0);
  });

  it('then it should not return exceptions if maximum number is not reached', () => {
    const selections = ['role-1', 'role-2'];
    const constraint = new MaximumConstraint(3);

    const actual = constraint.validate(selections);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(0);
  });

  it('then it should return exception if maximum number is exceeded', () => {
    const selections = ['role-1', 'role-2', 'role-3', 'role-4'];
    const constraint = new MaximumConstraint(3);

    const actual = constraint.validate(selections);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(1);
    expect(actual[0]).toMatchObject({
      constraint: 'MaximumConstraint',
      message: 'A maximum of 3 roles can be selected',
      appliesTo: ['role-1', 'role-2', 'role-3', 'role-4'],
    });
  });
});
