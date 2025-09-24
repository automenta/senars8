import React, {useState} from 'react';
import { Panel, NotificationCenter } from '@ui/components';
import notificationService from '@/services/notificationService';
import {Bell, Filter, SortDesc, Trash2} from 'lucide-react';
import './NotificationCenterPanel.css';

function NotificationCenterPanel() {
    const [filter, setFilter] = useState('all'); // 'all', 'info', 'warning', 'error'
    const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest'

    const handleClearFiltered = () => {
        if (window.confirm(`Are you sure you want to clear ${filter === 'all' ? 'all' : filter} notifications?`)) {
            // This would need to be implemented in the notification service
            notificationService.clearAll();
        }
    };

    return (
        <Panel title={<><Bell size={18}/> Notifications</>}>
            <div className="notification-center-panel">
                {/* Controls */}
                <div className="notification-controls">
                    <div className="filter-controls">
                        <Filter size={16} />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Types</option>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="error">Error</option>
                        </select>
                    </div>

                    <div className="sort-controls">
                        <SortDesc size={16} />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="sort-select"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                        </select>
                    </div>

                    <button
                        onClick={handleClearFiltered}
                        className="clear-filtered-btn"
                        title="Clear filtered notifications"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                {/* Notification Center */}
                <div className="notification-content">
                    <NotificationCenter filter={filter} sortBy={sortBy} />
                </div>
            </div>
        </Panel>
    );
}

export default NotificationCenterPanel;
