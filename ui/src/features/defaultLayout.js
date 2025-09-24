const defaultLayout = {
    global: {},
    borders: [],
    layout: {
        type: 'row',
        weight: 100,
        children: [
            {
                type: 'tabset',
                weight: 70,
                selected: 0,
                children: [
                    {
                        type: 'tab',
                        name: 'Chat',
                        component: 'input',  // Enhanced input panel
                    },
                    {
                        type: 'tab',
                        name: 'Memory',
                        component: 'memory-view',
                    },
                ],
            },
            {
                type: 'tabset',
                weight: 30,
                selected: 0,
                children: [
                    {
                        type: 'tab',
                        name: 'Reasoning Trace',
                        component: 'reasoner-trace',
                    },
                    {
                        type: 'tab',
                        name: 'Internal State',
                        component: 'internal-state',
                    },
                    {
                        type: 'tab',
                        name: 'Status',
                        component: 'status',
                    },
                ],
            },
        ],
    },
};

export default defaultLayout;
