const defaultLayout = {
    global: {},
    borders: [],
    layout: {
        type: 'row',
        weight: 100,
        children: [
            {
                type: 'tabset',
                weight: 20,
                selected: 0,
                children: [
                    {
                        type: 'tab',
                        name: 'Files',
                        component: 'file-explorer',
                    },
                ],
            },
            {
                type: 'row',
                weight: 80,
                children: [
                    {
                        type: 'tabset',
                        weight: 70,
                        selected: 0,
                        children: [
                            {
                                type: 'tab',
                                name: 'Editor',
                                component: 'code-editor',
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
                                name: 'Terminal',
                                component: 'terminal',
                            },
                            {
                                type: 'tab',
                                name: 'Input',
                                component: 'input',
                            },
                            {
                                type: 'tab',
                                name: 'Log',
                                component: 'log',
                            },
                        ],
                    },
                ],
            },
        ],
    },
};

export default defaultLayout;
