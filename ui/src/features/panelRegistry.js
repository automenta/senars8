// Core Workflow
import DashboardPanel from './dashboard/DashboardPanel';
import Chat from './Chat/Chat';
import FileExplorerPanel from './file-system/FileExplorerPanel';
import CodeEditorPanel from './editor/CodeEditorPanel';
import TerminalPanel from './terminal/TerminalPanel';

// System & Monitoring
import StatusPanel from './system/StatusPanel';
import LogPanel from './system/LogPanel';
import ControlPanel from './system/ControlPanel';
import InternalStatePanel from './system/InternalStatePanel';
import NotificationCenterPanel from './system/NotificationCenterPanel';
import SessionPanel from './system/SessionPanel';

// Reasoning & Debugging
import ReasonerTracePanel from './reasoning/ReasonerTracePanel';
import ReasoningDebuggerPanel from './reasoning/ReasoningDebuggerPanel';
import VisualReasoningPanel from './reasoning/VisualReasoningPanel';
import KnowledgeGraphPanel from './memory/KnowledgeGraphPanel';
import DebugPanel from './debug/DebugPanel';

// Task Management
import TaskPanel from './task/TaskPanel';
import TaskInspectorPanel from './task/TaskInspectorPanel';
import NarseseTaskPanel from './task/NarseseTaskPanel';

// Development Tools
import DemoRunnerPanel from './demo-runner/DemoRunnerPanel';
import LayoutManagerPanel from './LayoutManagerPanel';
import ConfigurationEditorPanel from './configuration/ConfigurationEditorPanel';

// Advanced Views
import MemoryViewPanel from './memory/MemoryViewPanel';

// Application
import SettingsPanel from './settings/SettingsPanel';
import HelpPanel from './help/HelpPanel';

export const categorizedPanels = {
    'Core Workflow': {
        'dashboard': { name: 'Dashboard', component: DashboardPanel },
        'chat': { name: 'Chat', component: Chat },
        'file-explorer': { name: 'File Explorer', component: FileExplorerPanel },
        'code-editor': { name: 'Code Editor', component: CodeEditorPanel },
        'terminal': { name: 'Terminal', component: TerminalPanel },
    },
    'System & Monitoring': {
        'status': { name: 'System Status', component: StatusPanel },
        'log': { name: 'Event Log', component: LogPanel },
        'control': { name: 'System Control', component: ControlPanel },
        'internal-state': { name: 'Internal State', component: InternalStatePanel },
        'notifications': { name: 'Notifications', component: NotificationCenterPanel },
        'sessions': { name: 'Sessions', component: SessionPanel },
    },
    'Reasoning & Debugging': {
        'reasoner-trace': { name: 'Reasoner Trace', component: ReasonerTracePanel },
        'reasoning-debugger': { name: 'Reasoning Debugger', component: ReasoningDebuggerPanel },
        'visual-reasoning': { name: 'Visual Reasoning', component: VisualReasoningPanel },
        'knowledge-graph': { name: 'Knowledge Graph', component: KnowledgeGraphPanel },
        'debug': { name: 'Debug', component: DebugPanel },
    },
    'Task Management': {
        'tasks': { name: 'Tasks', component: TaskPanel },
        'task-inspector': { name: 'Task Inspector', component: TaskInspectorPanel },
        'narsese-tasks': { name: 'Narsese Tasks', component: NarseseTaskPanel },
    },
    'Development Tools': {
        'demo-runner': { name: 'Demo Runner', component: DemoRunnerPanel },
        'layout-manager': { name: 'Layout Manager', component: LayoutManagerPanel },
        'configuration': { name: 'Configuration Editor', component: ConfigurationEditorPanel },
    },
    'Advanced Views': {
        'memory': { name: 'Memory Viewer', component: MemoryViewPanel },
    },
    'Application': {
        'settings': { name: 'Settings', component: SettingsPanel },
        'help': { name: 'Help', component: HelpPanel },
    },
};

// Flatten the structure for the default export to maintain compatibility
const panelRegistry = Object.values(categorizedPanels).reduce((acc, category) => {
    Object.entries(category).forEach(([id, { component }]) => {
        acc[id] = component;
    });
    return acc;
}, {});

export default panelRegistry;
