---
name: code-review-standards
version: '1.0'
applicable_agents: [senior-frontend, senior-backend, senior-fullstack]
test_scenarios:
  - scenario: Review checklist application
    expected: All checklist items are evaluated and blocking issues are flagged
  - scenario: SOLID violation detection
    expected: Reviewer identifies specific SOLID principle violations with remediation suggestions
  - scenario: Complexity assessment
    expected: Functions exceeding complexity thresholds are flagged with refactoring recommendations
---

<!-- SECTION: review-checklist -->
## Review Checklist

### Correctness
- [ ] Code does what the PR description claims
- [ ] Edge cases are handled (null, empty, boundary values)
- [ ] Error paths are handled gracefully (no swallowed exceptions)
- [ ] No off-by-one errors in loops or slicing
- [ ] Concurrent access is safe (if applicable)

### Security
- [ ] No secrets, credentials, or API keys in code
- [ ] User input is validated and sanitized
- [ ] SQL queries use parameterized statements
- [ ] Authentication and authorization are enforced
- [ ] Sensitive data is not logged

### Performance
- [ ] No N+1 query patterns
- [ ] No unnecessary re-renders in UI components
- [ ] Large collections use pagination
- [ ] Expensive operations are cached or deferred
- [ ] Database queries have appropriate indexes

### Maintainability
- [ ] Functions and methods are under 30 lines
- [ ] Classes have a single responsibility
- [ ] Variable and function names are descriptive
- [ ] No commented-out code
- [ ] No magic numbers (use named constants)
- [ ] DRY: no copy-pasted logic blocks

### Testing
- [ ] New code has corresponding tests
- [ ] Tests cover happy path and error cases
- [ ] Tests are independent and repeatable
- [ ] No test code in production builds
- [ ] Mocks are reset between tests

### Review Etiquette
- Comment on the code, not the person
- Suggest, do not demand: "Consider using X because..."
- Distinguish blocking issues from suggestions
- Approve with minor comments when appropriate
- Respond to reviews within one business day

<!-- SECTION: solid-principles -->
## SOLID Principles

### Single Responsibility (SRP)
A class should have only one reason to change.

**Violation signal**: Class has methods for unrelated concerns.
```typescript
// BAD: UserService handles auth, email, and data access
class UserService {
  authenticate(credentials) { ... }
  sendWelcomeEmail(user) { ... }
  saveToDatabase(user) { ... }
}

// GOOD: Separated responsibilities
class AuthService { authenticate(credentials) { ... } }
class EmailService { sendWelcome(user) { ... } }
class UserRepository { save(user) { ... } }
```

### Open/Closed (OCP)
Open for extension, closed for modification.

**Violation signal**: Adding a feature requires modifying existing switch/if chains.
```typescript
// BAD: Must modify function for each new type
function calculateArea(shape) {
  if (shape.type === 'circle') return Math.PI * shape.radius ** 2;
  if (shape.type === 'rect') return shape.width * shape.height;
  // Must add more conditions for new shapes
}

// GOOD: Extend via polymorphism
interface Shape { area(): number; }
class Circle implements Shape { area() { return Math.PI * this.radius ** 2; } }
class Rectangle implements Shape { area() { return this.width * this.height; } }
```

### Liskov Substitution (LSP)
Subtypes must be substitutable for their base types.

**Violation signal**: Subclass overrides a method to throw or do nothing.

### Interface Segregation (ISP)
No client should depend on methods it does not use.

**Violation signal**: Interface has many methods and implementations leave some as no-ops.

### Dependency Inversion (DIP)
Depend on abstractions, not concretions.

**Violation signal**: Classes instantiate their own dependencies with `new`.
```typescript
// BAD: Tightly coupled to concrete class
class OrderService {
  private repo = new PostgresOrderRepository();
}

// GOOD: Depend on abstraction, inject at construction
class OrderService {
  constructor(private repo: OrderRepository) {}
}
```

### Review Flags
When reviewing, flag SOLID violations with a prefix tag:
```
[SRP] This class handles both X and Y -- consider splitting.
[OCP] Adding new types requires modifying this switch -- consider strategy pattern.
[DIP] Direct dependency on concrete class -- inject via interface.
```

<!-- SECTION: complexity-metrics -->
## Complexity Metrics

### Cyclomatic Complexity
Measures the number of independent paths through a function.

**Calculation**: Count decision points + 1
- Each `if`, `else if`, `case`, `while`, `for`, `&&`, `||`, `catch` adds 1

| Score | Risk Level | Action |
|-------|------------|--------|
| 1-5 | Low | Acceptable |
| 6-10 | Moderate | Review for simplification |
| 11-20 | High | Refactor required |
| 21+ | Critical | Must be broken apart |

### Cognitive Complexity
Measures how hard code is to understand (more nuanced than cyclomatic).

Increases with:
- Nesting depth (penalty compounds with each level)
- Breaks in linear flow (else, catch, continue, break)
- Recursion

```typescript
// Cognitive complexity: 7 (nested conditions compound)
function getLabel(user, order) {       // +0
  if (user.isAdmin) {                  // +1
    if (order.isPriority) {            // +2 (nesting)
      return 'admin-priority';
    } else {                           // +1
      return 'admin-standard';
    }
  } else if (user.isVip) {            // +1
    return 'vip';
  } else {                            // +1
    if (order.total > 100) {           // +2 (nesting)
      return 'high-value';
    }
    return 'standard';
  }
}
```

### Refactoring High-Complexity Code
**Extract method**: Pull branches into well-named functions.
```typescript
// Before: one long function with nested conditions
function processOrder(order) {
  // 40 lines with nested if/else
}

// After: decomposed into focused functions
function processOrder(order) {
  const pricing = calculatePricing(order);
  const shipping = determineShipping(order);
  return finalizeOrder(order, pricing, shipping);
}
```

**Replace conditionals with polymorphism**: When branching on type, use strategy pattern.

**Use early returns**: Flatten nested conditions with guard clauses.
```typescript
// Before: deeply nested
function validate(input) {
  if (input) {
    if (input.name) {
      if (input.name.length > 0) {
        return true;
      }
    }
  }
  return false;
}

// After: guard clauses
function validate(input) {
  if (!input) return false;
  if (!input.name) return false;
  if (input.name.length === 0) return false;
  return true;
}
```

### Thresholds for Code Review
| Metric | Threshold | Action |
|--------|-----------|--------|
| Function length | > 30 lines | Suggest extraction |
| Cyclomatic complexity | > 10 | Require refactoring |
| Cognitive complexity | > 15 | Require refactoring |
| Parameter count | > 4 | Suggest object parameter |
| Nesting depth | > 3 levels | Require flattening |
| Class methods | > 10 public | Suggest decomposition |
