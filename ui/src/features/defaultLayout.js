const defaultLayout = {
    global: {
        tabEnableFloat: true,
        tabSetHeaderHeight: 26,
        tabSetTabStripHeight: 26,
    },
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
                        name: 'File Explorer',
                        component: 'file-explorer',
                    },
                ],
            },
            {
                type: 'tabset',
                id: 'main-tabset',
                weight: 80,
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
                ],
            },
        ],
    },
};

export default defaultLayout;
