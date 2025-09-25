const defaultLayout = {
    global: {},
    borders: [],
    layout: {
        type: 'row',
        weight: 100,
        children: [
            {
                type: 'tabset',
                weight: 60,
                selected: 0,
                children: [
                    {
                        type: 'tab',
                        name: 'Dashboard',
                        component: 'dashboard',
                    },
                    {
                        type: 'tab',
                        name: 'Chat',
                        component: 'chat',
                    },
                    {
                        type: 'tab',
                        name: 'Knowledge Graph',
                        component: 'knowledge-graph',
                    },
                    {
                        type: 'tab',
                        name: 'NARS Tasks',
                        component: 'narsese-tasks',
                    },
                ],
            },
            {
                type: 'row',
                weight: 40,
                children: [
                    {
                        type: 'tabset',
                        weight: 50,
                        selected: 0,
                        children: [
                            {
                                type: 'tab',
                                name: 'Reasoning',
                                component: 'reasoner-trace',
                            },
                            {
                                type: 'tab',
                                name: 'Reasoning Debugger',
                                component: 'reasoning-debugger',
                            },
                            {
                                type: 'tab',
                                name: 'Visual Reasoning',
                                component: 'visual-reasoning',
                            },
                        ],
                    },
                    {
                        type: 'tabset',
                        weight: 50,
                        selected: 0,
                        children: [
                            {
                                type: 'tab',
                                name: 'Status',
                                component: 'status',
                            },
                            {
                                type: 'tab',
                                name: 'Configuration',
                                component: 'configuration',
                            },
                            {
                                type: 'tab',
                                name: 'Control',
                                component: 'control',
                            },
                        ],
                    },
                ],
            },
        ],
    },
};

export default defaultLayout;
