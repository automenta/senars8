const defaultLayout = {
    global: {},
    borders: [],
    layout: {
        type: 'row',
        weight: 100,
        children: [
            {
                type: 'tabset',
                weight: 50,
                children: [
                    {
                        type: 'tab',
                        name: 'Control',
                        component: 'control',
                    },
                    {
                        type: 'tab',
                        name: 'Status',
                        component: 'status',
                    },
                    {
                        type: 'tab',
                        name: 'Internal State',
                        component: 'internal-state',
                    }
                ]
            },
            {
                type: 'tabset',
                weight: 50,
                children: [
                    {
                        type: 'tab',
                        name: 'Input',
                        component: 'input',
                    },
                    {
                        type: 'tab',
                        name: 'Log',
                        component: 'log',
                    }
                ]
            },
            {
                type: 'tabset',
                weight: 50,
                children: [
                    {
                        type: 'tab',
                        name: 'Memory View',
                        component: 'memory-view',
                    },
                    {
                        type: 'tab',
                        name: 'Reasoner Trace',
                        component: 'reasoner-trace',
                    },
                    {
                        type: 'tab',
                        name: 'Knowledge Graph',
                        component: 'knowledge-graph',
                    }
                ]
            }
        ]
    }
};

export default defaultLayout;
