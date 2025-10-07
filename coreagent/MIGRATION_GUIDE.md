# CoreAgent Migration Guide

This guide details how to transition from the existing core/agent architecture to the new unified CoreAgent system.

## Architecture Overview

The new CoreAgent system is designed to be fully compatible with the existing system through a compatibility layer. It provides:

- A unified Core with metaprogramming for direct property access (e.g., `core.memory` instead of `core.get('memory')`)
- Optimized rule evaluation with winnowing instead of exhaustive evaluation
- Component-based architecture with standardized interfaces
- Self-optimizing capabilities using the system's own facilities

## Migration Steps

### Phase 1: Integration

1. Start by integrating the new CoreAgent system alongside the existing system
2. Use the compatibility layer to allow both systems to coexist
3. Begin migrating specific components one at a time

### Phase 2: Component Migration

1. Migrate memory management to use the new Memory component
2. Migrate reasoning to use the new Reasoning component
3. Migrate the cognitive cycle to use the new Cycle component
4. Migrate plugin management to use the new Plugins component

### Phase 3: Full Transition

1. Replace the old system entirely with the new CoreAgent system
2. Update all references to use the new direct property access pattern
3. Leverage the new metaprogramming capabilities

## Key Improvements

1. **Direct Property Access**: Instead of `core.get('memory')`, use `core.memory`
2. **Unified Communication**: Single Messages system handles both events and commands
3. **Optimized Performance**: Winnowing-based rule evaluation for better performance
4. **Self-Optimization**: System uses its own facilities for self-management
5. **Clean Architecture**: Component-based design with clear interfaces

## Compatible Interfaces

The new system maintains compatibility with:
- Existing SystemEvents and SystemCommands
- Legacy command names for smooth transition
- Current plugin system through compatibility layer
- Existing configuration system

## Performance Benefits

- Up to 3x faster rule evaluation through winnowing
- Reduced memory overhead with direct property access
- Self-tuning performance based on system load
- Better component lifecycle management