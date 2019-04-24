const MinimumConstraint = require('./../../lib/constraints/MinimumConstraint');

describe('when validating selected roles against minimum constraint', () => {
  it('then it should not return exceptions if minimum number is met', () => {
    const selections = ['role-1', 'role-2'];
    const constraint = new MinimumConstraint(2);

    const actual = constraint.validate(selections);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(0);
  });

  it('then it should not return exceptions if minimum number is exceeded', () => {
    const selections = ['role-1', 'role-2', 'role-3'];
    const constraint = new MinimumConstraint(2);

    const actual = constraint.validate(selections);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(0);
  });

  it('then it should return exception if minimum number if not met', () => {
    const selections = ['role-1', 'role-2'];
    const constraint = new MinimumConstraint(3);

    const actual = constraint.validate(selections);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(1);
    expect(actual[0]).toMatchObject({
      constraint: 'MinimumConstraint',
      message: 'At least 3 roles must be selected',
      appliesTo: ['role-1', 'role-2'],
    });
  });
});
