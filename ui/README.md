# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react)
  uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc)
  uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check
out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information
on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Future Development: Collaborative Features with CRDTs

This UI is designed to be extensible. One area of future development is the integration of collaborative features,
allowing multiple users to interact with the same NARS agent in real-time. This could be useful for teaching, debugging,
and collective reasoning experiments.

To enable robust, real-time collaboration, we plan to use Conflict-Free Replicated Data Types (CRDTs). CRDTs are a class
of data structures that can be replicated across multiple computers, and which can be updated independently and
concurrently without coordination between the replicas. The replicas will eventually converge to the same state.

Libraries like [Y.js](https://yjs.dev/) or [Automerge](https://automerge.org/) could be used to implement CRDTs for
shared state, such as the content of the input panel, the state of the knowledge graph, or the agent's beliefs. This
would provide a solid foundation for building a truly collaborative NARS IDE.
