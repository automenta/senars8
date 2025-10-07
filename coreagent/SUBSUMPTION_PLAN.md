# Plan for Subsuming core/ and agent/ Directories

This document outlines the approach to gradually replace the existing `core/` and `agent/` directories with the new CoreAgent system.

## Current Architecture Overview

The existing system has:
- `core/` directory: Contains the main cognitive engine with memory, reasoning, system management components
- `agent/` directory: Contains the agent layer that uses the core system to provide agent functionality

## Transition Strategy

### Phase 1: Parallel Implementation
- Keep existing `core/` and `agent/` directories intact
- Implement new functionality in `coreagent/` directory
- Use compatibility layer to allow gradual migration

### Phase 2: Integration Points
- Replace core system usage in main application with CoreAgent where appropriate
- Create adapter patterns to allow both systems to work together during transition
- Maintain backward compatibility for existing functionality

### Phase 3: Gradual Replacement
- Identify components in `core/` and `agent/` that can be replaced by CoreAgent equivalents
- Replace component by component, ensuring all tests pass
- Update any code that depends on the old architecture

### Phase 4: Complete Migration
- Remove the old `core/` and `agent/` directories
- Update all imports to use `coreagent/` instead
- Remove compatibility layers once everything is migrated

## Component Mapping

### Core Directory Components

| Old Core Component | CoreAgent Equivalent | Status |
|-------------------|---------------------|---------|
| `core/core/Task.js` | CoreAgent's Memory component handles tasks | To be replaced |
| `core/memory/index.js` | CoreAgent's Memory component | To be replaced |
| `core/reasoner/index.js` | CoreAgent's Reasoning component | To be replaced |
| `core/system/Cycle.js` | CoreAgent's Cycle component | To be replaced |
| `core/config/` | CoreAgent's Config system | To be replaced |
| `core/utils/` | CoreAgent uses its own utilities | To be evaluated |

### Agent Directory Components

| Old Agent Component | CoreAgent Equivalent | Status |
|-------------------|---------------------|---------|
| `agent/Agent.js` | CoreAgent System class | To be replaced |
| `agent/AgentManager.js` | CoreAgent System or custom manager | To be evaluated |
| `agent/MCP.js` | CoreAgent can integrate communication protocols | To be implemented |

## Implementation Steps

### Step 1: Create Migration Utilities
- [ ] Create utility functions to map between old and new data structures
- [ ] Create adapter classes for seamless transitions
- [ ] Implement comprehensive logging to track migration progress

### Step 2: Identify Migration Candidates
- [ ] Analyze usage patterns of core system components
- [ ] Identify which components are used most frequently
- [ ] Prioritize migration based on component complexity and usage

### Step 3: Execute Component Migration
- [ ] Replace Task/term handling with CoreAgent Memory
- [ ] Replace reasoner with CoreAgent Reasoning
- [ ] Replace cycle system with CoreAgent Cycle
- [ ] Migrate configuration system to CoreAgent Config

### Step 4: Update Dependencies
- [ ] Update `main.js` to use new CoreAgent system
- [ ] Update Agent.js to work with CoreAgent
- [ ] Update all import paths from `core/` and `agent/` to `coreagent/`

### Step 5: Validation and Testing
- [ ] Ensure all existing tests pass with new system
- [ ] Create new tests specific to CoreAgent functionality
- [ ] Perform performance benchmarks to verify improvements

## Risks and Mitigation Strategies

### Risk: Breaking Existing Functionality
- **Mitigation**: Maintain compatibility layer during transition, thoroughly test each component replacement

### Risk: Performance Degradation
- **Mitigation**: Benchmark performance at each stage, ensure CoreAgent performance improvements are realized

### Risk: Complex Integration Requirements
- **Mitigation**: Start with simple components, gradually move to complex ones

## Timeline

### Phase 1: Preparation (Week 1-2)
- Complete CoreAgent implementation
- Create comprehensive compatibility layer
- Set up parallel testing environment

### Phase 2: Component Replacement (Week 3-6)
- Replace simple components first (config, basic utilities)
- Replace core cognitive components (memory, reasoning)
- Migrate complex systems (cycle, planning)

### Phase 3: Final Migration (Week 7-8)
- Remove compatibility layer
- Clean up old directories
- Update documentation

## Success Metrics

- [ ] All existing tests continue to pass
- [ ] Performance improvements realized (especially rule evaluation)
- [ ] Codebase size reduction while maintaining functionality
- [ ] Improved maintainability and understandability
- [ ] Successful migration of all component functionality

## Rollback Plan

If migration issues occur:
- Revert to using compatibility layer
- Maintain both systems in parallel temporarily
- Identify and fix specific issues before continuing migration