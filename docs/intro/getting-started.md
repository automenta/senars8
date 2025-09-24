# Getting Started with SeNARS

This guide provides a step-by-step walkthrough to get SeNARS up and running on your local machine.

## 1. Prerequisites

Before you begin, ensure you have the following installed:

-   **Node.js**: Version 16 or higher. You can download it from [nodejs.org](https://nodejs.org/).
-   **npm**: Node.js's package manager, which comes with the Node.js installation.

## 2. Installation

Open your terminal, navigate to the project's root directory, and run the `npm install` command to install the required dependencies. This command will download and install all the necessary packages defined in the `package.json` file.

## 3. Running the Demos

SeNARS comes with several interactive demos to showcase its capabilities. You can run these demos using `npm` scripts defined in the `package.json` file.

### Interactive Demo Runner

This demo allows you to experiment with the system in real-time. You can start it by running the `start:demo` script with npm.

### Showcase Demo

This demo provides a comprehensive tour of the system's features. You can start it by running the `start:showcase` script with npm.

## 4. Basic Programmatic Interaction

You can also interact with SeNARS programmatically. The basic steps to do this are:

1.  **Import the `createSystem` function:** This function is the main entry point for creating a SeNARS system.
2.  **Create a system instance:** Call the `createSystem` function to get a new system instance. You can optionally provide a custom configuration.
3.  **Add tasks:** Use the `addTasks` method of the system instance to add new beliefs, goals, or questions to the system's memory.
4.  **Run the cognitive cycle:** Use the `runCycle` method to make the system process the tasks in its memory.
5.  **Inspect the system's state:** Use the `introspection` API to see the results of the cognitive cycle and the current state of the system's memory.
