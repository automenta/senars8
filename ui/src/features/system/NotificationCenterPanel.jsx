import React from 'react';
import Panel from '@/components/core/Panel';
import NotificationCenter from '@/components/ui/NotificationCenter';
import {Bell} from 'lucide-react';

function NotificationCenterPanel() {
    return (
        <Panel title={<><Bell size={18}/> Notifications</>}>
            <NotificationCenter/>
        </Panel>
    );
}

export default NotificationCenterPanel;
