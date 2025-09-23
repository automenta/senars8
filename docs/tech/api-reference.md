# SeNARS API Reference

This document provides a reference for the SeNARS public API.

## System Creation

The primary way to create a SeNARS system is by using the `createSystem` function.

### `createSystem(userConfig, components)`

*   **Description:** Creates and initializes a new SeNARS system.
*   **Arguments:**
    *   `userConfig` (Object, optional): A configuration object to override the default system settings.
    *   `components` (Object, optional): An object containing custom components (e.g., a custom reasoner or memory system) to override the default ones.
*   **Returns:** A `System` instance.

---

## System API

The `System` class is the main interface for interacting with the SeNARS system.

### Methods

*   **`initialize(constitutionTasks)`**
    *   **Description:** Initializes the system with a set of core tasks, beliefs, or goals, known as the "constitution."
    *   **Arguments:**
        *   `constitutionTasks` (Array): An array of task objects.

*   **`runCycle()`**
    *   **Description:** Executes a single cognitive cycle, which includes perception, reasoning, and action.

*   **`start(maxCycles)`**
    *   **Description:** Starts the continuous operation of the system. The system will run in a loop, executing cognitive cycles until it is stopped or reaches the maximum number of cycles.
    *   **Arguments:**
        *   `maxCycles` (Number, optional): The maximum number of cycles to run. If not provided, the system will run indefinitely.

*   **`stop()`**
    *   **Description:** Stops the system's execution loop.

*   **`addTasks(tasks)`**
    *   **Description:** Adds one or more new tasks to the system's memory for processing.
    *   **Arguments:**
        *   `tasks` (Array|Object): A single task object or an array of task objects.

*   **`reset()`**
    *   **Description:** Resets the system's state, clearing its memory and cycle count.

---

## Introspection API

The `Introspection` API provides a way to observe the internal state of the SeNARS system. It is accessed through the `introspection` property of a `System` instance (e.g., `system.introspection`).

### Methods

*   **`getStatus()`**
    *   **Description:** Returns an object containing the current status of the system, including whether it is running, the current cycle count, and memory statistics.

*   **`getConfig()`**
    *   **Description:** Returns the complete configuration object of the system.

*   **`getTask(id)`**
    *   **Description:** Retrieves a specific task from memory by its unique ID.

*   **`getTerm(key)`**
    *   **Description:** Retrieves a specific term from memory by its unique key.

*   **`queryTasks(filters)`**
    *   **Description:** Returns an array of tasks that match the provided filter criteria.

*   **`getMemoryStatistics()`**
    *   **Description:** Returns an object with detailed statistics about the system's memory.

*   **`getAllTerms()`**
    *   **Description:** Returns an array of all terms currently in the system's memory.

*   **`getAvailableRules()`**
    *   **Description:** Returns an array of the names of all available inference rules.

*   **`getRuleInfo(ruleName)`**
    *   **Description:** Returns detailed information about a specific inference rule.

*   **`getPlan()`**
    *   **Description:** Returns the current plan being executed by the system.

*   **`getContradictions()`**
    *   **Description:** Returns an array of any contradictions that the system has detected in its knowledge base.

*   **`on(eventName, callback)`**
    *   **Description:** Registers a callback function to be executed when a specific event occurs in the system.
    *   **Arguments:**
        *   `eventName` (String): The name of the event to listen for.
        *   `callback` (Function): The function to execute when the event is triggered.

*   **`off(eventName, callback)`**
    *   **Description:** Removes a previously registered event listener.
