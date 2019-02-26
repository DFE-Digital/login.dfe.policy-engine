const MinimumConstraint = require('./../../lib/constraints/MinimumConstraint');

describe('when applying minimum constraint on available roles', () => {
  it('then it should not return exceptions if minimum number is met', () => {
    const availableRoles = ['role-1', 'role-2'];
    const constraint = new MinimumConstraint(2);

    const actual = constraint.apply(availableRoles);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(0);
  });

  it('then it should not return exceptions if minimum number is exceeded', () => {
    const availableRoles = ['role-1', 'role-2', 'role-3'];
    const constraint = new MinimumConstraint(2);

    const actual = constraint.apply(availableRoles);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(0);
  });

  it('then it should return exception if minimum number if not met', () => {
    const availableRoles = ['role-1', 'role-2'];
    const constraint = new MinimumConstraint(3);

    const actual = constraint.apply(availableRoles);

    expect(actual).toBeDefined();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(2);
    expect(actual[0]).toBe('role-1');
    expect(actual[1]).toBe('role-2');
  });
});